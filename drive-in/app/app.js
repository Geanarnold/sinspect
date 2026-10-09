// Interface do configurador Drive-In (protótipo). Cálculo em engine.js, dados em catalogo.js.
(function () {
  'use strict';
  const cat = window.CATALOGO;
  const $ = (id) => document.getElementById(id);
  const IDS = ['coluna', 'espessura', 'ruas', 'profPalete', 'paletesInformados', 'balancoBaixo', 'balancoAlto', 'cA', 'cB', 'cC', 'cD', 'uA', 'uB', 'uE', 'pesoStop', 'peDireito', 'niveis', 'espacamentos', 'largura', 'frentePalete', 'cargaPalete', 'alturaPalete', 'alt1Nivel', 'alturaManual'];
  const fmt = (v, d = 1) => v == null ? '–' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt0 = (v) => v == null ? '–' : Number(v).toLocaleString('pt-BR');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let last = null;

  // ---- projeto com vários cortes: cada corte guarda os valores do formulário; o formulário edita o corte selecionado
  const CHAVE = 'drivein_projeto_v1';
  let proj = null;
  try { proj = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { proj = null; }
  if (!proj || !Array.isArray(proj.cortes) || !proj.cortes.length) proj = { atual: 0, cortes: [{ nome: '', qtd: '', dados: null }] };
  // preenchimento (Gean): dados do projeto começam vazios e são obrigatórios; só os padrões da empresa vêm preenchidos (marcados "padrão")
  const OBRIG_CALC = ['coluna', 'espessura', 'ruas', 'niveis', 'frentePalete', 'profPalete', 'alturaPalete', 'cargaPalete', 'espacamentos', 'largura'];
  const OBRIG_CAB = ['projeto', 'cliente', 'cidade', 'uf', 'responsavel', 'nomeCorte', 'qtdCorte'];
  const PADRAO = { balancoBaixo: '180', balancoAlto: '230', cA: '94', cB: '15', cC: '40', cD: '1.8', uA: '100', uB: '38', uE: '1.8' };
  const vazioDados = (d) => !d || !d.v || OBRIG_CALC.some((id) => d.v[id] === '' || d.v[id] == null) || (d.diferentes && (d.espacos || []).some((x) => x === '' || x == null));
  // nomes de corte únicos no projeto (Gean): nome vazio ou repetido não é aceito; projetos antigos com repetição ganham sufixo -2, -3…
  const normCorte = (v) => String(v || '').trim().toUpperCase();
  function nomesUnicos(p) {
    const usados = new Set();
    for (const c of p.cortes) {
      if (!normCorte(c.nome)) { c.nome = ''; continue; } // nome em branco fica em branco (obrigatório, o campo acusa)
      let base = normCorte(c.nome), nome = base, k = 2;
      while (usados.has(nome)) nome = `${base}-${k++}`;
      c.nome = nome; usados.add(nome);
    }
  }
  nomesUnicos(proj);
  const nomeCorteLivre = (nome, i) => !!nome && !proj.cortes.some((c, j) => j !== i && c.nome === nome);
  const CAB = ['projeto', 'cliente', 'cidade', 'uf', 'representante', 'rt', 'revisao', 'responsavel', 'obs'];
  // nome do projeto (padrão SUPRA + número, ex. SUPRA263020): até 11 letras ou números, sem espaço nem caracteres especiais, em maiúsculas
  const limparProjeto = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 11);
  const salvar = () => { proj.cab = Object.fromEntries(CAB.map((k) => [k, $(k).value])); try { localStorage.setItem(CHAVE, JSON.stringify(proj)); } catch (e) { /* navegador sem armazenamento */ } };
  function carregarProjeto(p) {
    if (!p || !Array.isArray(p.cortes) || !p.cortes.length) throw new Error('arquivo sem cortes');
    proj = p; nomesUnicos(proj); proj.atual = Math.min(Math.max(0, p.atual || 0), p.cortes.length - 1);
    for (const k of CAB) if (p.cab && p.cab[k] != null) $(k).value = k === 'projeto' ? limparProjeto(p.cab[k]) : p.cab[k];
    selecionarCorte(proj.atual);
  }
  function lerForm() {
    const v = {}; for (const id of IDS) v[id] = $(id).value;
    return { v, escravo: $('escravo').checked, diferentes: $('diferentes').checked, espacos: [...$('espacos').querySelectorAll('input')].map((i) => i.value) };
  }
  function limparForm() {
    for (const id of IDS) $(id).value = PADRAO[id] ?? '';
    $('escravo').checked = false; $('diferentes').checked = false;
    montarEspacos([]);
  }
  function aplicarForm(d) {
    if (!d) { limparForm(); return; }
    for (const id of IDS) if (d.v && d.v[id] !== undefined) $(id).value = d.v[id];
    $('escravo').checked = !!d.escravo; $('diferentes').checked = !!d.diferentes;
    montarEspacos(d.espacos);
  }
  function entradasDe(d) {
    const o = {};
    for (const id of IDS) { const v = d.v[id]; o[id] = v === '' || v == null ? null : v; }
    o.escravo = !!d.escravo;
    const n = Math.max(1, Math.min(30, Number(o.espacamentos) || 1));
    o.espacamentos = n;
    o.espacos = d.diferentes ? Array.from({ length: n }, (_, i) => Number(d.espacos[i]) || Number(o.largura)) : Array(n).fill(Number(o.largura));
    return o;
  }
  const entradas = () => entradasDe(lerForm());
  function montarEspacos(valores) {
    const n = Math.max(1, Math.min(30, Number($('espacamentos').value) || 1)), box = $('espacos');
    const atuais = valores || [...box.querySelectorAll('input')].map((i) => i.value);
    box.innerHTML = Array.from({ length: n }, (_, i) => `<div><label>A${i + 1}</label><input type="number" step="1" value="${atuais[i] || $('largura').value}"/></div>`).join('');
    box.querySelectorAll('input').forEach((i) => i.addEventListener('input', render));
    box.classList.toggle('hidden', !$('diferentes').checked);
  }

  const ic = (k) => `<svg class="ic"><use href="#i-${k}"/></svg>`;
  function kpi(icone, label, value, sub) {
    return `<div class="kpi"><div class="l">${ic(icone)}${label}</div><div class="v">${value}</div>${sub ? `<div class="s" title="${esc(sub)}">${sub}</div>` : ''}</div>`;
  }


  // ---- croqui técnico do braço com as medidas digitadas (mesma geometria do bloco do DXF)
  // seção A-A do perfil C com raios de dobra (ri = 1,15·D, como no desenho da tala; re = ri + D) e hachura de corte; vista frontal com linhas de centro
  function croquiBraco(r) {
    const el = $('croquiBraco'); if (!el || !window.DXF) return;
    const pf = r.frontal.perfilC, col = r.dimensoes.colW || Number(r.entradas.coluna), bal = r.frontal.balBaixo, esp = r.frontal.espU;
    const n = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    const LG = '#111827', LF = '#374151', CT = '#1d4ed8';
    const f1 = (v) => (+v).toFixed(2);
    // cota linear (pontos em px): (ox, oy) = deslocamento da linha de cota para fora da peça; extensões com afastamento; texto do lado de fora
    function cota(x1, y1, x2, y2, ox, oy, txt) {
      const L = Math.hypot(ox, oy) || 1, nx = ox / L, ny = oy / L, g = 2, e = 3;
      const a1 = [x1 + ox, y1 + oy], a2 = [x2 + ox, y2 + oy];
      let s = `<g stroke="${LF}" stroke-width=".45" fill="none">`;
      s += `<line x1="${f1(x1 + nx * g)}" y1="${f1(y1 + ny * g)}" x2="${f1(a1[0] + nx * e)}" y2="${f1(a1[1] + ny * e)}"/><line x1="${f1(x2 + nx * g)}" y1="${f1(y2 + ny * g)}" x2="${f1(a2[0] + nx * e)}" y2="${f1(a2[1] + ny * e)}"/>`;
      s += `<line x1="${f1(a1[0])}" y1="${f1(a1[1])}" x2="${f1(a2[0])}" y2="${f1(a2[1])}" marker-start="url(#seta)" marker-end="url(#seta)"/></g>`;
      let ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      if (ang > 90) ang -= 180; if (ang <= -90) ang += 180; if (Math.abs(Math.abs(ang) - 90) < 1e-6) ang = -90;
      const th = ang * Math.PI / 180, up = [Math.sin(th), -Math.cos(th)], fora = up[0] * nx + up[1] * ny > 0;
      const mx = (a1[0] + a2[0]) / 2 + nx * 1.5, my = (a1[1] + a2[1]) / 2 + ny * 1.5;
      s += `<text x="${f1(mx)}" y="${f1(my)}" font-size="8.5" text-anchor="middle" fill="${LG}" transform="rotate(${f1(ang)} ${f1(mx)} ${f1(my)})" dy="${fora ? '-0.2em' : '1em'}">${txt}</text>`;
      return s;
    }
    const arc = (cx, cy, rr, a0, a1, out) => { for (let k = 1; k <= 8; k++) { const t = (a0 + (a1 - a0) * k / 8) * Math.PI / 180; out.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t)]); } };
    // ---------- SEÇÃO A-A (mm, origem no canto externo inferior esquerdo, y para cima; abertura para a direita)
    const A = pf.A, B = pf.B, C = pf.C, t = pf.D, ri = 1.15 * t, ro = ri + t;
    const ext = [[C, B], [C, ro]]; arc(C - ro, ro, ro, 0, -90, ext); ext.push([ro, 0]); arc(ro, ro, ro, -90, -180, ext); ext.push([0, A - ro]); arc(ro, A - ro, ro, 180, 90, ext);
    ext.push([C - ro, A]); arc(C - ro, A - ro, ro, 90, 0, ext); ext.push([C, A - B], [C - t, A - B], [C - t, A - ro]); arc(C - ro, A - ro, ri, 0, 90, ext);
    ext.push([ro, A - t]); arc(ro, A - ro, ri, 90, 180, ext); ext.push([t, ro]); arc(ro, ro, ri, 180, 270, ext); ext.push([C - ro, t]); arc(C - ro, ro, ri, 270, 360, ext); ext.push([C - t, B]);
    const sS = Math.min(165 / A, 120 / C), ox = 150 - C * Math.min(165 / A, 120 / C) / 2, oy = 215, SX = (x) => ox + x * sS, SY = (y) => oy - y * sS;
    const pathC = 'M' + ext.map(([x, y]) => `${f1(SX(x))} ${f1(SY(y))}`).join('L') + 'Z';
    let g1 = `<text x="150" y="16" text-anchor="middle" font-size="10" font-weight="700" fill="${LG}" letter-spacing=".5">SEÇÃO A-A</text>`;
    g1 += `<path d="${pathC}" fill="${LF}" stroke="${LG}" stroke-width=".8" stroke-linejoin="round"/>`; // seção fina: preenchimento cheio (ISO 128)
    g1 += cota(SX(0), SY(0), SX(0), SY(A), -18, 0, `${n(A)}`);
    g1 += cota(SX(0), SY(A), SX(C), SY(A), 0, -14, `${n(C)}`);
    g1 += cota(SX(C), SY(A), SX(C), SY(A - B), 14, 0, `${n(B)}`);
    g1 += cota(SX(C), SY(B), SX(C), SY(0), 14, 0, `${n(B)}`);
    // espessura e raio por chamada
    const pe = [SX(t / 2), SY(A / 2)], pr = [SX(ro - ro * Math.SQRT1_2), SY(ro - ro * Math.SQRT1_2)];
    g1 += `<g stroke="${LF}" stroke-width=".45" fill="none"><polyline points="${f1(pe[0])},${f1(pe[1])} ${f1(SX(C) + 6)},${f1(SY(A / 2) + 14)} ${f1(SX(C) + 34)},${f1(SY(A / 2) + 14)}"/><circle cx="${f1(pe[0])}" cy="${f1(pe[1])}" r="1.1" fill="${LF}"/>`;
    g1 += `<polyline points="${f1(pr[0])},${f1(pr[1])} ${f1(SX(C) + 6)},${f1(SY(0) + 14)} ${f1(SX(C) + 34)},${f1(SY(0) + 14)}"/><circle cx="${f1(pr[0])}" cy="${f1(pr[1])}" r="1.1" fill="${LF}"/></g>`;
    g1 += `<text x="${f1(SX(C) + 8)}" y="${f1(SY(A / 2) + 12)}" font-size="8.5" fill="${LG}">ch. ${n(t)}</text><text x="${f1(SX(C) + 8)}" y="${f1(SY(0) + 12)}" font-size="8.5" fill="${LG}">Ri ${n(ri)}</text>`;
    // ---------- VISTA FRONTAL (braço simples do 1º nível + coluna), mesma geometria do bloco do DXF
    const br = DXF.bracoParam(col, bal, 1, pf, esp), uo = col / 2 + esp, yc0 = (180 - A) / 2, yc1 = yc0 + A, tip = uo + bal;
    const xmin = -uo - 40, xmax = tip + 30, ymin = -55, ymax = 235;
    const sB = Math.min(270 / (xmax - xmin), 215 / (ymax - ymin)), bx = 150 - (xmax - xmin) * Math.min(270 / (xmax - xmin), 215 / (ymax - ymin)) / 2, FX = (x) => bx + (x - xmin) * sB, FY = (y) => 248 - (y - ymin) * sB;
    let g2 = `<text x="150" y="16" text-anchor="middle" font-size="10" font-weight="700" fill="${LG}" letter-spacing=".5">VISTA FRONTAL · BRAÇO SIMPLES 1º NÍVEL</text>`;
    // coluna (contorno fino) e eixo
    g2 += `<rect x="${f1(FX(-col / 2))}" y="${f1(FY(ymax - 25))}" width="${f1(col * sB)}" height="${f1((ymax - 25 + 14) * sB)}" fill="none" stroke="${LF}" stroke-width=".6"/>`;
    g2 += `<line x1="${f1(FX(0))}" y1="${f1(FY(198))}" x2="${f1(FX(0))}" y2="${f1(FY(-8))}" stroke="${CT}" stroke-width=".45" stroke-dasharray="10 2 2 2"/>`;
    // braço: contorno grosso; linhas de tangência das dobras finas; rasgos
    for (const q of br.prims) if (q.t === 'c') g2 += `<circle cx="${f1(FX(q.c[0]))}" cy="${f1(FY(q.c[1]))}" r="${f1(q.r * sB)}" fill="none" stroke="${LG}" stroke-width=".6"/>`;
    for (const q of br.prims) {
      if (q.t === 's' || !q.p) continue;
      const fino = q.p.length === 2 && Math.abs(q.p[0][1] - q.p[1][1]) < .01 && [yc0, yc1].every((y) => Math.abs(q.p[0][1] - y) > .01) && q.p[0][1] > yc0 && q.p[0][1] < yc1;
      g2 += `<polyline points="${q.p.map((v) => f1(FX(v[0])) + ',' + f1(FY(v[1]))).join(' ')}" fill="none" stroke="${LG}" stroke-width="${fino ? .5 : 1.1}" stroke-linejoin="round"/>`;
    }
    // linhas de centro dos rasgos
    const sx = (col - 40) / 2;
    for (const cy of [15, 165]) for (const cx of [-sx, sx]) g2 += `<g stroke="${CT}" stroke-width=".4"><line x1="${f1(FX(cx - 9))}" y1="${f1(FY(cy))}" x2="${f1(FX(cx + 9))}" y2="${f1(FY(cy))}"/><line x1="${f1(FX(cx))}" y1="${f1(FY(cy - 7))}" x2="${f1(FX(cx))}" y2="${f1(FY(cy + 7))}"/></g>`;
    // corte A-A no C
    const xa = uo + bal * .6;
    g2 += `<g stroke="${LG}" stroke-width=".8"><line x1="${f1(FX(xa))}" y1="${f1(FY(yc1 + 22))}" x2="${f1(FX(xa))}" y2="${f1(FY(yc0 - 22))}" stroke-dasharray="10 2 2 2" stroke-width=".5"/>`;
    for (const [y, d] of [[yc1 + 22, 1], [yc0 - 22, -1]]) g2 += `<line x1="${f1(FX(xa))}" y1="${f1(FY(y))}" x2="${f1(FX(xa) - 12)}" y2="${f1(FY(y))}" marker-end="url(#seta)"/><text x="${f1(FX(xa) + 4)}" y="${f1(FY(y) + (d > 0 ? -2 : 9))}" font-size="9" font-weight="700" fill="${LG}" stroke="none">A</text>`;
    g2 += `</g>`;
    // cotas
    g2 += cota(FX(uo), FY(yc0), FX(tip), FY(yc0), 0, FY(-32) - FY(yc0), `${n(bal)}`);
    g2 += cota(FX(-uo), FY(0), FX(uo), FY(0), 0, FY(-32) - FY(0), `${n(2 * uo)}`);
    g2 += cota(FX(-uo), FY(0), FX(-uo), FY(180), -18, 0, '180');
    g2 += cota(FX(tip), FY(yc0), FX(tip), FY(yc1), 16, 0, `${n(A)}`);
    g2 += cota(FX(-sx), FY(165), FX(sx), FY(165), 0, FY(205) - FY(165), `${n(2 * sx)}`);
    const defs = `<defs><marker id="seta" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 1.8L10 5L0 8.2z" fill="${LF}"/></marker></defs>`;
    const svg = (h, corpo, rod) => `<svg viewBox="0 0 300 ${h}" xmlns="http://www.w3.org/2000/svg" font-family="'Arial Narrow', 'Roboto Condensed', Arial, sans-serif">${defs}<rect x=".5" y=".5" width="299" height="${h - 1}" fill="#fff" stroke="#cbd5e1" stroke-width=".8"/>${corpo}${rod ? `<text x="294" y="${h - 5}" text-anchor="end" font-size="7.5" fill="#64748b">${rod}</text>` : ''}</svg>`;
    el.innerHTML = svg(240, g1, '') + svg(262, g2, `COL ${col} · suporte U chapa ${n(esp)} · medidas em mm`);
  }

  function renderCortes() {
    $('listaCortes').innerHTML = proj.cortes.map((c, i) => `<button class="chip-corte ${i === proj.atual ? 'active' : ''}" data-i="${i}">${esc(c.nome || '?')}${c.qtd > 1 ? ' ×' + c.qtd : ''}</button>`).join('');
    $('listaCortes').querySelectorAll('.chip-corte').forEach((b) => b.addEventListener('click', () => selecionarCorte(Number(b.dataset.i))));
    $('btnRemCorte').disabled = proj.cortes.length < 2;
  }
  function selecionarCorte(i) {
    proj.atual = i; const c = proj.cortes[i];
    $('nomeCorte').value = c.nome; $('qtdCorte').value = c.qtd;
    aplicarForm(c.dados); render();
  }
  // resultados de todos os cortes (o atual com o formulário na tela)
  function calcularProjeto() {
    // cortes com campos obrigatórios em branco ficam fora (a tela e os botões avisam)
    return proj.cortes.map((c, i) => ({ nome: c.nome, qtd: Math.max(1, Number(c.qtd) || 1), r: i === proj.atual ? last : vazioDados(c.dados) ? null : Engine.calcular(entradasDe(c.dados), cat) })).filter((x) => x.r);
  }
  function consolidar(lista) {
    const mapa = new Map();
    for (const { nome, qtd, r } of lista) for (const p of r.pecas) {
      const k = [p.grupo, p.codigo, p.desc, p.compr].join('|');
      const e = mapa.get(k) || { ...p, qtd: 0, pesoTotal: p.pesoUnit == null ? null : 0, cortes: [] };
      e.qtd += p.qtd * qtd; if (p.pesoUnit != null) e.pesoTotal += p.pesoUnit * p.qtd * qtd; e.cortes.push(nome);
      mapa.set(k, e);
    }
    return [...mapa.values()];
  }
  function render() {
    const c = proj.cortes[proj.atual];
    const nv = normCorte($('nomeCorte').value), livre = nomeCorteLivre(nv, proj.atual);
    if (livre) c.nome = nv; // nome repetido/vazio: o corte mantém o nome anterior até o operador corrigir
    $('nomeCorte').classList.toggle('invalido', !livre);
    $('erroCorte').textContent = livre ? '' : (nv ? `Já existe um corte "${nv}" neste projeto. Use outro nome.` : 'Informe o nome do corte.');
    $('erroCorte').classList.toggle('hidden', livre);
    c.dados = lerForm(); c.qtd = $('qtdCorte').value === '' ? '' : Math.max(1, Number($('qtdCorte').value) || 1);
    salvar(); renderCortes();
    // campos obrigatórios em branco: destaca, não calcula e trava as saídas
    const rotulo = (id) => { const l = document.querySelector(`label[for="${id}"]`); return l ? l.textContent.trim() : id; };
    const etapa = (id) => { const f = $(id).closest('.form'); const k = f ? ['projeto', 'estrutura', 'lateral', 'braco'].indexOf(f.id.replace('passo-', '')) : -1; return k >= 0 ? ['Projeto', 'Estrutura', 'Lateral', 'Braço'][k] : ''; };
    const vazio = (id) => String($(id).value).trim() === '';
    for (const id of OBRIG_CALC.concat(OBRIG_CAB)) $(id).classList.toggle('vazio', vazio(id));
    const espVazios = $('diferentes').checked ? [...$('espacos').querySelectorAll('input')].filter((i) => i.value === '') : [];
    $('espacos').querySelectorAll('input').forEach((i) => i.classList.toggle('vazio', $('diferentes').checked && i.value === ''));
    const faltaCalc = OBRIG_CALC.filter(vazio), faltaCab = OBRIG_CAB.filter(vazio).filter((id) => id !== 'nomeCorte' || !c.nome);
    const outrosIncompletos = proj.cortes.filter((x, i) => i !== proj.atual && (vazioDados(x.dados) || !x.nome || x.qtd === '')).map((x) => x.nome || '(sem nome)');
    const travar = (msg) => { for (const id of ['btnPng', 'btnDxfProj', 'btnCsv', 'btnPrint', 'btnEmitir']) { $(id).disabled = !!msg; $(id).title = msg || ''; } };
    if (faltaCalc.length || espVazios.length) {
      last = null;
      const porEtapa = {}; for (const id of faltaCalc) (porEtapa[etapa(id)] = porEtapa[etapa(id)] || []).push(rotulo(id));
      if (espVazios.length) (porEtapa.Lateral = porEtapa.Lateral || []).push(`medida de ${espVazios.length} espaço(s)`);
      $('kpis').innerHTML = `<div class="pendente-box"><b>Preencha os campos obrigatórios para calcular este corte</b><ul>${Object.entries(porEtapa).sort((x, y) => ['Projeto', 'Estrutura', 'Lateral', 'Braço'].indexOf(x[0]) - ['Projeto', 'Estrutura', 'Lateral', 'Braço'].indexOf(y[0])).map(([e, l]) => `<li><b style="display:inline">${esc(e)}:</b> ${l.map(esc).join(', ')}</li>`).join('')}</ul></div>`;
      const kp = document.getElementById('kpiProj'); if (kp) kp.innerHTML = '';
      $('alertas').innerHTML = ''; $('vista').innerHTML = '<p class="nota">O desenho aparece quando os campos obrigatórios estiverem preenchidos.</p>';
      $('notaQuadros').textContent = ''; if ($('croquiBraco')) $('croquiBraco').innerHTML = '';
      ['tab-pecas', 'tab-pend', 'tab-proj'].forEach((id) => { if ($(id)) $(id).innerHTML = ''; });
      travar('Preencha os campos obrigatórios (*)');
      return;
    }
    travar(faltaCab.length ? `Preencha: ${faltaCab.map(rotulo).join(', ')}` : outrosIncompletos.length ? `Corte(s) incompleto(s): ${outrosIncompletos.join(', ')}` : '');
    const inp = entradas();
    const r = Engine.calcular(inp, cat);
    last = r;
    const d = r.dimensoes;
    $('kpis').innerHTML = [
      kpi('pallet', 'Posições', fmt0(r.posicoes), `${inp.ruas} ruas × ${r.paletesPorRua} paletes × ${Number(inp.niveis) + (inp.escravo ? 1 : 0)} no chão e níveis`),
      kpi('alt', 'Altura', `${fmt0(d.altura)} mm`, d.emendas ? `com emenda (8500 + ${d.altura - 8500})` : 'coluna em peça única'),
      kpi('larg', 'Largura', `${fmt0(d.largura)} mm`, `${d.laterais} laterais · rua ${r.frontal.larguraRua} mm`),
      kpi('prof', 'Profundidade', `${fmt0(d.profundidade)} mm`, `${inp.espacamentos} espaços · sobra ${fmt0(r.sobraProfundidade)} mm`),
      kpi('peso', 'Peso do corte', `${fmt(r.pesoTotal, 1)} kg`, 'longarinas topo/fundo e trilho sem peso'),
      kpi('taxa', 'kg / posição', fmt(r.kgPorPosicao, 2), d.montantes && d.montantes !== d.colunas ? `${d.colunas} colunas duplas (${d.montantes} montantes)` : `${d.colunas} colunas`),
    ].join('');

    const lp = calcularProjeto();
    const posP = lp.reduce((s, x) => s + x.r.posicoes * x.qtd, 0), pesoP = lp.reduce((s, x) => s + x.r.pesoTotal * x.qtd, 0), errP = lp.filter((x) => x.r.erros.length).map((x) => x.nome);
    let kp = document.getElementById('kpiProj'); if (!kp) { kp = document.createElement('p'); kp.id = 'kpiProj'; kp.className = 'kpi-proj'; $('kpis').after(kp); }
    kp.innerHTML = `${ic('proj')} Projeto: <b>${lp.length} corte(s)</b>, ${lp.reduce((s, x) => s + x.qtd, 0)} bloco(s) · <b>${fmt0(posP)}</b> posições · <b>${fmt(pesoP, 1)} kg</b> (itens levantados)${errP.length ? ` · <span style="color:#b91c1c">erro nos cortes ${esc(errP.join(', '))}</span>` : ''}`;
    $('alertas').innerHTML = (r.erros.length ? `<div class="erro">${ic('erro')}<b>Corrigir antes de usar</b><ul>${r.erros.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '') + (r.alertas.length ? `<div class="alerta">${ic('alerta')}<b>Atenção</b><ul>${r.alertas.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '');

    const L = r.lateral;
    $('notaQuadros').textContent = `${L.quadros} quadro(s) de 2 colunas${L.solteira ? ' + 1 coluna solteira com travessa união (nº par de espaços)' : ''} · ${L.nH} horizontais e ${L.nD} diagonais por quadro.`;
    renderVista(r);
    croquiBraco(r);
    if (!$('bom').classList.contains('hidden')) { renderPecas(r); renderPend(r); renderProjeto(lp); }
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
    $('tab-pecas').innerHTML = `<p class="aviso-estr">${ic('alerta')}${esc(Engine.AVISO_ESTRUTURAL)}</p><p class="nota" style="padding:0 16px 10px">${esc(Engine.NOTA_RESPONSABILIDADE)}</p>` + html;
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
    g += `<text x="${w / 2}" y="${h - 2}" font-size="10" text-anchor="middle">${Wt} mm (${R} ruas × ${r.frontal.larguraRua} + ${R + 1} colunas × ${r.dimensoes.colW || col})</text>`;
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
  const corte = () => (proj.cortes[proj.atual] || {}).nome || 'A'; // nome aceito (único), não o que está sendo digitado
  const VISTAS = {
    lateral: (r) => ({ t: 'Vista lateral (corte) — desenho real', s: `${r.lateral.quadros} quadro(s) de 2 colunas${r.lateral.solteira ? ' + coluna solteira com travessa união' : ''} · ${r.lateral.nH} horizontais e ${r.lateral.nD} diagonais por quadro · sai no "DXF do projeto" junto com a frontal e a superior`, svg: (window.DXF && window.BLOCOS) ? DXF.svgLateral(r, DXF.tituloVista('LATERAL', corte())) : svgLateral(r) }),
    esquema: (r) => ({ t: 'Esquema', s: `${r.lateral.quadros} quadro(s)${r.lateral.solteira ? ' + coluna solteira (verde)' : ''} · horizontais (laranja), diagonais (azul), topo (cinza)`, svg: svgLateral(r) }),
    frontal: (r) => (window.DXF && window.BLOCOS) ? { t: 'Vista frontal — desenho real', s: `colunas, sapatas, caneleiras 700 mm, braços (simples nas colunas externas, duplo nas internas), longarina superior por rua${DXF.montarFrontal(r).faltam.length ? ' · blocos ainda não recebidos: ' + DXF.montarFrontal(r).faltam.join(', ') : ''}`, svg: DXF.svgFrontal(r, DXF.tituloVista('FRONTAL', corte()), corte()) } : ({ t: 'Vista frontal', s: `níveis a partir de ${r.entradas.alt1Nivel} mm, passo ${r.frontal.passoNivel} mm (braços ainda não levantados)`, svg: svgFrontal(r) }),
    planta: (r) => (window.DXF && window.BLOCOS) ? { t: 'Vista superior — desenho real', s: 'quadros e colunas, braços na alma, longarinas de túnel, longarina superior em cada linha de coluna, zig-zag de topo nas chapas da longarina, trilho guia por lateral, número da posição nos cantos (sem desenhar paletes) e entrada de cada rua · sai no DXF abaixo da frontal', svg: DXF.svgPlanta(r, DXF.tituloVista('SUPERIOR', corte()), corte()) } : ({ t: 'Planta', s: 'colunas em preto', svg: svgPlanta(r) }),
  };
  let vistaAtual = 'lateral';
  function renderVista(r) {
    const v = VISTAS[vistaAtual](r);
    $('vista').innerHTML = `<h3>${v.t}</h3><div class="s">${v.s}</div>${v.svg}<p class="nota">Desenho atualizado conforme o preenchimento. O DXF sai com as peças em blocos.</p>`;
  }
  // PNG da vista: o desenho real vem em mm (viewBox de dezenas de milhares) → escala para no máx. 6000 px no lado maior
  // (limite seguro de canvas dos navegadores); xmlns só é acrescentado se faltar (repetido invalida o SVG e a imagem não carrega)
  function baixarPng() {
    const svg = $('vista').querySelector('svg'); if (!svg) return;
    const vb = svg.viewBox.baseVal, W0 = vb && vb.width ? vb.width : svg.clientWidth, H0 = vb && vb.height ? vb.height : svg.clientHeight;
    const MAX = 6000, scale = Math.min(MAX / W0, MAX / H0, 3), w = Math.max(1, Math.round(W0 * scale)), h = Math.max(1, Math.round(H0 * scale));
    const cl = svg.cloneNode(true); cl.setAttribute('width', w); cl.setAttribute('height', h);
    if (!cl.getAttribute('xmlns')) cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(cl)], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
      c.toBlob((blob) => {
        if (!blob) { alert('Não foi possível gerar o PNG desta vista.'); return; }
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `${vistaAtual}-${($('projeto').value || 'drive-in').replace(/[^\w-]+/g, '_')}-corte-${corte().replace(/[^\w-]+/g, '_')}.png`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert('Não foi possível gerar o PNG desta vista.'); };
    img.src = url;
  }

  function renderProjeto(lp) {
    const itens = consolidar(lp), grupos = [...new Set(itens.map((p) => p.grupo))], total = itens.reduce((s, p) => s + (p.pesoTotal || 0), 0);
    let html = `<p class="aviso-estr">${ic('alerta')}${esc(Engine.AVISO_ESTRUTURAL)}</p><p class="nota" style="padding:0 16px 4px">${esc(Engine.NOTA_RESPONSABILIDADE)}</p><p class="nota" style="padding:0 16px 10px">Cortes: ${lp.map((x) => `${esc(x.nome)} ×${x.qtd}`).join(' · ')} — quantidades já multiplicadas pelos blocos iguais.</p>`;
    html += `<table><thead><tr><th>Código</th><th>Descrição</th><th class="num">Qtd</th><th class="num">Compr. (mm)</th><th class="num">Peso unit. (kg)</th><th class="num">Peso total (kg)</th><th>Cortes</th></tr></thead><tbody>`;
    for (const g of grupos) {
      const ps = itens.filter((p) => p.grupo === g), sub = ps.reduce((s, p) => s + (p.pesoTotal || 0), 0);
      html += `<tr class="grp"><td colspan="5">${esc(g)}</td><td class="num">${fmt(sub)}</td><td></td></tr>`;
      for (const p of ps) html += `<tr><td><span class="code ${!p.codigo || /XXXX/.test(p.codigo) ? 'semcod' : ''}">${esc(p.codigo || Engine.SEM.SA)}</span></td><td>${esc(p.desc)}</td><td class="num">${fmt0(p.qtd)}</td><td class="num">${p.compr == null ? '' : fmt(p.compr)}</td><td class="num">${p.pesoUnit == null ? '' : fmt(p.pesoUnit, 3)}</td><td class="num">${p.pesoTotal == null ? '' : fmt(p.pesoTotal)}</td><td class="obs">${esc([...new Set(p.cortes)].join(', '))}</td></tr>`;
    }
    html += `<tr class="grp"><td colspan="5">TOTAL DO PROJETO (itens levantados)</td><td class="num">${fmt(total)}</td><td></td></tr></tbody></table>`;
    $('tab-proj').innerHTML = html;
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

  function csv(nomeArquivo) {
    if (!last) return;
    const cab = ['Grupo', 'Código', 'Descrição', 'Qtd', 'Comprimento (mm)', 'Peso unit (kg)', 'Peso total (kg)', 'Obs / cortes'];
    const lp = calcularProjeto();
    const rows = [[Engine.AVISO_ESTRUTURAL], [Engine.NOTA_RESPONSABILIDADE], [], ['PROJETO CONSOLIDADO', lp.map((x) => `${x.nome} x${x.qtd}`).join(' · ')], cab];
    for (const p of consolidar(lp)) rows.push([p.grupo, p.codigo || Engine.SEM.SA, p.desc, p.qtd, p.compr ?? '', p.pesoUnit ?? '', p.pesoTotal == null ? '' : p.pesoTotal.toFixed(3), [...new Set(p.cortes)].join(', ')]);
    for (const x of lp) {
      rows.push([], [`CORTE ${x.nome}`, `${x.qtd} bloco(s) igual(is) — quantidades por bloco`], cab);
      for (const p of x.r.pecas) rows.push([p.grupo, p.codigo || Engine.SEM.SA, p.desc, p.qtd, p.compr ?? '', p.pesoUnit ?? '', p.pesoTotal == null ? '' : p.pesoTotal.toFixed(3), p.obs]);
    }
    const txt = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv' })); a.download = typeof nomeArquivo === 'string' ? nomeArquivo : `lista-pecas-${($('projeto').value || 'drive-in').replace(/[^\w-]+/g, '_')}.csv`; a.click();
  }

  document.querySelectorAll('.painel .tab').forEach((t) => t.addEventListener('click', () => {
    const grupo = t.closest('.painel');
    grupo.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
    if (VISTAS[t.dataset.tab]) { vistaAtual = t.dataset.tab; if (last) renderVista(last); }
    else ['pecas', 'pend', 'proj'].forEach((k) => $('tab-' + k).classList.toggle('hidden', k !== t.dataset.tab));
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
  // dados da folha padrão (carimbo, revisão, pallet, descrição técnica, capacidade total) para cada corte do DXF
  function dadosFolha() {
    const lp = calcularProjeto(), hoje = new Date().toLocaleDateString('pt-BR'), h = proj.historico || [], u = h[h.length - 1];
    const revTxt = ($('revisao').value || 'REV.00').replace('.', '-'), revNum = revTxt.replace(/^REV-?/, '');
    const alteracao = (u && u.rev !== 'REV.00' ? (u.mudancas || []).filter((m) => m !== 'Emissão').slice(0, 2).join('; ') || (u.emissao ? 'Emissão' : '') : 'Emissão inicial').toUpperCase();
    const capTotal = lp.reduce((s2, x) => s2 + x.r.posicoes * x.qtd, 0);
    const maius = (v) => String(v || '').trim().toUpperCase();
    // modelos de pallet do projeto (até 2 linhas na tabela da folha): P01, P02 na ordem dos cortes
    const pals = []; for (const x of lp) { const F = x.r.frontal, k = [F.frentePalete, x.r.planta.profPalete, F.alturaPalete, F.cargaPalete].join('|'); if (!pals.some((p) => p.k === k)) pals.push({ k, modelo: `P${String(pals.length + 1).padStart(2, '0')}`, larg: F.frentePalete, prof: x.r.planta.profPalete, alt: F.alturaPalete, peso: F.cargaPalete }); }
    return (corte, i, n) => {
      const x = lp[i], r = x.r, F = r.frontal, camadas = 1 + (F.escravo ? 1 : 0) + F.niveis.length;
      return {
        cliente: maius($('cliente').value), cidade: maius($('cidade').value), uf: maius($('uf').value), representante: maius($('representante').value), rt: maius($('rt').value),
        desenhista: maius(u ? u.por : $('responsavel').value), // Gean: no carimbo vai quem fez a última revisão processo: maius($('projeto').value), revisao: revTxt, data: u ? new Date(u.em).toLocaleDateString('pt-BR') : hoje, folha: `${i + 1}/${n}`,
        rev: { num: revNum, por: maius(u ? u.por : $('responsavel').value), data: u ? new Date(u.em).toLocaleDateString('pt-BR') : hoje, alteracao: alteracao.length > 70 ? alteracao.slice(0, 67) + '...' : alteracao },
        capTotal: `${capTotal} PALLETS`, paletes: pals.slice(0, 2),
        descricao: { bloco: `BLOCO ${corte}${x.qtd > 1 ? ` (x${x.qtd})` : ''}`, dims: `${Math.round(r.dimensoes.largura)}/${Math.round(r.dimensoes.profundidade)}/${r.dimensoes.altura}`, empilhamento: `PISO${F.escravo ? '(2)' : ''}+${String(F.niveis.length).padStart(2, '0')} NÍVEIS`, carga: `${F.cargaPalete} KG`, porRua: `${r.paletesPorRua * camadas} PALLETS`, ruas: `${r.entradas.ruas} RUAS`, total: `${r.posicoes * x.qtd} PALLETS` },
      };
    };
  }
  $('btnDxfProj').addEventListener('click', () => {
    if (!last) return;
    const nome = ($('projeto').value || 'drive-in').replace(/[^\w-]+/g, '_');
    const txt = DXF.dxfProjeto(calcularProjeto().map((x) => ({ r: x.r, corte: x.nome, qtd: x.qtd })), dadosFolha());
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/dxf' })); a.download = `${nome}-projeto.dxf`; a.click();
  });
  // novo corte em branco; "Duplicar" copia os dados do corte atual com o nome em branco (o operador nomeia e confere)
  $('btnNovoCorte').addEventListener('click', () => { render(); proj.cortes.push({ nome: '', qtd: '', dados: null }); selecionarCorte(proj.cortes.length - 1); $('nomeCorte').focus(); });
  $('btnDupCorte').addEventListener('click', () => { render(); const c = proj.cortes[proj.atual]; proj.cortes.push({ nome: '', qtd: c.qtd, dados: JSON.parse(JSON.stringify(c.dados)) }); selecionarCorte(proj.cortes.length - 1); $('nomeCorte').focus(); });
  // ---------- pasta, revisões e histórico ----------
  const pad2 = (n) => String(n).padStart(2, '0');
  const REV = (n) => `REV.${pad2(n)}`;
  const nomeArq = () => ($('projeto').value || 'projeto').replace(/[^\w-]+/g, '_');
  const snap = () => JSON.parse(JSON.stringify({ cab: Object.fromEntries(CAB.filter((k) => k !== 'revisao').map((k) => [k, $(k).value])), cortes: proj.cortes.map((c) => ({ nome: c.nome, qtd: c.qtd, dados: c.dados })) }));
  const catVersaoTxt = () => (cat.meta && cat.meta.versao ? `v${cat.meta.versao} (${cat.meta.data || ''})` : `base ${cat.versao}`);
  function rotuloCampo(id) { const l = document.querySelector(`label[for="${id}"]`); return l ? l.textContent.replace('padrão', '').trim() : id; }
  // diferenças entre a última revisão salva e a tela, em texto (vai para o histórico)
  function diferencas(a, b) {
    if (!a) return ['Projeto criado'];
    const out = [];
    for (const k of Object.keys(b.cab)) if ((a.cab[k] || '') !== (b.cab[k] || '')) out.push(`${rotuloCampo(k)}: "${a.cab[k] || ''}" → "${b.cab[k] || ''}"`);
    const porNome = (l) => Object.fromEntries(l.map((c) => [c.nome || '(sem nome)', c]));
    const A = porNome(a.cortes), B = porNome(b.cortes);
    for (const n of Object.keys(B)) if (!A[n]) out.push(`Corte ${n} incluído`);
    for (const n of Object.keys(A)) if (!B[n]) out.push(`Corte ${n} removido`);
    for (const n of Object.keys(B)) {
      if (!A[n]) continue;
      const ca = A[n], cb = B[n], va = (ca.dados && ca.dados.v) || {}, vb = (cb.dados && cb.dados.v) || {};
      if (String(ca.qtd) !== String(cb.qtd)) out.push(`Corte ${n} – blocos iguais: ${ca.qtd} → ${cb.qtd}`);
      for (const id of IDS) if ((va[id] ?? '') !== (vb[id] ?? '')) out.push(`Corte ${n} – ${rotuloCampo(id)}: ${va[id] || '–'} → ${vb[id] || '–'}`);
      if (!!(ca.dados && ca.dados.escravo) !== !!(cb.dados && cb.dados.escravo)) out.push(`Corte ${n} – palete escravo: ${cb.dados && cb.dados.escravo ? 'sim' : 'não'}`);
      if (JSON.stringify(ca.dados && ca.dados.diferentes && ca.dados.espacos) !== JSON.stringify(cb.dados && cb.dados.diferentes && cb.dados.espacos)) out.push(`Corte ${n} – medidas dos espaços alteradas`);
    }
    return out;
  }
  // itens usados (código e peso) para avisar, ao reabrir, se o catálogo mudou desde a revisão salva
  function referenciaCatalogo() {
    const itens = {};
    for (const x of calcularProjeto()) for (const p of x.r.pecas) itens[`${p.grupo}|${p.desc}`] = [p.codigo || '', p.pesoUnit == null ? null : +Number(p.pesoUnit).toFixed(3)];
    return { versao: catVersaoTxt(), itens };
  }
  function comparaCatalogo(ref) {
    if (!ref || !ref.itens) return [];
    const atual = referenciaCatalogo().itens, out = [];
    for (const [k, [cod, peso]] of Object.entries(ref.itens)) {
      const n = atual[k]; if (!n) continue;
      if (n[0] !== cod) out.push(`${k.split('|')[1]}: código ${cod || '–'} → ${n[0] || '–'}`);
      if ((n[1] ?? null) !== (peso ?? null)) out.push(`${k.split('|')[1]}: peso ${peso ?? '–'} → ${n[1] ?? '–'} kg`);
    }
    return out;
  }
  const usuarioSalvo = () => { try { return localStorage.getItem('drivein_usuario') || ''; } catch (e) { return ''; } };
  function pedirUsuario() {
    const u = (prompt('Seu nome (fica registrado no histórico de revisões):', usuarioSalvo() || $('responsavel').value) || '').trim();
    if (u) try { localStorage.setItem('drivein_usuario', u); } catch (e) { /* sem storage */ }
    return u;
  }
  function baixar(nome, txt, tipo) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: tipo })); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); }
  // salva uma NOVA revisão (Gean: a revisão sobe a cada salvamento): histórico, quem salvou, o que mudou, versão do catálogo
  async function salvarProjeto(opc = {}) {
    render();
    if (!$('projeto').value.trim()) { alert('Preencha o Projeto / cliente antes de salvar.'); return false; }
    const atual = snap(), mud = diferencas(proj._base, atual);
    if (!opc.emissao && proj._base && !mud.length && !confirm(`Nenhuma alteração desde a ${$('revisao').value}. Salvar assim mesmo como nova revisão?`)) return false;
    const usuario = opc.por || pedirUsuario(); if (!usuario) { alert('Informe seu nome para salvar.'); return false; }
    proj.rev = proj.historico && proj.historico.length ? (proj.rev ?? 0) + 1 : 0;
    const agora = new Date().toISOString();
    if (!proj.criado) proj.criado = { por: usuario, em: agora };
    proj.historico = (proj.historico || []).concat({ rev: REV(proj.rev), por: usuario, em: agora, emissao: !!opc.emissao, mudancas: opc.emissao ? ['Emissão'].concat(mud) : (mud.length ? mud : ['Salvo sem alterações']) });
    if (opc.emissao) proj.emitido = { rev: REV(proj.rev), por: usuario, em: agora };
    $('revisao').value = REV(proj.rev);
    proj.catalogoRef = referenciaCatalogo();
    salvar();
    const { _base, ...semBase } = proj;
    const txt = JSON.stringify({ formato: 'drivein-projeto', versao: 2, salvoEm: agora, ...semBase }, null, 1);
    try {
      if (window.Pasta && Pasta.pronta) {
        await Pasta.escrever(`projetos/${nomeArq()}.drivein.json`, txt);
        await Pasta.escrever(`projetos/revisoes/${nomeArq()}_${REV(proj.rev)}.drivein.json`, txt);
      } else baixar(`${nomeArq()}_${REV(proj.rev)}.drivein.json`, txt, 'application/json');
    } catch (e) { alert('Não foi possível gravar na pasta (' + e.message + '). O arquivo será baixado.'); baixar(`${nomeArq()}_${REV(proj.rev)}.drivein.json`, txt, 'application/json'); }
    proj._base = snap(); salvar(); renderRev();
    return true;
  }
  function renderRev() {
    const h = proj.historico || [], u = h[h.length - 1];
    $('revInfo').innerHTML = u ? `${esc(u.rev)} salva por <b>${esc(u.por)}</b> em ${new Date(u.em).toLocaleString('pt-BR')}${proj.criado ? ` · criado por ${esc(proj.criado.por)}` : ''}${proj.emitido ? ` · emitido ${esc(proj.emitido.rev)}` : ''} · <a href="#" id="verHist">histórico</a>` : 'Projeto ainda não salvo.';
    const vh = $('verHist'); if (vh) vh.addEventListener('click', (e) => { e.preventDefault(); modal('Histórico de revisões', `<ul>${h.slice().reverse().map((x) => `<li><b>${esc(x.rev)}</b>${x.emissao ? ' (EMISSÃO)' : ''} – ${esc(x.por)}, ${new Date(x.em).toLocaleString('pt-BR')}<ul>${x.mudancas.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></li>`).join('')}</ul>`, [{ txt: 'Fechar' }]); });
  }
  // janela simples (modal)
  function modal(titulo, html, botoes) {
    $('modalTit').textContent = titulo; $('modalCorpo').innerHTML = html; $('modalAcoes').innerHTML = '';
    for (const b of botoes) { const el = document.createElement('button'); el.textContent = b.txt; if (b.cls) el.className = b.cls; if (b.id) el.id = b.id; el.addEventListener('click', async () => { if (b.fn && (await b.fn()) === false) return; fecharModal(); }); $('modalAcoes').appendChild(el); }
    $('modal').classList.remove('hidden');
  }
  const fecharModal = () => $('modal').classList.add('hidden');
  $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) fecharModal(); });
  function abrirTexto(t) {
    const p = JSON.parse(t); if (p.formato && p.formato !== 'drivein-projeto') throw new Error('não é um projeto Drive-In');
    carregarProjeto(p);
    if (p.cab && p.cab.revisao) $('revisao').value = p.cab.revisao; else if (p.rev != null) $('revisao').value = REV(p.rev);
    proj._base = snap(); salvar(); renderRev();
    const dif = comparaCatalogo(p.catalogoRef);
    if (p.catalogoRef && (p.catalogoRef.versao !== catVersaoTxt() || dif.length)) modal('Catálogo diferente do usado na última revisão', `<p>Revisão salva com o catálogo <b>${esc(p.catalogoRef.versao)}</b>; catálogo atual <b>${esc(catVersaoTxt())}</b>.</p>${dif.length ? `<h4>Itens que mudaram</h4><ul>${dif.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '<p>Nenhum código ou peso dos itens deste projeto mudou.</p>'}<p class="nota">Ao salvar, a nova revisão passa a usar o catálogo atual.</p>`, [{ txt: 'Entendi', cls: 'primario' }]);
  }
  $('btnSalvarProj').addEventListener('click', () => salvarProjeto());
  $('btnAbrirProj').addEventListener('click', async () => {
    if (!(window.Pasta && Pasta.pronta)) { $('abrirProj').click(); return; }
    const arqs = await Pasta.listar('projetos', '.drivein.json');
    modal(`Projetos na pasta ${Pasta.nome()}`, arqs.length ? `<ul class="lista-arq">${arqs.map((a) => `<li data-n="${esc(a.nome)}"><span>${esc(a.nome.replace('.drivein.json', ''))}</span><span class="nota">${new Date(a.data).toLocaleString('pt-BR')}</span></li>`).join('')}</ul>` : '<p>Nenhum projeto salvo na pasta ainda.</p>', [{ txt: 'Arquivo do computador…', fn: () => { $('abrirProj').click(); } }, { txt: 'Cancelar' }]);
    $('modalCorpo').querySelectorAll('li[data-n]').forEach((li) => li.addEventListener('click', async () => { fecharModal(); try { abrirTexto(await Pasta.ler('projetos/' + li.dataset.n)); } catch (e) { alert('Não foi possível abrir: ' + e.message); } }));
  });
  $('abrirProj').addEventListener('change', (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    f.text().then(abrirTexto).catch((e) => alert('Não foi possível abrir o projeto: ' + e.message)).finally(() => { ev.target.value = ''; });
  });
  // pasta da empresa
  async function renderPasta() {
    const P = window.Pasta, b = $('btnPasta');
    if (!P || !P.suportado) { $('pastaInfo').textContent = 'Sem pasta (use Chrome ou Edge): salva como download'; b.classList.add('hidden'); return; }
    if (P.pronta) { $('pastaInfo').innerHTML = `Pasta: <b>${esc(P.nome())}</b>`; b.textContent = 'Trocar'; }
    else if (P.handle) { $('pastaInfo').innerHTML = `Pasta <b>${esc(P.nome())}</b> desconectada`; b.textContent = 'Reconectar'; }
    else { $('pastaInfo').textContent = 'Nenhuma pasta definida'; b.textContent = 'Escolher pasta'; }
  }
  $('btnPasta').addEventListener('click', async () => {
    try { if (Pasta.handle && !Pasta.pronta) await Pasta.permitir(); else await Pasta.escolher(); } catch (e) { /* cancelado */ }
    await renderPasta(); if (Pasta.pronta && window.Cadastro) await Cadastro.carregarDaPasta();
  });
  // emissão: confere pendências de todos os cortes, exige ciência e nome, salva como revisão de emissão e gera DXF + lista
  $('btnEmitir').addEventListener('click', () => {
    render();
    const incompletos = proj.cortes.filter((x) => vazioDados(x.dados) || !x.nome || x.qtd === '').map((x) => x.nome || '(sem nome)');
    const lp = calcularProjeto(), bloq = [], li = (t) => `<li>${esc(t)}</li>`;
    if (!$('projeto').value.trim() || !$('responsavel').value.trim()) bloq.push('Projeto / cliente e responsável');
    if (incompletos.length) bloq.push(`Cortes com campos obrigatórios em branco: ${incompletos.join(', ')}`);
    for (const x of lp) for (const e of x.r.erros) bloq.push(`Corte ${x.nome}: ${e}`);
    const fixos = [Engine.AVISO_ESTRUTURAL, Engine.NOTA_RESPONSABILIDADE];
    const alertas = lp.flatMap((x) => x.r.alertas.filter((a) => !fixos.includes(a)).map((a) => `Corte ${x.nome}: ${a}`));
    const pend = [...new Set(lp.flatMap((x) => x.r.pendencias))];
    const itens = lp.length ? consolidar(lp) : [];
    const semCod = [...new Set(itens.filter((p) => !p.codigo || /XXXX/.test(p.codigo)).map((p) => `${p.codigo || Engine.SEM.SA} – ${p.desc}`))];
    const semPeso = [...new Set(itens.filter((p) => p.pesoUnit == null).map((p) => p.desc))];
    const est = [...new Set(itens.filter((p) => /ESTIMADO|estimad/i.test(p.obs || '')).map((p) => p.desc))];
    const sec = (t, l) => l.length ? `<h4>${t} (${l.length})</h4><ul>${l.slice(0, 60).map(li).join('')}${l.length > 60 ? `<li>… mais ${l.length - 60}</li>` : ''}</ul>` : '';
    const html = (bloq.length ? `<h4 class="bloq">Impede a emissão</h4><ul class="bloq">${bloq.map(li).join('')}</ul>` : '')
      + sec('Atenção', alertas) + sec('Itens sem código cadastrado', semCod) + sec('Itens sem peso (não entram no total)', semPeso) + sec('Pesos estimados', est) + sec('Regras / dados ainda a confirmar', pend)
      + `<h4>Responsabilidades</h4><ul>${fixos.map(li).join('')}</ul>`
      + `<p style="margin-top:12px"><label><input type="checkbox" id="emCiente"> Li as pendências acima e assumo a emissão.</label></p><p><label>Seu nome: <input id="emNome" type="text" value="${esc(usuarioSalvo() || $('responsavel').value)}" style="width:260px"></label></p>`;
    modal(`Emitir ${$('projeto').value || 'projeto'} – conferência de pendências`, html, [{ txt: 'Cancelar' }, {
      txt: 'Emitir', cls: 'primario', id: 'emOk', fn: async () => {
        if (bloq.length) { alert('Resolva os itens que impedem a emissão.'); return false; }
        const nome = $('emNome').value.trim();
        if (!$('emCiente').checked || !nome) { alert('Marque a ciência e informe seu nome.'); return false; }
        try { localStorage.setItem('drivein_usuario', nome); } catch (e) { /* sem storage */ }
        if (!(await salvarProjeto({ emissao: true, por: nome }))) return false;
        baixar(`${nomeArq()}_${$('revisao').value}-projeto.dxf`, DXF.dxfProjeto(calcularProjeto().map((x) => ({ r: x.r, corte: x.nome, qtd: x.qtd })), dadosFolha()), 'application/dxf');
        csv(`${nomeArq()}_${$('revisao').value}-lista-pecas.csv`);
        return true;
      } }]);
    if (bloq.length) $('emOk').disabled = true;
  });
  $('btnNovoProj').addEventListener('click', () => {
    if (!confirm('Começar um projeto novo? O projeto atual sai da tela (salve o arquivo antes, se precisar).')) return;
    for (const k of CAB) $(k).value = k === 'revisao' ? 'REV.00' : '';
    carregarProjeto({ atual: 0, cortes: [{ nome: '', qtd: '', dados: null }] }); renderRev();
  });
  $('btnRemCorte').addEventListener('click', () => {
    if (proj.cortes.length < 2 || !confirm(`Remover o corte ${proj.cortes[proj.atual].nome}?`)) return;
    proj.cortes.splice(proj.atual, 1); selecionarCorte(Math.max(0, proj.atual - 1));
  });
  mostrarPasso(0);
  IDS.forEach((id) => $(id).addEventListener('input', render));
  $('escravo').addEventListener('change', render);
  $('nomeCorte').addEventListener('input', render);
  $('nomeCorte').addEventListener('blur', () => { const c = proj.cortes[proj.atual]; if (normCorte($('nomeCorte').value) !== c.nome) { $('nomeCorte').value = c.nome; render(); } });
  $('qtdCorte').addEventListener('input', render);
  $('espacamentos').addEventListener('input', montarEspacos);
  $('largura').addEventListener('input', () => { if (!$('diferentes').checked) montarEspacos(); });
  $('diferentes').addEventListener('change', () => { montarEspacos(); render(); });
  montarEspacos();
  { const c = proj.cortes[proj.atual] || proj.cortes[0]; $('nomeCorte').value = c.nome; $('qtdCorte').value = c.qtd; aplicarForm(c.dados); for (const k of CAB) if (proj.cab && proj.cab[k] != null) $(k).value = k === 'projeto' ? limparProjeto(proj.cab[k]) : proj.cab[k]; }
  $('projeto').addEventListener('input', () => { const el = $('projeto'), v = limparProjeto(el.value); if (v !== el.value) el.value = v; });
  $('projeto').value = limparProjeto($('projeto').value);
  $('uf').addEventListener('input', () => { const el = $('uf'), v = el.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2); if (v !== el.value) el.value = v; });
  CAB.forEach((k) => $(k).addEventListener('input', () => { salvar(); if (OBRIG_CAB.includes(k)) render(); }));
  $('btnCsv').addEventListener('click', csv);
  $('btnPrint').addEventListener('click', () => window.print());
  $('catVersao').textContent = catVersaoTxt();
  window.recalcular = () => { $('catVersao').textContent = catVersaoTxt(); render(); };
  const mostrarPagina = (cad) => { $('paginaConfig').classList.toggle('hidden', cad); $('paginaCad').classList.toggle('hidden', !cad); $('navConfig').classList.toggle('active', !cad); $('navCad').classList.toggle('active', cad); };
  $('navConfig').addEventListener('click', (e) => { e.preventDefault(); mostrarPagina(false); });
  $('navCad').addEventListener('click', (e) => { e.preventDefault(); mostrarPagina(true); });
  if (window.Cadastro) Cadastro.init();
  render(); renderRev();
  if (window.Pasta) Pasta.restaurar().then(async (ok) => { await renderPasta(); if (ok && window.Cadastro) await Cadastro.carregarDaPasta(); }); else renderPasta();
})();
