// Cadastro de produtos com controle de versão (Gean): o catálogo oficial fica na pasta da empresa (catalogo/catalogo-drive-in.json).
// Qualquer um consulta; editar exige a senha do catálogo. "Publicar nova versão" grava a versão N+1 com autor, data e descrição
// (e uma cópia em catalogo/versoes/). Nada fica salvo só no navegador — evita catálogos diferentes em cada máquina.
// A senha é uma trava contra edição acidental; a proteção de verdade é a permissão de escrita na pasta catalogo/ (administrador).
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
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

  let atual = 'produtos', rows = [], liberado = false, alterado = false;
  const sha256 = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('drivein|' + t)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const meta = () => (window.CATALOGO.meta = window.CATALOGO.meta || { versao: 0, data: window.CATALOGO.versao, autor: 'catálogo base (planilha)', historico: [] });
  function substituir(novo) { for (const k of Object.keys(window.CATALOGO)) delete window.CATALOGO[k]; Object.assign(window.CATALOGO, JSON.parse(JSON.stringify(novo))); }
  async function carregarDaPasta() {
    if (!(window.Pasta && Pasta.pronta)) return false;
    const t = await Pasta.ler('catalogo/catalogo-drive-in.json');
    if (!t) { msg('A pasta ainda não tem catálogo publicado: usando o catálogo base do app. Publique a v1 pelo Cadastro.'); return false; }
    try { substituir(JSON.parse(t)); msg(`Catálogo v${meta().versao} carregado da pasta ${Pasta.nome()}.`); renderTabela(); if (window.recalcular) window.recalcular(); return true; } catch (e) { msg('Catálogo da pasta inválido: ' + e.message); return false; }
  }
  function msg(t) { const el = $('cadMsg'); if (el) el.textContent = t; }
  async function desbloquear() {
    const m = meta();
    if (!m.senhaHash) {
      const a = prompt('Este catálogo ainda não tem senha. Defina a senha de edição (mín. 6 caracteres):'); if (!a) return;
      if (a.length < 6) { alert('Senha muito curta.'); return; }
      if (prompt('Repita a senha:') !== a) { alert('As senhas não conferem.'); return; }
      m.senhaHash = await sha256(a); alterado = true; liberado = true;
      msg('Senha definida. Ela passa a valer quando a próxima versão for publicada.');
    } else {
      const a = prompt('Senha de edição do catálogo:'); if (a == null) return;
      if ((await sha256(a)) !== m.senhaHash) { alert('Senha incorreta.'); return; }
      liberado = true; msg('Edição liberada nesta sessão. Publique uma nova versão para valer para todos.');
    }
    estado();
  }
  async function publicar() {
    if (!liberado) return;
    TABELAS[atual].gravar(window.CATALOGO, rows);
    const autor = (prompt('Seu nome (autor desta versão):') || '').trim(); if (!autor) return;
    const desc = (prompt('O que mudou nesta versão? (vai para o histórico)') || '').trim(); if (!desc) { alert('Descreva a alteração.'); return; }
    const m = meta(), v = (m.versao || 0) + 1, hoje = new Date().toISOString().slice(0, 10);
    m.historico = (m.historico || []).concat({ versao: v, data: hoje, autor, descricao: desc });
    Object.assign(m, { versao: v, data: hoje, autor });
    const txt = JSON.stringify(window.CATALOGO, null, 1);
    try {
      if (window.Pasta && Pasta.pronta) {
        await Pasta.escrever('catalogo/catalogo-drive-in.json', txt);
        await Pasta.escrever(`catalogo/versoes/catalogo_v${String(v).padStart(3, '0')}.json`, txt);
        msg(`Versão v${v} publicada na pasta ${Pasta.nome()}.`);
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = `catalogo_v${String(v).padStart(3, '0')}.json`; a.click();
        msg(`Versão v${v} gerada como download (sem pasta conectada): copie para catalogo/catalogo-drive-in.json na pasta da empresa.`);
      }
    } catch (e) { alert('Não foi possível gravar na pasta: ' + e.message); return; }
    alterado = false; estado(); if (window.recalcular) window.recalcular();
  }
  function estado() {
    const m = meta();
    $('cadVersao').innerHTML = `Catálogo <b>v${m.versao}</b> · ${m.data || ''} · ${m.autor || ''}${(m.historico || []).length ? ` · <a href="#" id="cadHist">histórico</a>` : ''}${liberado ? ' · <b style="color:#b45309">edição liberada</b>' : ''}${alterado ? ' · <b style="color:#b91c1c">alterações não publicadas</b>' : ''}`;
    const h = $('cadHist'); if (h) h.addEventListener('click', (e) => { e.preventDefault(); alert((m.historico || []).slice().reverse().map((x) => `v${x.versao} – ${x.data} – ${x.autor}: ${x.descricao}`).join('\n')); });
    for (const id of ['cadNovo', 'cadSalvar', 'cadRestaurar', 'cadImportarLbl']) { const el = $(id); if (el) el.classList.toggle('hidden', !liberado); }
    $('cadDesbloquear').classList.toggle('hidden', liberado);
    $('cadTabela').querySelectorAll('input,button.mini').forEach((el) => { el.disabled = !liberado; });
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
    $('cadTabela').querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => { const i = Number(inp.closest('tr').dataset.i); rows[i][inp.dataset.k] = inp.type === 'number' ? (inp.value === '' ? '' : Number(inp.value)) : inp.value; alterado = true; }));
    if ($('cadVersao')) estado();
    $('cadTabela').querySelectorAll('button[data-del]').forEach((b) => b.addEventListener('click', () => { rows.splice(Number(b.dataset.del), 1); TABELAS[atual].gravar(window.CATALOGO, rows); renderTabela(); }));
  }
  function exportarCsv() {
    const T = TABELAS[atual];
    const txt = [T.cols.map((c) => c[1]).join(';')].concat(rows.map((r) => T.cols.map((c) => `"${String(r[c[0]] ?? '').replace(/"/g, '""')}"`).join(';'))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv' })); a.download = `cadastro-${atual}.csv`; a.click();
  }
  function init() {
    $('cadAbas').innerHTML = Object.entries(TABELAS).map(([k, t]) => `<div class="tab ${k === atual ? 'active' : ''}" data-cad="${k}">${t.titulo}</div>`).join('');
    $('cadAbas').querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { atual = t.dataset.cad; $('cadAbas').querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t)); renderTabela(); }));
    $('cadBusca').addEventListener('input', renderTabela);
    $('cadNovo').addEventListener('click', () => { rows.push({}); TABELAS[atual].gravar(window.CATALOGO, rows); renderTabela(); $('cadTabela').scrollTop = 1e9; });
    $('cadSalvar').addEventListener('click', () => { TABELAS[atual].gravar(window.CATALOGO, rows); alterado = true; estado(); msg('Alterações aplicadas nesta tela (o configurador já usa). Publique uma nova versão para gravar na pasta.'); if (window.recalcular) window.recalcular(); });
    $('cadDesbloquear').addEventListener('click', desbloquear);
    $('cadPublicar').addEventListener('click', () => { if (!liberado) { alert('Desbloqueie a edição (senha) para publicar.'); return; } publicar(); });
    $('cadCsv').addEventListener('click', exportarCsv);
    $('cadJson').addEventListener('click', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(window.CATALOGO, null, 1)], { type: 'application/json' })); a.download = 'catalogo-drive-in.json'; a.click(); });
    $('cadImportar').addEventListener('change', (ev) => { const f = ev.target.files[0]; if (!f) return; f.text().then((t) => { try { const m0 = meta(), novo = JSON.parse(t); substituir(novo); window.CATALOGO.meta = m0; alterado = true; renderTabela(); estado(); $('cadMsg').textContent = 'Catálogo importado (mantida a versão/senha atuais). Publique para gravar na pasta.'; if (window.recalcular) window.recalcular(); } catch (e) { $('cadMsg').textContent = 'Arquivo inválido.'; } }); });
    $('cadRestaurar').addEventListener('click', () => { if (!confirm('Descartar todas as edições e voltar ao catálogo padrão?')) return; const m0 = meta(); substituir(PADRAO); window.CATALOGO.meta = m0; alterado = true; renderTabela(); estado(); $('cadMsg').textContent = 'Valores do catálogo base restaurados (não publicado).'; if (window.recalcular) window.recalcular(); });
    renderTabela(); estado();
  }
  window.Cadastro = { init, carregarDaPasta };
})();
