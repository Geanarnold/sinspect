// Interface do configurador Drive-In (protótipo). Cálculo em engine.js, dados em catalogo.js.
(function () {
  'use strict';
  const cat = window.CATALOGO;
  const $ = (id) => document.getElementById(id);
  const IDS = ['coluna', 'espessura', 'ruas', 'paletesPorRua', 'niveis', 'espacamentos', 'largura', 'larguraRua', 'cargaPalete', 'alturaPalete', 'alt1Nivel', 'alturaManual'];
  const fmt = (v, d = 1) => v == null ? '–' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt0 = (v) => v == null ? '–' : Number(v).toLocaleString('pt-BR');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let last = null;

  function entradas() {
    const o = {};
    for (const id of IDS) { const v = $(id).value; o[id] = v === '' ? null : v; }
    return o;
  }

  function kpi(label, value, sub) {
    return `<div class="kpi"><div class="l">${label}</div><div class="v">${value}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
  }

  function render() {
    const inp = entradas();
    const r = Engine.calcular(inp, cat);
    last = r;
    const d = r.dimensoes;
    $('kpis').innerHTML = [
      kpi('Posições de palete', fmt0(r.posicoes), `${inp.ruas} ruas × ${inp.paletesPorRua} paletes × ${inp.niveis} níveis`),
      kpi('Altura', `${fmt0(d.altura)} mm`, d.emendas ? `com emenda (8500 + ${d.altura - 8500})` : 'peça única'),
      kpi('Largura', `${fmt0(d.largura)} mm`, `${d.laterais} laterais`),
      kpi('Profundidade', `${fmt0(d.profundidade)} mm`, `${inp.espacamentos} × ${inp.largura} + 100 (a confirmar)`),
      kpi('Peso (itens levantados)', `${fmt(r.pesoTotal, 1)} kg`, 'sem braços, LG-UE, vigas, protetores'),
      kpi('kg / posição', fmt(r.kgPorPosicao, 2), `${d.colunas} colunas`),
    ].join('');

    $('alertas').innerHTML = r.alertas.length ? `<div class="alerta"><b>Atenção</b><ul>${r.alertas.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '';

    renderPecas(r); renderDesenho(r); renderPend(r);
  }

  function renderPecas(r) {
    const grupos = [...new Set(r.pecas.map((p) => p.grupo))];
    let html = `<table><thead><tr><th>Código</th><th>Descrição</th><th class="num">Qtd</th><th class="num">Compr. (mm)</th><th class="num">Peso unit. (kg)</th><th class="num">Peso total (kg)</th><th>Obs.</th></tr></thead><tbody>`;
    for (const g of grupos) {
      const ps = r.pecas.filter((p) => p.grupo === g);
      const sub = ps.reduce((s, p) => s + (p.pesoTotal || 0), 0);
      html += `<tr class="grp"><td colspan="5">${esc(g)}</td><td class="num">${fmt(sub)}</td><td></td></tr>`;
      for (const p of ps) {
        const semcod = !p.codigo || /XXXX/.test(p.codigo);
        html += `<tr><td><span class="code ${semcod ? 'semcod' : ''}">${esc(p.codigo || Engine.SEM.SA)}</span></td><td>${esc(p.desc)}</td><td class="num">${fmt0(p.qtd)}</td><td class="num">${p.compr == null ? '' : fmt(p.compr)}</td><td class="num">${p.pesoUnit == null ? '' : fmt(p.pesoUnit, 3)}</td><td class="num">${p.pesoTotal == null ? '' : fmt(p.pesoTotal)}</td><td class="obs">${esc(p.obs)}</td></tr>`;
      }
    }
    html += `<tr class="grp"><td colspan="5">TOTAL (itens levantados)</td><td class="num">${fmt(r.pesoTotal)}</td><td></td></tr></tbody></table>`;
    $('tab-pecas').innerHTML = html;
  }

  // ---- desenho (SVG): vista lateral de um pórtico, vista frontal e planta
  function svgLateral(r) {
    const { A, ys } = r.lateral, H = r.dimensoes.altura, n = Number(r.entradas.espacamentos), col = r.entradas.coluna;
    const W = n * A + col, s = 420 / Math.max(H, W), pad = 30, w = W * s + 2 * pad, h = H * s + 2 * pad;
    const X = (x) => pad + x * s, Y = (y) => pad + (H - y) * s;
    const cw = Math.max(col * s, 2);
    let g = '';
    for (let i = 0; i <= n; i++) g += `<rect x="${X(i * A + col / 2) - cw / 2}" y="${Y(H)}" width="${cw}" height="${H * s}" fill="#6b7280"/>`;
    for (let i = 0; i < n; i++) {
      const x0 = X(i * A + col / 2) + cw / 2, x1 = X((i + 1) * A + col / 2) - cw / 2;
      ys.forEach((y) => { g += `<line x1="${x0}" y1="${Y(y)}" x2="${x1}" y2="${Y(y)}" stroke="#E8520A" stroke-width="2"/>`; });
      for (let k = 0; k < r.lateral.nD; k++) g += `<line x1="${x0}" y1="${Y(ys[k])}" x2="${x1}" y2="${Y(ys[k + 1])}" stroke="#2563eb" stroke-width="1.5"/>`;
    }
    if (r.dimensoes.emendas) g += `<line x1="${X(0) - 8}" y1="${Y(8500)}" x2="${X(W) + 8}" y2="${Y(8500)}" stroke="#dc2626" stroke-dasharray="4 3"/><text x="${X(W) + 10}" y="${Y(8500) + 4}" font-size="10" fill="#dc2626">emenda 8500</text>`;
    g += `<line x1="${X(0)}" y1="${h - 10}" x2="${X(W)}" y2="${h - 10}" stroke="#111"/><text x="${X(W / 2)}" y="${h - 2}" font-size="10" text-anchor="middle">${n} × ${A} mm (passo entre colunas) + coluna ${col}</text>`;
    g += `<line x1="${w - 10}" y1="${Y(0)}" x2="${w - 10}" y2="${Y(H)}" stroke="#111"/><text x="${w - 2}" y="${Y(H / 2)}" font-size="10" text-anchor="middle" transform="rotate(90 ${w - 2} ${Y(H / 2)})">${H} mm</text>`;
    return `<svg viewBox="0 0 ${w + 20} ${h + 10}">${g}</svg>`;
  }
  function svgFrontal(r) {
    const R = Number(r.entradas.ruas), col = r.entradas.coluna, H = r.dimensoes.altura, N = Number(r.entradas.niveis), Wt = r.dimensoes.largura;
    const s = 420 / Math.max(H, Wt), pad = 30, w = Wt * s + 2 * pad, h = H * s + 2 * pad;
    const X = (x) => pad + x * s, Y = (y) => pad + (H - y) * s;
    let g = '';
    for (let i = 0; i <= R; i++) g += `<rect x="${X(i * (1400 + col))}" y="${Y(H)}" width="${Math.max(col * s, 2)}" height="${H * s}" fill="#6b7280"/>`;
    const y1 = Number(r.entradas.alt1Nivel), hp = Number(r.entradas.alturaPalete);
    for (let i = 0; i < R; i++) for (let k = 0; k < N - 1; k++) { const y = y1 + k * (hp + 200); g += `<rect x="${X(i * (1400 + col) + col)}" y="${Y(y)}" width="${1400 * s}" height="3" fill="#E8520A"/>`; }
    g += `<text x="${w / 2}" y="${h - 2}" font-size="10" text-anchor="middle">${Wt} mm (${R} ruas × 1400 + ${R + 1} colunas × ${col})</text>`;
    return `<svg viewBox="0 0 ${w} ${h + 10}" >${g}</svg>`;
  }
  function svgPlanta(r) {
    const R = Number(r.entradas.ruas), col = r.entradas.coluna, n = Number(r.entradas.espacamentos), A = r.lateral.A, Wt = r.dimensoes.largura, D = r.dimensoes.profundidade;
    const s = 420 / Math.max(D, Wt), pad = 30, w = Wt * s + 2 * pad, h = D * s + 2 * pad;
    const X = (x) => pad + x * s, Y = (y) => pad + y * s;
    let g = `<rect x="${X(0)}" y="${Y(0)}" width="${Wt * s}" height="${D * s}" fill="none" stroke="#9ca3af" stroke-dasharray="3 3"/>`;
    for (let i = 0; i <= R; i++) for (let j = 0; j <= n; j++) g += `<rect x="${X(i * (1400 + col))}" y="${Y(50 + j * A)}" width="${Math.max(col * s, 3)}" height="${Math.max(col * s, 3)}" fill="#111"/>`;
    for (let i = 0; i < R; i++) g += `<text x="${X(i * (1400 + col) + col + 700)}" y="${Y(D / 2)}" font-size="10" text-anchor="middle" fill="#E8520A">rua ${i + 1}</text>`;
    g += `<text x="${w / 2}" y="${h - 2}" font-size="10" text-anchor="middle">${Wt} × ${D} mm</text>`;
    return `<svg viewBox="0 0 ${w} ${h + 10}" >${g}</svg>`;
  }
  function renderDesenho(r) {
    $('tab-desenho').innerHTML = `<div class="vistas">
      <div><h3>Vista lateral (1 pórtico)</h3><div class="s">${r.lateral.nH} horizontais (laranja) e ${r.lateral.nD} diagonais (azul) por vão · ${r.lateral.tubosPorVao} tubos complemento por vão</div>${svgLateral(r)}</div>
      <div><h3>Vista frontal</h3><div class="s">níveis a partir de ${r.entradas.alt1Nivel} mm, passo ${Number(r.entradas.alturaPalete) + 200} mm (braços ainda não levantados)</div>${svgFrontal(r)}</div>
      <div><h3>Planta</h3><div class="s">colunas em preto; vigas túnel e contraventamentos não levantados</div>${svgPlanta(r)}</div>
    </div><p class="nota">Esquemático. O DXF com cotas e carimbo é uma fase posterior.</p>`;
  }

  function renderPend(r) {
    $('tab-pend').innerHTML = `<h3>Pendências</h3><ul>${r.pendencias.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      <h3 style="margin-top:16px">Regras aplicadas neste cálculo</h3><ul>
      <li>Altura = 1º nível + (níveis − 2) × (altura do palete + 200) + 1400, em múltiplos de 50 mm; máximo 8500 mm por peça, uma emenda por estrutura (2 talas SA040045 + 16 INT0648 + 16 INT0650 + 32 INT0812).</li>
      <li>Laterais = ruas + 1 <b>[a confirmar]</b>; colunas por lateral = espaçamentos + 1; profundidade = espaçamentos × largura da lateral + 100 <b>[a confirmar]</b>.</li>
      <li>Travessas horizontais: 1ª a 100 mm, 3 vãos de 600 mm, depois 900 mm, última no topo; comprimento total = largura − 78,6 mm; diagonal = √((largura − 109,1)² + vão²) + 30,5 mm; vão de topo sem diagonal.</li>
      <li>SA de travessa/diagonal: item do cadastro com comprimento total a ±3 mm; senão <span class="code semcod">SA04XXXX</span>. Tubo complemento = 2 − diagonais que chegam ao nó. Parafuso por travessa: 2 (+2 porcas); diagonais sem fixador próprio.</li>
      <li>Sapata por coluna: base + perfil U + 2 placas niveladoras + 4 chumbadores INT0654 + 4 INT0648 + 4 INT0650 + 8 INT0812. Peso da sapata = planilha (1,25 / 1,30 / 1,35 kg).</li>
      <li>Pesos: coluna = sliter × espessura × 7,85e-6 (sem descontar furos); travessa/diagonal = 0,879 kg/m (sliter 80 × 1,4). Fixadores sem peso; sem acréscimo de 8%.</li>
      </ul>`;
  }

  function csv() {
    if (!last) return;
    const rows = [['Grupo', 'Código', 'Descrição', 'Qtd', 'Comprimento (mm)', 'Peso unit (kg)', 'Peso total (kg)', 'Obs']];
    for (const p of last.pecas) rows.push([p.grupo, p.codigo || Engine.SEM.SA, p.desc, p.qtd, p.compr ?? '', p.pesoUnit ?? '', p.pesoTotal == null ? '' : p.pesoTotal.toFixed(3), p.obs]);
    const txt = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv' })); a.download = `lista-pecas-${($('projeto').value || 'drive-in').replace(/[^\w-]+/g, '_')}.csv`; a.click();
  }

  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
    ['pecas', 'desenho', 'pend'].forEach((k) => $('tab-' + k).classList.toggle('hidden', k !== t.dataset.tab));
  }));
  IDS.forEach((id) => $(id).addEventListener('input', render));
  $('btnCsv').addEventListener('click', csv);
  $('btnPrint').addEventListener('click', () => window.print());
  $('catVersao').textContent = cat.versao;
  render();
})();
