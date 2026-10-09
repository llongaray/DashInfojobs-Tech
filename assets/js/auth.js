'use strict';
window.DashAuth = (() => {
  const ui = DashUI, config = DASH_CONFIG;
  let oauth = null, token = '', expires = 0, generation = 0, request = null, expiryTimer = null, authTimer = null, authorizing = false, hasData = false;
  const sync = () => ui.session(Boolean(oauth), Boolean(token), authorizing || Boolean(request));
  function clear() {
    generation++; token = ''; expires = 0; hasData = false; authorizing = false;
    clearTimeout(expiryTimer); clearTimeout(authTimer);
    if (request) request.abort(); request = null;
    ui.clear(); sync();
  }
  function expire() { clear(); ui.message('Sua autorização expirou. Entre novamente com Google para continuar.'); }
  function login() {
    if (!oauth || authorizing) return;
    clear(); authorizing = true; sync(); ui.message('Conclua a autorização na janela do Google.');
    const attempt = generation;
    oauth.callback = async result => {
      if (attempt !== generation) return;
      clearTimeout(authTimer); authorizing = false;
      if (result.error || !result.access_token) { clear(); ui.message('Autorização não concluída. Tente novamente com uma conta autorizada.', true); return; }
      if (!String(result.scope || '').split(/\s+/).includes(config.scope)) { clear(); ui.message('A permissão de leitura das planilhas não foi concedida. Entre novamente e autorize essa permissão.', true); return; }
      token = result.access_token; expires = Date.now() + Math.max(1, Number(result.expires_in) || 3600) * 1000;
      expiryTimer = setTimeout(expire, Math.max(0, expires - Date.now() - 10000)); sync(); await refresh();
    };
    authTimer = setTimeout(() => { if (attempt === generation && authorizing) { clear(); ui.message('A autorização não foi concluída. Tente entrar novamente.', true); } }, 180000);
    try { oauth.requestAccessToken({ prompt: 'select_account' }); } catch { clear(); ui.message('Não foi possível abrir o login Google. Tente novamente.', true); }
  }
  function logout() {
    const old = token; clear(); ui.message('Você saiu. Os dados foram removidos desta página.');
    if (old && window.google?.accounts?.oauth2) { try { google.accounts.oauth2.revoke(old, () => {}); } catch { /* Local data is already cleared. */ } }
  }
  async function refresh() {
    if (!token || request) return;
    if (Date.now() >= expires - 10000) { expire(); return; }
    const controller = new AbortController(); request = controller;
    const run = generation, auth = token;
    sync(); ui.message('Consultando as três abas…');
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const params = new URLSearchParams({ valueRenderOption: 'FORMATTED_VALUE' });
      config.sheets.forEach(name => params.append('ranges', "'" + name.replace(/'/g, "''") + "'!A:J"));
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + config.spreadsheetId + '/values:batchGet?' + params, { headers: { Authorization: 'Bearer ' + auth }, cache: 'no-store', signal: controller.signal });
      if (run !== generation) return;
      if (!response.ok) {
        const messages = { 401: 'Autorização inválida ou expirada. Entre novamente.', 403: 'Acesso negado. Confirme a conta, a permissão na planilha e a autorização de leitura.', 404: 'Planilha não encontrada ou indisponível para esta conta.', 429: 'O Google limitou temporariamente as consultas. Aguarde e tente atualizar novamente.' };
        const text = messages[response.status] || 'Não foi possível consultar a planilha (HTTP ' + response.status + ').';
        if ([401, 403, 404].includes(response.status)) { clear(); ui.message(text, true); return; }
        throw new Error(text);
      }
      const result = await response.json(); if (run !== generation) return;
      ui.setData(DashData.parse(result)); hasData = true; ui.message('Dados atualizados.');
    } catch (error) {
      if (run === generation) ui.message((error.name === 'AbortError' ? 'A consulta demorou mais que o esperado. Tente atualizar.' : error.message === 'Failed to fetch' ? 'Sem conexão com o Google. Verifique sua internet e tente atualizar.' : error.message) + (hasData ? ' Os dados exibidos são da última consulta bem-sucedida.' : ''), true);
    } finally { clearTimeout(timeout); if (request === controller) { request = null; sync(); } }
  }
  function ready() {
    if (!window.google?.accounts?.oauth2) { ui.message('Falha ao carregar autenticação Google. Recarregue a página.', true); return; }
    oauth = google.accounts.oauth2.initTokenClient({ client_id: config.clientId, scope: config.scope, callback: () => {}, error_callback: error => {
      clear(); ui.message(error.type === 'popup_failed_to_open' ? 'Permita pop-ups deste site para entrar com Google.' : 'A janela de autorização foi fechada. Clique em Entrar com Google para tentar novamente.', true);
    } }); sync(); ui.message('Entre com a conta Google que tem acesso à planilha.');
  }
  const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.onload = ready;
  script.onerror = () => ui.message('Falha ao carregar autenticação Google. Verifique sua conexão e recarregue.', true); document.head.append(script);
  ui.message('Carregando autenticação Google…'); sync();
  setInterval(() => { if (!document.hidden) refresh(); }, config.refreshMs);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('online', refresh);
  window.addEventListener('pagehide', clear);
  return { login, logout, refresh };
})();
