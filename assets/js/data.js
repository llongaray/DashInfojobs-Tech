'use strict';
window.DashData = (() => {
  const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  function parse(result) {
    if (!Array.isArray(result.valueRanges) || result.valueRanges.length !== 3) throw new Error('Resposta incompleta da planilha. Tente atualizar.');
    return result.valueRanges.map((range, sheet) => {
      const values = range.values || [];
      const headers = values[0] || [];
      const indexes = new Map(headers.map((v, i) => [norm(v), i]));
      const required = sheet === 2 ? ['Vaga', 'Empresa', 'Estágio', 'Situação da candidatura'] : ['Vaga', 'Empresa', 'Modalidade', 'Status'];
      if (values.length && required.some(h => !indexes.has(norm(h)))) throw new Error('Confira os cabeçalhos da aba ' + DASH_CONFIG.sheets[sheet] + '.');
      const rows = values.slice(1).map((row, i) => {
        const get = name => String(row[indexes.get(norm(name))] ?? '').trim();
        return {
          id: sheet + ':' + (i + 2), sheet, source: DASH_CONFIG.sheets[sheet],
          title: get('Vaga'), company: get('Empresa'),
          date: get(sheet === 2 ? 'Data da candidatura' : 'Data e hora'),
          mode: get('Modalidade'), match: get('Compatibilidade'), reason: get('Motivo'),
          place: get(sheet === 2 ? 'Local / distância informada' : 'Local'),
          stage: get('Estágio'), status: get(sheet === 2 ? 'Situação da candidatura' : 'Status'),
          link: get('Link InfoJobs'), fields: headers.map((h, c) => [String(h), String(row[c] ?? '')]),
          search: norm(row.join(' '))
        };
      }).filter(row => row.fields.some(([, v]) => v.trim()));
      return { name: DASH_CONFIG.sheets[sheet], rows };
    });
  }
  function safeLink(value) {
    try { const u = new URL(value); return u.protocol === 'https:' && (u.hostname === 'infojobs.com.br' || u.hostname.endsWith('.infojobs.com.br')) ? u.href : null; } catch { return null; }
  }
  function count(rows, key) {
    const values = new Map();
    rows.forEach(r => { const label = r[key] || 'Não informado'; values.set(label, (values.get(label) || 0) + 1); });
    return [...values].sort((a, b) => b[1] - a[1]);
  }
  function filter(rows, query, mode, status, compatibility, applications = false) {
    return rows.filter(r => (!query || r.search.includes(norm(query))) && (!mode || r[applications ? 'stage' : 'mode'] === mode) && (!status || r.status === status) && (!compatibility || r.match === compatibility));
  }
  return { norm, parse, safeLink, count, filter };
})();
