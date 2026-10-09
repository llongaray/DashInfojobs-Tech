'use strict';
window.DashUI = (() => {
  const S = { tables: null, view: 'Visão geral', tab: 'Resumo', query: '', mode: '', status: '', match: '', page: 0, updated: null, ready: false, connected: false, loading: false, message: '', error: false };
  const $ = id => document.getElementById(id);
  const h = (tag, cls = '', text = '') => { const n = document.createElement(tag); n.className = cls; if (text !== '') n.textContent = text; return n; };
  const append = (parent, ...nodes) => { parent.append(...nodes); return parent; };
  const button = (text, cls, action) => { const b = h('button', cls, text); b.type = 'button'; b.onclick = action; return b; };
  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    bag: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V4h8v3M3 12a20 20 0 0 0 18 0M12 11v4"/>',
    check: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="m9 12 2 2 4-4M9 4V2h6v2"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2"/>',
    settings: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    chart: '<path d="M4 18V6m0 12h16M8 14l4-5 4 3 4-7"/>'
  };
  function icon(name, size = 20) {
    const node = h('span', 'di-svg');
    // Only fixed, local SVG paths are inserted as markup; all remote data uses textContent.
    node.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>';
    return node;
  }
  const pill = (text, color = 'blue') => h('span', 'di-pill ' + color, text || 'Não informado');
  function header(title, desc, action) {
    const n = h('div', 'di-panel-title'); append(n, append(h('div'), h('h3', '', title), h('p', '', desc)));
    if (action) n.append(button('Explorar vagas →', 'di-text-button', () => navigate('Oportunidades')));
    return n;
  }
  const panel = (title, desc) => append(h('section', 'di-panel'), header(title, desc));
  const allJobs = () => S.tables ? [...S.tables[0].rows, ...S.tables[1].rows] : [];
  function sourceRows() { return !S.tables ? [] : S.view === 'Candidaturas' ? S.tables[2].rows : S.tab === 'Vagas InfoJobs' ? S.tables[0].rows : S.tab === 'Vagas' ? S.tables[1].rows : allJobs(); }
  function rows() { return DashData.filter(sourceRows(), S.query, S.mode, S.status, S.match, S.view === 'Candidaturas'); }
  function navigate(view) {
    S.view = view; S.tab = view === 'Visão geral' ? 'Resumo' : view === 'Oportunidades' ? 'Todas' : view === 'Candidaturas' ? 'Lista' : 'Conexão Google';
    resetFilters(); $('sidebar').classList.remove('di-open'); $('mobile-toggle').setAttribute('aria-expanded', 'false'); render();
  }
  function resetFilters() { S.query = S.mode = S.status = S.match = ''; S.page = 0; }
  function shell() {
    const root = h('div', 'di-app');
    const aside = h('aside', 'di-sidebar'); aside.id = 'sidebar';
    const brand = button('', 'di-brand', () => navigate('Visão geral'));
    append(brand, h('span', 'di-brand-mark', 'di'), append(h('span', '', 'DashInfojobs'), h('small', '', 'TECH WORKSPACE')));
    append(aside, brand, append(h('div', 'di-workspace'), h('span', 'di-avatar small', 'AS'), append(h('div'), h('strong', '', 'Aray Soluções'), h('small', '', 'Espaço pessoal'))), h('div', 'di-nav-label', 'ACOMPANHAMENTO'));
    const nav = h('nav'); nav.setAttribute('aria-label', 'Navegação principal');
    [['Visão geral', 'grid'], ['Oportunidades', 'bag'], ['Candidaturas', 'check']].forEach(([label, ic]) => {
      const b = button('', 'di-nav', () => navigate(label)); b.dataset.view = label; append(b, icon(ic), h('span', '', label)); nav.append(b);
    });
    aside.append(nav);
    const bottom = h('div', 'di-side-bottom');
    append(bottom, append(h('div', 'di-sync-card'), append(h('span', 'di-live'), icon('shield', 15), h('span', '', 'Google Planilhas')), h('p', '', 'Suas oportunidades, sempre por perto.'), h('small', '', 'Consulta automática a cada 60 segundos')));
    const settings = button('', 'di-nav', () => navigate('Configurações')); settings.dataset.view = 'Configurações'; append(settings, icon('settings'), h('span', '', 'Configurações'));
    const signout = button('Sair da conta', 'di-nav', () => window.DashAuth?.logout()); signout.id = 'logout'; signout.hidden = true;
    append(bottom, settings, signout, append(h('div', 'di-profile'), h('span', 'di-avatar', 'AS'), append(h('div'), h('strong', '', 'Aray Soluções'), h('small', '', 'Controle de oportunidades')))); aside.append(bottom);
    const content = h('div', 'di-content'), top = h('header', 'di-top'), crumb = h('div', 'di-breadcrumb');
    const toggle = button('☰', 'di-mobile-toggle', () => { const open = aside.classList.toggle('di-open'); toggle.setAttribute('aria-expanded', String(open)); });
    toggle.id = 'mobile-toggle'; toggle.setAttribute('aria-label', 'Abrir menu'); toggle.setAttribute('aria-controls', 'sidebar'); toggle.setAttribute('aria-expanded', 'false');
    const current = h('strong', '', 'Visão geral'); current.id = 'current-view';
    append(crumb, toggle, h('span', '', 'Workspace'), h('span', '', '/'), current);
    append(top, crumb, append(h('div', 'di-top-right'), h('span', 'di-prototype', 'ACESSO PRIVADO'), h('span', 'di-avatar small', 'AS')));
    const main = h('main'); main.id = 'main'; main.tabIndex = -1;
    const heading = h('div', 'di-heading'), intro = h('div');
    const title = h('h1'); title.id = 'page-title'; const subtitle = h('p'); subtitle.id = 'page-subtitle';
    append(intro, h('div', 'di-eyebrow', 'SEU PRÓXIMO PASSO COMEÇA AQUI'), title, subtitle);
    const refresh = button('', 'di-button', () => window.DashAuth?.refresh()); refresh.id = 'refresh'; append(refresh, icon('refresh', 17), h('span', '', 'Atualizar dados'));
    append(heading, intro, refresh);
    const status = h('p', 'di-message'); status.id = 'message'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const body = h('div'); body.id = 'view-body';
    append(main, heading, status, body, append(h('footer', 'di-footer'), h('span', '', 'ARAY SOLUÇÕES · DashInfojobs Tech'), h('span', '', 'Dados do Google Planilhas · somente leitura')));
    append(content, top, main); append(root, aside, content); $('app').replaceChildren(root);
  }
  function session(ready, connected, loading) { S.ready = ready; S.connected = connected; S.loading = loading; controls(); }
  function controls() {
    $('logout').hidden = !S.connected; $('refresh').hidden = !S.connected; $('refresh').disabled = S.loading;
    document.querySelectorAll('[data-login]').forEach(b => { b.disabled = !S.ready || S.loading; b.textContent = S.loading ? 'Conectando…' : 'Entrar com Google'; });
  }
  function message(text, error = false) { S.message = text; S.error = error; $('message').textContent = text; $('message').classList.toggle('error', error); }
  function clear() { S.tables = null; S.updated = null; resetFilters(); document.getElementById('detail-dialog')?.remove(); render(); }
  function setData(tables) {
    S.tables = tables; S.updated = new Date();
    // Preserve keyboard focus and text selection across background refreshes.
    const focused = document.activeElement, focusId = focused?.id;
    const selection = focused?.tagName === 'INPUT' ? [focused.selectionStart, focused.selectionEnd] : null;
    document.getElementById('detail-dialog')?.close(); document.getElementById('detail-dialog')?.remove();
    render();
    if (focusId && $(focusId)) { $(focusId).focus(); if (selection) $(focusId).setSelectionRange(...selection); }
  }
  function welcome(target) {
    const n = h('section', 'di-welcome');
    append(n, h('span', 'di-welcome-icon', 'di'), h('span', 'di-eyebrow', 'UM ESPAÇO PARA SUA PRÓXIMA CONQUISTA'), h('h2', '', 'Suas oportunidades.\nUma visão mais clara.'), h('p', '', 'Reúna suas vagas e candidaturas em um painel organizado. Entre com a conta Google que tem acesso à planilha.'));
    const login = button('Entrar com Google', 'di-button', () => window.DashAuth?.login()); login.dataset.login = 'true'; n.append(login);
    append(n, append(h('div', 'di-welcome-security'), icon('shield', 16), h('span', '', 'Somente leitura · dados protegidos pelas permissões da planilha')));
    if (S.connected) n.append(button('Tentar consultar novamente', 'di-text-button', () => window.DashAuth?.refresh()));
    target.append(n); controls();
  }
  function render() {
    $('current-view').textContent = S.view;
    const titles = { 'Visão geral': ['Seu radar de oportunidades', 'Uma visão clara das vagas e dos processos que importam para você.'], Oportunidades: ['Encontre seu próximo desafio', 'Explore as recomendações e filtre as oportunidades mais alinhadas ao seu perfil.'], Candidaturas: ['Acompanhe cada candidatura', 'Seu histórico e as etapas dos processos em um só lugar.'], Configurações: ['Seu workspace, conectado', 'Confira a fonte dos dados e gerencie sua sessão.'] };
    $('page-title').textContent = titles[S.view][0]; $('page-subtitle').textContent = titles[S.view][1];
    document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === S.view); if (b.dataset.view === S.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const body = $('view-body'); body.replaceChildren(); controls();
    if (!S.tables) { welcome(body); return; }
    const tabs = S.view === 'Visão geral' ? ['Resumo', 'Análises'] : S.view === 'Oportunidades' ? ['Todas', 'Vagas InfoJobs', 'Vagas'] : S.view === 'Candidaturas' ? ['Lista', 'Etapas'] : ['Conexão Google'];
    const bar = h('div', 'di-tab-bar'), tablist = h('div'); tablist.setAttribute('role', 'tablist'); tablist.setAttribute('aria-label', S.view);
    tabs.forEach(t => { const b = button(t, S.tab === t ? 'active' : '', () => { S.tab = t; resetFilters(); render(); }); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(S.tab === t)); b.id = 'tab-' + tabs.indexOf(t); b.setAttribute('aria-controls', 'tab-content'); b.tabIndex = S.tab === t ? 0 : -1; b.onkeydown = e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); let i = tabs.indexOf(t); i = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; S.tab = tabs[i]; resetFilters(); render(); $('tab-' + i).focus(); } }; tablist.append(b); });
    append(bar, tablist, append(h('span', 'di-updated'), h('i'), h('span', '', 'Última consulta · ' + S.updated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })))); body.append(bar);
    const target = h('div'); target.id = 'tab-content'; target.setAttribute('role', 'tabpanel'); target.setAttribute('aria-labelledby', 'tab-' + tabs.indexOf(S.tab)); body.append(target);
    if (S.view === 'Visão geral') overview(target);
    else if (S.view === 'Configurações') settings(target);
    else listing(target);
  }
  function kpi(label, value, note, ic, color) {
    return append(h('article', 'di-kpi'), append(h('div', 'di-kpi-label'), h('span', '', label), append(h('span', 'di-kpi-icon ' + color), icon(ic, 18))), h('strong', '', String(value)), h('small', '', note));
  }
  function bars(parent, data) {
    const list = h('div', 'di-source-list');
    if (!data.length) list.append(h('p', 'di-empty', 'Sem registros nesta aba.'));
    const max = Math.max(1, ...data.map(([, n]) => n));
    data.forEach(([label, n], i) => {
      const source = h('div', 'di-source'), fill = h('span', ['blue', 'violet', 'cyan'][i % 3]); fill.style.width = n / max * 100 + '%';
      append(source, append(h('div'), h('span', '', label), h('strong', '', String(n))), append(h('div', 'di-track'), fill)); list.append(source);
    }); parent.append(list);
  }
  function overview(target) {
    const a = S.tables[0].rows, b = S.tables[1].rows, c = S.tables[2].rows;
    const remote = a.filter(r => /home office|remoto/.test(DashData.norm(r.mode))).length;
    append(target, append(h('div', 'di-section-caption'), h('h2', '', 'Panorama do workspace'), h('span', '', 'Totais por aba · ' + S.updated.toLocaleDateString('pt-BR'))), append(h('section', 'di-kpis'), kpi('Recomendações InfoJobs', a.length, 'Na aba Vagas InfoJobs', 'bag', 'blue'), kpi('Vagas monitoradas', b.length, 'Na aba Vagas', 'search', 'violet'), kpi('Candidaturas registradas', c.length, 'Na aba Candidaturas', 'check', 'cyan'), kpi('Home office · InfoJobs', remote, a.length ? Math.round(remote / a.length * 100) + '% das recomendações desta aba' : 'Sem recomendações nesta aba', 'chart', 'green')));
    const charts = h('div', 'di-chart-grid');
    if (S.tab === 'Resumo') {
      const modes = panel('Como você quer trabalhar?', 'Modalidades · aba Vagas InfoJobs');
      const counts = DashData.count(a, 'mode');
      const wrap = h('div', 'di-modalities'), donut = h('div', 'di-donut'); donut.setAttribute('aria-label', a.length + ' recomendações');
      const colors = ['#7994ff', '#67bbc8', '#a18acb', '#e6bc73', '#7bd7b5']; let start = 0;
      donut.style.background = a.length ? 'conic-gradient(' + counts.map(([, n], i) => { const end = start + n / a.length * 100; const s = colors[i % colors.length] + ' ' + start + '% ' + end + '%'; start = end; return s; }).join(',') + ')' : '#253042';
      append(donut, append(h('div'), h('strong', '', String(a.length)), h('span', '', 'recomendações')));
      const legend = h('div', 'di-legend'); counts.forEach(([label, n], i) => { const dot = h('span', 'di-dot'); dot.style.background = colors[i % colors.length]; append(legend, append(h('div'), dot, h('span', '', label), h('strong', '', String(n)), h('small', '', Math.round(n / a.length * 100) + '%'))); });
      if (!counts.length) legend.append(h('span', '', 'Sem dados de modalidade.'));
      append(modes, append(wrap, donut, legend), h('div', 'di-panel-note', 'Distribuição calculada diretamente da planilha.'));
      const sources = panel('Suas fontes, organizadas', 'Cada aba tem seu próprio conjunto de registros'); bars(sources, S.tables.map(t => [t.name, t.rows.length])); sources.append(h('div', 'di-panel-note', 'As abas podem conter a mesma oportunidade.'));
      append(charts, modes, sources); target.append(charts);
      const featured = h('section', 'di-panel'); featured.append(header('Recomendações em destaque', 'Até 5 registros com maior compatibilidade · InfoJobs', true));
      const rank = r => ({ 'muito alta': 4, alta: 3, media: 2, baixa: 1 }[DashData.norm(r.match)] || 0);
      table(featured, [...a].sort((x, y) => rank(y) - rank(x)).slice(0, 5), false, false);
      featured.append(h('div', 'di-table-footer', 'Confira os detalhes da vaga antes de se candidatar.')); target.append(featured);
    } else {
      [['Compatibilidade', 'Recomendações InfoJobs', a, 'match'], ['Status das recomendações', 'Aba Vagas InfoJobs', a, 'status'], ['Etapas das candidaturas', 'Aba Candidaturas', c, 'stage'], ['Situação das candidaturas', 'Aba Candidaturas', c, 'status']].forEach(([title, desc, data, key]) => { const p = panel(title, desc); bars(p, DashData.count(data, key)); charts.append(p); }); target.append(charts);
    }
  }
  function listing(target) {
    const applications = S.view === 'Candidaturas';
    if (!applications) target.append(h('p', 'di-list-note', 'Os registros das duas abas são exibidos separadamente e podem incluir a mesma vaga.'));
    const filters = h('section', 'di-filter-panel'); filters.setAttribute('aria-label', 'Filtros');
    const search = h('input'); search.id = 'search'; search.type = 'search'; search.placeholder = 'Buscar por cargo, empresa ou local…'; search.setAttribute('aria-label', 'Pesquisar registros'); search.value = S.query; search.oninput = () => { S.query = search.value; S.page = 0; renderResults(); };
    append(filters, append(h('div', 'di-search'), icon('search'), search));
    function select(key, rowKey, label) {
      const field = h('select'); field.id = 'filter-' + key; field.setAttribute('aria-label', label); const values = [...new Set(sourceRows().map(r => r[rowKey]).filter(Boolean))].sort((x, y) => x.localeCompare(y, 'pt-BR'));
      if (S[key] && !values.includes(S[key])) S[key] = '';
      ['', ...values].forEach(v => { const o = h('option', '', v || label); o.value = v; field.append(o); }); field.value = S[key];
      field.onchange = () => { S[key] = field.value; S.page = 0; renderResults(); }; filters.append(field);
    }
    select('mode', applications ? 'stage' : 'mode', applications ? 'Todos os estágios' : 'Todas as modalidades'); select('status', 'status', 'Todos os status');
    if (!applications) select('match', 'match', 'Todas as compatibilidades');
    filters.append(button('Limpar', 'di-button secondary', () => { resetFilters(); render(); })); target.append(filters);
    const results = h('div'); results.id = 'results'; target.append(results); renderResults();
  }
  function renderResults() {
    const target = $('results'); if (!target) return; target.replaceChildren();
    const data = rows(), applications = S.view === 'Candidaturas';
    const summary = h('p', 'di-list-note', data.length + ' registros encontrados'); summary.setAttribute('role', 'status'); target.append(summary);
    if (applications && S.tab === 'Etapas') {
      if (!data.length) { target.append(h('div', 'di-empty', 'Nenhuma candidatura neste filtro.')); return; }
      const board = h('div', 'di-kanban');
      DashData.count(data, 'stage').forEach(([stage, n], i) => {
        const col = h('section', 'di-kanban-col'); append(col, append(h('h3'), h('span', 'di-dot ' + ['blue', 'violet', 'cyan'][i % 3]), h('span', '', stage), h('em', '', String(n))));
        const group = data.filter(r => (r.stage || 'Não informado') === stage); let displayed = 0;
        const more = button('Mostrar mais', 'di-button secondary', () => add());
        function add() { group.slice(displayed, displayed + 20).forEach(r => { const card = button('', 'di-kanban-card', () => details(r)); append(card, h('span', 'di-card-overline', r.date || 'DATA NÃO INFORMADA'), h('strong', '', r.title || 'Vaga sem título'), h('small', '', r.company || 'Empresa não informada'), pill(r.status, 'blue'), append(h('div'), h('span', '', 'Ver detalhes'), icon('arrow', 16))); col.insertBefore(card, more); }); displayed += 20; more.hidden = displayed >= group.length; }
        col.append(more); add(); board.append(col);
      }); target.append(board); return;
    }
    const p = panel(applications ? 'Histórico de candidaturas' : 'Oportunidades selecionadas', applications ? 'Etapas e situações registradas na planilha' : 'Registros da aba selecionada');
    table(p, data, applications, true); target.append(p);
  }
  function table(parent, data, applications, paginated) {
    const wrap = h('div', 'di-table-scroll'), t = h('table'), head = h('thead'), hr = h('tr');
    const columns = applications ? ['VAGA / EMPRESA', 'DATA', 'ETAPA', 'SITUAÇÃO', 'DETALHES'] : ['VAGA / EMPRESA', 'MODALIDADE', 'COMPATIBILIDADE', 'STATUS', 'DETALHES'];
    columns.forEach(c => { const th = h('th', '', c); th.scope = 'col'; hr.append(th); }); head.append(hr); t.append(head);
    const tbody = h('tbody'), pages = Math.max(1, Math.ceil(data.length / DASH_CONFIG.pageSize)); S.page = Math.min(S.page, pages - 1);
    const visible = paginated ? data.slice(S.page * DASH_CONFIG.pageSize, (S.page + 1) * DASH_CONFIG.pageSize) : data;
    visible.forEach((r, i) => {
      const tr = h('tr'), job = h('div', 'di-job');
      append(job, append(h('span', 'di-company c' + i % 3), icon('bag', 19)), append(h('div'), h('strong', '', r.title || 'Vaga sem título'), h('small', '', (r.company || 'Empresa não informada') + ' · ' + r.source)));
      tr.append(append(h('td'), job));
      tr.append(append(h('td'), applications ? h('span', '', r.date || 'Não informada') : h('span', 'di-mode', r.mode || 'Não informada')));
      tr.append(append(h('td'), pill(applications ? r.stage : r.match, applications ? 'blue' : /alta/.test(DashData.norm(r.match)) ? 'green' : 'amber')));
      tr.append(append(h('td'), h('span', 'di-status', r.status || 'Não informado')));
      const detail = button('', 'di-icon-button', () => details(r)); detail.setAttribute('aria-label', 'Ver detalhes: ' + (r.title || 'Vaga')); detail.append(icon('arrow', 17)); tr.append(append(h('td'), detail)); tbody.append(tr);
    });
    if (!data.length) { const td = h('td', 'di-empty', 'Nenhum registro encontrado. Experimente outro filtro.'); td.colSpan = 5; tbody.append(append(h('tr'), td)); }
    t.append(tbody); wrap.append(t); parent.append(wrap);
    if (paginated) {
      const footer = h('div', 'di-table-footer'); footer.append(h('span', '', data.length ? (S.page * DASH_CONFIG.pageSize + 1) + '–' + Math.min((S.page + 1) * DASH_CONFIG.pageSize, data.length) + ' de ' + data.length : '0 registros'));
      const controls = h('div', 'di-pagination'), prev = button('Anterior', '', () => { S.page--; renderResults(); }), next = button('Próxima', '', () => { S.page++; renderResults(); }); prev.disabled = S.page === 0; next.disabled = S.page >= pages - 1;
      append(controls, prev, h('span', '', 'Página ' + (S.page + 1) + ' de ' + pages), next); footer.append(controls); parent.append(footer);
    }
  }
  function details(row) {
    $('detail-dialog')?.remove();
    const d = h('dialog', 'di-detail-dialog'); d.id = 'detail-dialog'; d.setAttribute('aria-labelledby', 'detail-title'); const content = h('section', 'di-detail');
    const close = button('×', '', () => d.close()); close.setAttribute('aria-label', 'Fechar detalhes');
    append(content, append(h('div', 'di-detail-top'), h('span', '', 'DETALHES DA OPORTUNIDADE'), close), append(h('span', 'di-company c0'), icon('bag', 24)));
    const title = h('h2', '', row.title || 'Vaga sem título'); title.id = 'detail-title'; append(content, title, h('p', '', row.company || 'Empresa não informada'), h('hr'));
    const fields = h('dl', 'di-details-fields'); row.fields.forEach(([label, value]) => { if (label && label !== 'Link InfoJobs') append(fields, h('dt', '', label), h('dd', '', value || 'Não informado')); }); content.append(fields);
    const link = DashData.safeLink(row.link);
    if (link) { const a = h('a', 'di-button', 'Abrir vaga no InfoJobs ↗'); a.href = link; a.target = '_blank'; a.rel = 'noopener noreferrer'; content.append(a); }
    else content.append(h('p', 'di-detail-note', 'Nenhum link HTTPS válido do InfoJobs disponível neste registro.'));
    d.append(content); document.body.append(d); d.addEventListener('click', e => { if (e.target === d) d.close(); }); d.addEventListener('close', () => d.remove()); d.showModal(); close.focus();
  }
  function settings(target) {
    const p = panel('Conexão com Google Planilhas', 'Acesso somente para leitura'); p.classList.add('di-connection');
    append(p, append(h('div', 'di-connect-summary'), h('span', 'di-google', 'G'), append(h('div'), h('h3', '', 'Vagas InfoJobs — Recomendações'), h('p', '', 'Vagas InfoJobs · Vagas · Candidaturas')), pill('Conectada', 'green')));
    [['Atualização automática', 'A cada 60 segundos, enquanto a página estiver visível e a autorização estiver válida.'], ['Última consulta bem-sucedida', S.updated.toLocaleString('pt-BR')], ['Privacidade dos dados', 'O Google verifica a permissão da sua conta na planilha. Dados e autorização ficam apenas na memória desta página.']].forEach(([title, desc]) => append(p, append(h('div', 'di-settings-row'), append(h('div'), h('strong', '', title), h('p', '', desc)), icon('shield'))));
    append(p, append(h('div', 'di-settings-row'), h('span', '', 'Encerrar acesso neste navegador'), button('Sair da conta', 'di-button secondary', () => window.DashAuth?.logout()))); target.append(p);
  }
  shell(); render();
  return { session, message, clear, setData };
})();
