// Cadastro de produtos: edita o catálogo dentro do app (salvo no navegador), com exportação/importação.
// As tabelas editadas substituem window.CATALOGO; o motor passa a usar os valores novos imediatamente.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const KEY = 'drivein.catalogo.v1';
  const PADRAO = JSON.parse(JSON.stringify(window.CATALOGO));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Tabelas editáveis: cada uma com colunas (chave, rótulo, tipo) e conversão de/para a estrutura do catálogo
  const TABELAS = {
    produtos: {
      titulo: 'Produtos (peso, código, custo)',
      cols: [['id', 'ID', 'text'], ['tipo', 'Tipo', 'text'], ['desc', 'Descrição', 'text'], ['codigo', 'Código (SA/CO/INT)', 'text'], ['peso', 'Peso usado (kg ou kg/m)', 'number'], ['unid', 'Unidade', 'text'], ['aco', 'Aço / material', 'text'], ['custo', 'Custo unit. (R$)', 'number']],
      ler: (c) => Object.entries(c.produtos).map(([id, p]) => ({ id, ...p })),
      gravar: (c, rows) => { c.produtos = {}; for (const r of rows) if (r.id) { const { id, ...p } = r; c.produtos[id] = p; } },
    },
    colunas_sa: {
      titulo: 'Colunas: SA por altura',
      cols: [['col', 'Coluna (80/101/122)', 'number'], ['altura', 'Altura (mm)', 'number'], ['sa', 'Código SA', 'text']],
      ler: (c) => Object.entries(c.colunas_sa).flatMap(([col, m]) => Object.entries(m).map(([altura, sa]) => ({ col: Number(col), altura: Number(altura), sa }))).sort((a, b) => a.col - b.col || a.altura - b.altura),
      gravar: (c, rows) => { c.colunas_sa = {}; for (const r of rows) if (r.col && r.altura && r.sa) (c.colunas_sa[r.col] = c.colunas_sa[r.col] || {})[r.altura] = r.sa; },
    },
    colunas_kg: {
      titulo: 'Colunas: kg/m por espessura',
      cols: [['col', 'Coluna', 'number'], ['esp', 'Espessura (mm)', 'text'], ['kgm', 'kg/m', 'number']],
      ler: (c) => Object.entries(c.colunas).flatMap(([col, m]) => Object.entries(m).map(([esp, kgm]) => ({ col: Number(col), esp, kgm }))),
      gravar: (c, rows) => { c.colunas = {}; for (const r of rows) if (r.col && r.esp) (c.colunas[r.col] = c.colunas[r.col] || {})[r.esp] = Number(r.kgm); },
    },
    travessas: { titulo: 'Travessas horizontais', cols: [['nome', 'Descrição', 'text'], ['sa', 'SA', 'text'], ['cc', 'Centro a centro (mm)', 'number'], ['total', 'Comprimento total (mm)', 'number']], ler: (c) => c.travessas.map((x) => ({ ...x })), gravar: (c, rows) => { c.travessas = rows.filter((r) => r.sa && r.total).map((r) => ({ nome: r.nome, sa: r.sa, cc: Number(r.cc), total: Number(r.total) })); } },
    diagonais: { titulo: 'Travessas diagonais', cols: [['nome', 'Descrição', 'text'], ['sa', 'SA', 'text'], ['cc', 'Centro a centro (mm)', 'number'], ['total', 'Comprimento total (mm)', 'number']], ler: (c) => c.diagonais.map((x) => ({ ...x })), gravar: (c, rows) => { c.diagonais = rows.filter((r) => r.sa && r.total).map((r) => ({ nome: r.nome, sa: r.sa, cc: Number(r.cc), total: Number(r.total) })); } },
    uniao: { titulo: 'Travessa união (coluna solteira)', cols: [['nome', 'Descrição', 'text'], ['col', 'Coluna', 'number'], ['co', 'CO', 'text'], ['total', 'Comprimento total (mm)', 'number'], ['peso', 'Peso (kg)', 'number']], ler: (c) => (c.uniao || []).map((x) => ({ ...x })), gravar: (c, rows) => { c.uniao = rows.filter((r) => r.co && r.total).map((r) => ({ nome: r.nome, col: Number(r.col), co: r.co, total: Number(r.total), peso: Number(r.peso) || null })); } },
    composicao: { titulo: 'Composição (o que entra em cada conjunto)', cols: [['pai', 'Conjunto', 'text'], ['item', 'Item (ID em Produtos)', 'text'], ['qtd', 'Quantidade', 'number'], ['contagem', 'Contagem', 'text']], ler: (c) => c.composicao.map((x) => ({ ...x })), gravar: (c, rows) => { c.composicao = rows.filter((r) => r.pai && r.item).map((r) => ({ pai: r.pai, item: r.item, qtd: Number(r.qtd), contagem: r.contagem })); } },
  };

  let atual = 'produtos', rows = [];
  function carregar() {
    try { const s = localStorage.getItem(KEY); if (s) { const c = JSON.parse(s); Object.assign(window.CATALOGO, c); window.CATALOGO.versao = (c.versao || PADRAO.versao) + ' (editado)'; } } catch (e) { /* sem storage */ }
  }
  function salvar() {
    TABELAS[atual].gravar(window.CATALOGO, rows);
    try { localStorage.setItem(KEY, JSON.stringify(window.CATALOGO)); } catch (e) { /* sem storage */ }
    $('cadMsg').textContent = `Salvo ${new Date().toLocaleTimeString('pt-BR')}. O configurador já usa os valores novos.`;
    if (window.recalcular) window.recalcular();
  }
  function renderTabela() {
    const T = TABELAS[atual]; rows = T.ler(window.CATALOGO);
    const filtro = ($('cadBusca').value || '').toLowerCase();
    const vis = rows.map((r, i) => [r, i]).filter(([r]) => !filtro || Object.values(r).join(' ').toLowerCase().includes(filtro)).slice(0, 600);
    let h = `<table><thead><tr>${T.cols.map((c) => `<th>${c[1]}</th>`).join('')}<th></th></tr></thead><tbody>`;
    for (const [r, i] of vis) h += `<tr data-i="${i}">${T.cols.map((c) => `<td><input data-k="${c[0]}" type="${c[2]}" step="any" value="${esc(r[c[0]])}"/></td>`).join('')}<td><button class="mini" data-del="${i}">×</button></td></tr>`;
    h += `</tbody></table>`;
    $('cadTabela').innerHTML = h;
    $('cadInfo').textContent = `${rows.length} linhas${vis.length < rows.length ? ` (mostrando ${vis.length})` : ''}`;
    $('cadTabela').querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => { const i = Number(inp.closest('tr').dataset.i); rows[i][inp.dataset.k] = inp.type === 'number' ? (inp.value === '' ? '' : Number(inp.value)) : inp.value; }));
    $('cadTabela').querySelectorAll('button[data-del]').forEach((b) => b.addEventListener('click', () => { rows.splice(Number(b.dataset.del), 1); TABELAS[atual].gravar(window.CATALOGO, rows); renderTabela(); }));
  }
  function exportarCsv() {
    const T = TABELAS[atual];
    const txt = [T.cols.map((c) => c[1]).join(';')].concat(rows.map((r) => T.cols.map((c) => `"${String(r[c[0]] ?? '').replace(/"/g, '""')}"`).join(';'))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv' })); a.download = `cadastro-${atual}.csv`; a.click();
  }
  function init() {
    carregar();
    $('cadAbas').innerHTML = Object.entries(TABELAS).map(([k, t]) => `<div class="tab ${k === atual ? 'active' : ''}" data-cad="${k}">${t.titulo}</div>`).join('');
    $('cadAbas').querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { atual = t.dataset.cad; $('cadAbas').querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t)); renderTabela(); }));
    $('cadBusca').addEventListener('input', renderTabela);
    $('cadNovo').addEventListener('click', () => { rows.push({}); TABELAS[atual].gravar(window.CATALOGO, rows); renderTabela(); $('cadTabela').scrollTop = 1e9; });
    $('cadSalvar').addEventListener('click', salvar);
    $('cadCsv').addEventListener('click', exportarCsv);
    $('cadJson').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(window.CATALOGO, null, 1)], { type: 'application/json' })); a.download = 'catalogo-drive-in.json'; a.click(); });
    $('cadImportar').addEventListener('change', (ev) => { const f = ev.target.files[0]; if (!f) return; f.text().then((t) => { try { Object.assign(window.CATALOGO, JSON.parse(t)); localStorage.setItem(KEY, JSON.stringify(window.CATALOGO)); renderTabela(); $('cadMsg').textContent = 'Catálogo importado.'; if (window.recalcular) window.recalcular(); } catch (e) { $('cadMsg').textContent = 'Arquivo inválido.'; } }); });
    $('cadRestaurar').addEventListener('click', () => { if (!confirm('Descartar todas as edições e voltar ao catálogo padrão?')) return; Object.assign(window.CATALOGO, JSON.parse(JSON.stringify(PADRAO))); try { localStorage.removeItem(KEY); } catch (e) {} renderTabela(); $('cadMsg').textContent = 'Catálogo padrão restaurado.'; if (window.recalcular) window.recalcular(); });
    renderTabela();
  }
  window.Cadastro = { init };
})();
