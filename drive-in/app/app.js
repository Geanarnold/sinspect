// Interface do configurador Drive-In (protótipo). Cálculo em engine.js, dados em catalogo.js.
(function () {
  'use strict';
  const cat = window.CATALOGO;
  const $ = (id) => document.getElementById(id);
  const IDS = ['coluna', 'espessura', 'ruas', 'profPalete', 'paletesInformados', 'balancoBaixo', 'balancoAlto', 'cA', 'cB', 'cC', 'cD', 'niveis', 'espacamentos', 'largura', 'frentePalete', 'cargaPalete', 'alturaPalete', 'alt1Nivel', 'alturaManual'];
  const fmt = (v, d = 1) => v == null ? '–' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt0 = (v) => v == null ? '–' : Number(v).toLocaleString('pt-BR');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let last = null;

  function entradas() {
    const o = {};
    for (const id of IDS) { const v = $(id).value; o[id] = v === '' ? null : v; }
    const n = Math.max(1, Math.min(30, Number(o.espacamentos) || 1));
    o.espacamentos = n;
    o.espacos = $('diferentes').checked ? [...$('espacos').querySelectorAll('input')].map((i) => Number(i.value) || Number(o.largura)) : Array(n).fill(Number(o.largura));
    return o;
  }
  function montarEspacos() {
    const n = Math.max(1, Math.min(30, Number($('espacamentos').value) || 1)), box = $('espacos');
    const atuais = [...box.querySelectorAll('input')].map((i) => i.value);
    box.innerHTML = Array.from({ length: n }, (_, i) => `<div><label>A${i + 1}</label><input type="number" step="1" value="${atuais[i] || $('largura').value}"/></div>`).join('');
    box.querySelectorAll('input').forEach((i) => i.addEventListener('input', render));
    box.classList.toggle('hidden', !$('diferentes').checked);
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
      kpi('Posições de palete', fmt0(r.posicoes), `${inp.ruas} ruas × ${r.paletesPorRua} paletes × ${inp.niveis} níveis · ${r.paletesPorRua} × ${r.ocupPalete} = ${r.paletesPorRua * r.ocupPalete} mm (sobra ${fmt0(r.sobraProfundidade)})`),
      kpi('Altura', `${fmt0(d.altura)} mm`, d.emendas ? `com emenda (8500 + ${d.altura - 8500})` : 'peça única'),
      kpi('Largura', `${fmt0(d.largura)} mm`, `${d.laterais} laterais`),
      kpi('Profundidade', `${fmt0(d.profundidade)} mm`, `Σ A1..A${inp.espacamentos} (medidas externas)`),
      kpi('Peso (itens levantados)', `${fmt(r.pesoTotal, 1)} kg`, 'sem longarina de fundo, LG-UE, zigzag; caneleira e LG topo provisórios'),
      kpi('kg / posição', fmt(r.kgPorPosicao, 2), `${d.colunas} colunas`),
    ].join('');

    $('alertas').innerHTML = (r.erros.length ? `<div class="erro"><b>Erro</b><ul>${r.erros.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '') + (r.alertas.length ? `<div class="alerta"><b>Atenção</b><ul>${r.alertas.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '');

    const L = r.lateral;
    $('notaQuadros').textContent = `${L.quadros} quadro(s) de 2 colunas${L.solteira ? ' + 1 coluna solteira com travessa união (nº par de espaços)' : ''} · ${L.nH} horizontais e ${L.nD} diagonais por quadro.`;
    renderVista(r);
    if (!$('bom').classList.contains('hidden')) { renderPecas(r); renderPend(r); }
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
    const { ys, espacos, solteira } = r.lateral, H = r.dimensoes.altura, n = espacos.length, col = r.entradas.coluna;
    const xs = [0]; espacos.forEach((a) => xs.push(xs[xs.length - 1] + a));
    const W = xs[n] + col, s = 420 / Math.max(H, W), pad = 34, w = W * s + 2 * pad, h = H * s + 2 * pad + 40;
    const X = (x) => pad + x * s, Y = (y) => pad + 32 + (H - y) * s;
    const cw = Math.max(col * s, 2);
    let g = '';
    xs.forEach((x) => { g += `<rect x="${X(x + col / 2) - cw / 2}" y="${Y(H)}" width="${cw}" height="${H * s}" fill="#6b7280"/>`; });
    for (let i = 0; i < n; i++) {
      const x0 = X(xs[i] + col / 2) + cw / 2, x1 = X(xs[i + 1] + col / 2) - cw / 2;
      const uniao = solteira && i === 0, quadro = solteira ? i % 2 === 1 : i % 2 === 0;
      if (quadro || uniao) ys.forEach((y) => { g += `<line x1="${x0}" y1="${Y(y)}" x2="${x1}" y2="${Y(y)}" stroke="${uniao ? '#059669' : '#E8520A'}" stroke-width="2"/>`; });
      if (quadro) for (let k = 0; k < r.lateral.nD; k++) g += `<line x1="${x0}" y1="${Y(ys[k])}" x2="${x1}" y2="${Y(ys[k + 1])}" stroke="#2563eb" stroke-width="1.5"/>`;
      g += `<line x1="${x0}" y1="${Y(H)}" x2="${x1}" y2="${Y(H)}" stroke="#374151" stroke-width="3"/>`; // elemento de topo em todos os passos
      const yc = Y(H) - 10 - (i % 2) * 11;
      g += `<line x1="${X(xs[i] + col / 2)}" y1="${yc}" x2="${X(xs[i + 1] + col / 2)}" y2="${yc}" stroke="#111"/><text x="${X((xs[i] + xs[i + 1]) / 2 + col / 2)}" y="${yc - 2}" font-size="8" text-anchor="middle">A${i + 1}=${espacos[i]}</text>`;
    }
    if (r.dimensoes.emendas) g += `<line x1="${X(0) - 8}" y1="${Y(8500)}" x2="${X(W) + 8}" y2="${Y(8500)}" stroke="#dc2626" stroke-dasharray="4 3"/><text x="${X(W) + 10}" y="${Y(8500) + 4}" font-size="10" fill="#dc2626">emenda 8500</text>`;
    g += `<line x1="${X(col / 2)}" y1="${h - 10}" x2="${X(xs[n] + col / 2)}" y2="${h - 10}" stroke="#111"/><text x="${X(W / 2)}" y="${h - 1}" font-size="10" text-anchor="middle">A = ${xs[n]} mm (eixo a eixo)</text>`;
    g += `<line x1="${w - 10}" y1="${Y(0)}" x2="${w - 10}" y2="${Y(H)}" stroke="#111"/><text x="${w - 2}" y="${Y(H / 2)}" font-size="10" text-anchor="middle" transform="rotate(90 ${w - 2} ${Y(H / 2)})">B = ${H} mm</text>`;
    g += `<line x1="${X(col / 2) - 14}" y1="${Y(ys[0])}" x2="${X(col / 2) - 14}" y2="${Y(ys[1])}" stroke="#111"/><text x="${X(col / 2) - 17}" y="${Y((ys[0] + ys[1]) / 2)}" font-size="9" text-anchor="end">C = ${ys[1] - ys[0]}</text>`;
    return `<svg viewBox="0 0 ${w + 20} ${h + 6}">${g}</svg>`;
  }
  function svgFrontal(r) {
    const R = Number(r.entradas.ruas), col = r.entradas.coluna, H = r.dimensoes.altura, N = Number(r.entradas.niveis), Wt = r.dimensoes.largura;
    const s = 420 / Math.max(H, Wt), pad = 30, w = Wt * s + 2 * pad, h = H * s + 2 * pad;
    const X = (x) => pad + x * s, Y = (y) => pad + (H - y) * s;
    let g = '';
    for (let i = 0; i <= R; i++) g += `<rect x="${X(i * (r.frontal.larguraRua + col))}" y="${Y(H)}" width="${Math.max(col * s, 2)}" height="${H * s}" fill="#6b7280"/>`;
    const y1 = Number(r.entradas.alt1Nivel), hp = Number(r.entradas.alturaPalete);
    for (let i = 0; i < R; i++) for (let k = 0; k < N - 1; k++) { const y = y1 + k * (hp + 200); g += `<rect x="${X(i * (r.frontal.larguraRua + col) + col)}" y="${Y(y)}" width="${r.frontal.larguraRua * s}" height="3" fill="#E8520A"/>`; }
    g += `<text x="${w / 2}" y="${h - 2}" font-size="10" text-anchor="middle">${Wt} mm (${R} ruas × ${r.frontal.larguraRua} + ${R + 1} colunas × ${col})</text>`;
    return `<svg viewBox="0 0 ${w} ${h + 10}" >${g}</svg>`;
  }
  function svgPlanta(r) {
    const R = Number(r.entradas.ruas), col = r.entradas.coluna, espacos = r.lateral.espacos, Wt = r.dimensoes.largura, D = r.dimensoes.profundidade;
    const ysc = [0]; espacos.forEach((a) => ysc.push(ysc[ysc.length - 1] + a));
    const s = 420 / Math.max(D, Wt), pad = 30, w = Wt * s + 2 * pad, h = D * s + 2 * pad;
    const X = (x) => pad + x * s, Y = (y) => pad + y * s;
    let g = `<rect x="${X(0)}" y="${Y(0)}" width="${Wt * s}" height="${D * s}" fill="none" stroke="#9ca3af" stroke-dasharray="3 3"/>`;
    for (let i = 0; i <= R; i++) ysc.forEach((yv) => { g += `<rect x="${X(i * (r.frontal.larguraRua + col))}" y="${Y(yv)}" width="${Math.max(col * s, 3)}" height="${Math.max(col * s, 3)}" fill="#111"/>`; });
    for (let i = 0; i < R; i++) g += `<text x="${X(i * (r.frontal.larguraRua + col) + col + 700)}" y="${Y(D / 2)}" font-size="10" text-anchor="middle" fill="#E8520A">rua ${i + 1}</text>`;
    g += `<text x="${w / 2}" y="${h - 2}" font-size="10" text-anchor="middle">${Wt} × ${D} mm</text>`;
    return `<svg viewBox="0 0 ${w} ${h + 10}" >${g}</svg>`;
  }
  const VISTAS = {
    lateral: (r) => ({ t: 'Vista lateral (corte) — desenho real', s: `${r.lateral.quadros} quadro(s) de 2 colunas${r.lateral.solteira ? ' + coluna solteira com travessa união' : ''} · ${r.lateral.nH} horizontais e ${r.lateral.nD} diagonais por quadro · é este desenho que o botão "Baixar DXF" exporta`, svg: (window.DXF && window.BLOCOS) ? DXF.svgLateral(r, `CORTE A - VISTA LATERAL - ${$('projeto').value || ''}`.trim()) : svgLateral(r) }),
    esquema: (r) => ({ t: 'Esquema', s: `${r.lateral.quadros} quadro(s)${r.lateral.solteira ? ' + coluna solteira (verde)' : ''} · horizontais (laranja), diagonais (azul), topo (cinza)`, svg: svgLateral(r) }),
    frontal: (r) => (window.DXF && window.BLOCOS) ? { t: 'Vista frontal — desenho real', s: `colunas, sapatas, caneleiras 700 mm, braços (simples nas colunas externas, duplo nas internas), longarina superior por rua${DXF.montarFrontal(r).faltam.length ? ' · blocos ainda não recebidos: ' + DXF.montarFrontal(r).faltam.join(', ') : ''}`, svg: DXF.svgFrontal(r, 'VISTA FRONTAL') } : ({ t: 'Vista frontal', s: `níveis a partir de ${r.entradas.alt1Nivel} mm, passo ${Number(r.entradas.alturaPalete) + 200} mm (braços ainda não levantados)`, svg: svgFrontal(r) }),
    planta: (r) => ({ t: 'Planta', s: 'colunas em preto; vigas túnel e contraventamentos não levantados', svg: svgPlanta(r) }),
  };
  let vistaAtual = 'lateral';
  function renderVista(r) {
    const v = VISTAS[vistaAtual](r);
    $('vista').innerHTML = `<h3>${v.t}</h3><div class="s">${v.s}</div>${v.svg}<p class="nota">Esquemático, atualizado conforme o preenchimento. O DXF com cotas e carimbo é uma fase posterior.</p>`;
  }
  function baixarPng() {
    const svg = $('vista').querySelector('svg'); if (!svg) return;
    const vb = svg.viewBox.baseVal, scale = 3;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = vb.width * scale; c.height = vb.height * scale;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `${vistaAtual}-${($('projeto').value || 'drive-in').replace(/[^\w-]+/g, '_')}.png`; a.click();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
  }

  function renderPend(r) {
    $('tab-pend').innerHTML = `<h3>Pendências</h3><ul>${r.pendencias.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      <h3 style="margin-top:16px">Regras aplicadas neste cálculo</h3><ul>
      <li>Altura = 1º nível + (níveis − 2) × (altura do palete + 200) + 1400, em múltiplos de 50 mm; máximo 8500 mm por peça, uma emenda por estrutura (2 talas SA040045 + 16 INT0648 + 16 INT0650 + 32 INT0812).</li>
      <li>Laterais = ruas + 1 <b>[a confirmar]</b>; colunas por lateral = espaçamentos + 1; A1..An são medidas face a face (externas): quadro = face externa a face externa; vão = vão livre; profundidade = Σ A.</li>
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

  document.querySelectorAll('.painel .tab').forEach((t) => t.addEventListener('click', () => {
    const grupo = t.closest('.painel');
    grupo.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
    if (VISTAS[t.dataset.tab]) { vistaAtual = t.dataset.tab; if (last) renderVista(last); }
    else ['pecas', 'pend'].forEach((k) => $('tab-' + k).classList.toggle('hidden', k !== t.dataset.tab));
  }));
  const PASSOS = ['projeto', 'estrutura', 'lateral', 'braco'];
  let passo = 0;
  function mostrarPasso(i) {
    passo = Math.max(0, Math.min(PASSOS.length - 1, i));
    PASSOS.forEach((p, k) => { $('passo-' + p).classList.toggle('hidden', k !== passo); });
    document.querySelectorAll('.passo').forEach((el, k) => { el.classList.toggle('active', k === passo); el.classList.toggle('feito', k < passo); });
    $('btnVoltar').disabled = passo === 0;
    $('btnAvancar').classList.toggle('hidden', passo === PASSOS.length - 1);
    $('btnBom').classList.toggle('hidden', passo !== PASSOS.length - 1);
  }
  document.querySelectorAll('.passo').forEach((el, k) => el.addEventListener('click', () => mostrarPasso(k)));
  $('btnVoltar').addEventListener('click', () => mostrarPasso(passo - 1));
  $('btnAvancar').addEventListener('click', () => mostrarPasso(passo + 1));
  $('btnBom').addEventListener('click', () => { $('bom').classList.remove('hidden'); render(); $('bom').scrollIntoView({ behavior: 'smooth' }); });
  $('btnPng').addEventListener('click', baixarPng);
  $('btnDxf').addEventListener('click', () => {
    if (!last) return;
    const nome = ($('projeto').value || 'drive-in').replace(/[^\w-]+/g, '_');
    const txt = DXF.dxfCompleto(last, $('projeto').value || '');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/dxf' })); a.download = `vista-lateral-${nome}.dxf`; a.click();
  });
  mostrarPasso(0);
  IDS.forEach((id) => $(id).addEventListener('input', render));
  $('espacamentos').addEventListener('input', montarEspacos);
  $('largura').addEventListener('input', () => { if (!$('diferentes').checked) montarEspacos(); });
  $('diferentes').addEventListener('change', () => { montarEspacos(); render(); });
  montarEspacos();
  $('btnCsv').addEventListener('click', csv);
  $('btnPrint').addEventListener('click', () => window.print());
  $('catVersao').textContent = cat.versao;
  window.recalcular = () => { $('catVersao').textContent = cat.versao; render(); };
  const mostrarPagina = (cad) => { $('paginaConfig').classList.toggle('hidden', cad); $('paginaCad').classList.toggle('hidden', !cad); $('navConfig').classList.toggle('active', !cad); $('navCad').classList.toggle('active', cad); };
  $('navConfig').addEventListener('click', (e) => { e.preventDefault(); mostrarPagina(false); });
  $('navCad').addEventListener('click', (e) => { e.preventDefault(); mostrarPagina(true); });
  if (window.Cadastro) Cadastro.init();
  render();
})();
