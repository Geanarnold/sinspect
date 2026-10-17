// Desenho do Porta-Palete: vistas frontal, lateral (quadro) e superior, na folha A0 padrão, em DXF (R12) e PDF.
// Usa as primitivas do Drive-In (DXF.base: coluna, sapata, travessas, cotas, folha) e o mesmo modelo {prims, items, linhas, textos, bbox}.
// Funciona no navegador (window.PPDesenho) e no Node (module.exports).
(function (root) {
  'use strict';
  const DXF = root.DXF || (typeof require === 'function' ? require('./dxf.js') : null);
  const X = () => DXF.base;
  const TXT = '4 - TEXTO DE ESCALA E VISTA';

  function novoModelo() {
    const prims = [], items = [], linhas = [], textos = [];
    const { clone, translate, fazCota } = X();
    const put = (ps, dx, dy, layer, nome) => {
      for (const q of ps) q.l = q.l && q.l !== '0' ? q.l : layer;
      if (nome) items.push({ nome, local: clone(ps), x: dx, y: dy, l: layer });
      for (const q of ps) { const w = translate([q], dx, dy)[0]; if (nome) w.blk = 1; prims.push(w); }
    };
    const line = (x1, y1, x2, y2, l) => linhas.push({ l, p: [[x1, y1], [x2, y2]] });
    const text = (x, y, h, s, l, rot = 0, just = 1, st) => textos.push({ x, y, h, s, l, rot, just, st });
    const caixa = (x0, y0, x1, y1, l) => [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]].map(([a, b, c, d]) => ({ t: 'p', l, p: [[a, b], [c, d]] }));
    return { prims, items, linhas, textos, put, line, text, caixa, cota: fazCota(line, text) };
  }
  const piso = (m, x0, x1) => { const { piso: pz, nomeBloco } = X(), n = Math.ceil((x1 - x0) / 1000); for (let k = 0; k < n; k++) m.put(pz(k === 0, k === n - 1), x0 + k * 1000, 0, '0', nomeBloco('DI_PISO', k === 0 ? 'INI' : k === n - 1 ? 'FIM' : '')); };

  // eixos das colunas: cada módulo tem a sua longarina (vão livre = comprimento da longarina)
  const eixos = (r) => { const col = r.entradas.col, xs = [col / 2]; for (const md of r.modulos) xs.push(xs[xs.length - 1] + md.L + col); return xs; };

  // ---- vista frontal: módulos lado a lado, cada um com níveis, longarina e paletes próprios; colunas com a altura de cada linha
  function frontal(r, titulo) {
    const m = novoModelo(), { colunaFrontal, nomeBloco, nb, geoPalete, clone } = X();
    const E = r.entradas, col = E.col, xs = eixos(r), Hmax = r.dimensoes.altura;
    xs.forEach((x, j) => m.put(colunaFrontal(col, r.colunasH[j]), x, 0, 'MONTANTE', nomeBloco('PP_COLUNA_FRONTAL', col, 'H' + r.colunasH[j])));
    // tala de junção (SA040045, blank 99 x 227 #2,65) na emenda da coluna: barra inferior de 8500 + superior; tala centrada na junta
    const yJ = r.emendaY + X().BASE_BARRA, tala = [...m.caixa(-col / 2 + 6, -113.5, col / 2 - 6, 113.5, 'CANELEIRA_HACHURA'), { t: 'p', l: 'CANELEIRA_HACHURA', p: [[-col / 2, 0], [col / 2, 0]] }];
    xs.forEach((x, j) => { if (r.colunasH[j] > r.emendaY) { m.put(clone(tala), x, yJ, 'CANELEIRA_HACHURA', nomeBloco('PP_TALA_JUNCAO', col)); m.text(x + col / 2 + 40, yJ - 30, 70, 'TALA DE JUNÇÃO', 'COTAS', 0, 0, 'ROMANS'); } });
    r.modulos.forEach((md, i) => {
      // longarina (des. 0004.0001.02.001): perfil com altura TB − 3,5, garras de 3,7 mm nas pontas, 35 mm abaixo do perfil (150 ou 250 de altura)
      const L = md.L, hP = md.TB - 3.5, gH = md.garraH, gE = 3.7, x0 = xs[i] + col / 2;
      const long = [...m.caixa(gE, -hP, L - gE, 0, 'LONGARINA'), { t: 'p', l: 'LONGARINA', p: [[gE, -hP + 3.5], [L - gE, -hP + 3.5]] }, { t: 'p', l: 'LONGARINA', p: [[gE, -3.5], [L - gE, -3.5]] },
        ...m.caixa(0, -hP - 35, gE, -hP - 35 + gH, 'LONGARINA'), ...m.caixa(L - gE, -hP - 35, L, -hP - 35 + gH, 'LONGARINA')];
      const nomeL = nomeBloco('PP_LONG_FRONTAL', 'TB' + md.TB, nb(L)), pal = geoPalete(md.frente, md.hp, true), nomeP = nomeBloco('PP_PALETE_FR', nb(md.frente) + 'X' + nb(md.hp));
      for (const y of md.niveis) m.put(clone(long), x0, y, 'LONGARINA', nomeL);
      const folga = (L - md.nPal * md.frente) / (md.nPal + 1); // paletes centrados no vão: folgas iguais entre paletes e até as colunas
      for (const y of (md.chao ? [0] : []).concat(md.niveis)) for (let k = 0; k < md.nPal; k++) {
        const xp = x0 + folga + k * (md.frente + folga);
        m.put(clone(pal), xp, y, 'PALETE', nomeP);
        if (md.carga) m.text(xp + md.frente / 2, y + md.hp / 2, 110, `${md.carga} kg`, 'PALETE'); // carga no palete, como no Drive-In
      }
      m.cota(x0, Hmax, x0 + L, Hmax, 300, `${L}`, false, 'c');
      if (md.tunel) m.text(x0 + L / 2, Math.min(md.niveis[0] || 1000, 2000) / 2, 150, 'TÚNEL', TXT);
      // níveis do módulo: cota corrente na coluna da esquerda do módulo (piso → níveis)
      const marcas = [0, ...md.niveis];
      for (let k = 0; k < marcas.length - 1; k++) m.cota(x0 + 150, marcas[k], x0 + 150, marcas[k + 1], -120, `${marcas[k + 1] - marcas[k]}`, true, 'c');
      md.niveis.forEach((y, k) => m.text(x0 + L - 60, y + 40, 70, `N${k + 1} ${y}`, 'COTAS', 0, 2, 'ROMANS'));
    });
    const xa = xs[0] - col / 2, xb = xs[xs.length - 1] + col / 2;
    piso(m, xa - 1000, xb + 1000);
    m.cota(xa, Hmax, xb, Hmax, 650, `${Math.round(xb - xa)}`, false, 'g');
    m.cota(xa, 0, xa, r.colunasH[0], 450, `${r.colunasH[0]}`, true, 'g');
    if (r.colunasH.some((h) => h !== r.colunasH[0])) xs.forEach((x, j) => j && m.text(x, r.colunasH[j] + 120, 80, `H ${r.colunasH[j]}`, 'COTAS', 0, 1, 'ROMANS'));
    m.text((xa + xb) / 2, -600, 120, titulo, TXT);
    return { ...m, bbox: [xa - 1500, -900, xb + 1000, Hmax + 1150] };
  }

  // ---- vista lateral: o quadro mais alto do corte, com as travessas da modulação; longarinas em corte e paletes dos módulos vizinhos
  function lateral(r, titulo) {
    const m = novoModelo(), { coluna, sapata, travessaH, travessaD, recortaDiag, mirrorX, translate, clone, nomeBloco, nb, geoPalete } = X();
    const E = r.entradas, P = E.P, CW = 69.8;
    const jq = r.colunasH.indexOf(Math.max(...r.colunasH)), { H, ys, nD } = r.quadros[jq];
    const viz = [r.modulos[jq - 1], r.modulos[jq]].filter(Boolean), md = viz.reduce((a, b) => (b.niveis.length > a.niveis.length ? b : a));
    const niv = [...new Set([].concat(...viz.map((v) => v.niveis)))].sort((a, b) => a - b), TB = Math.max(...viz.map((v) => v.TB));
    const holeY = (y) => 54.75 + 50 * Math.round((y - 54.75) / 50);
    const inicios = []; for (let f = 0; f < E.fileiras; f++) inicios.push(f * (P + E.entreFileiras));
    for (const x0 of inicios) {
      const xA = x0 + CW / 2, xB = x0 + P - CW / 2; // eixos das 2 colunas (P = face externa a face externa)
      m.put(coluna(H, true), xA, 0, 'MONTANTE', nomeBloco('DI_COLUNA', 'H' + H, 'D')); m.put(sapata(), xA - 7.35, 0, 'MONTANTE', nomeBloco('DI_SAPATA', 'D'));
      m.put(coluna(H, false), xB, 0, 'MONTANTE', nomeBloco('DI_COLUNA', 'H' + H, 'E')); m.put(mirrorX(sapata()), xB + 7.35, 0, 'MONTANTE', nomeBloco('DI_SAPATA', 'E'));
      const cc = P - 109.1, xm = (xA + xB) / 2, hxL = xm - cc / 2, hxR = xm + cc / 2;
      ys.forEach((y) => m.put(travessaH(hxR - hxL), hxL, holeY(y), 'MONTANTE', nomeBloco('DI_TRAVESSA_H', 'CC' + nb(hxR - hxL))));
      for (let k = 0; k < nD; k++) { // Z: alterna o sentido a cada vão
        const sobe = k % 2 === 0, p1 = [sobe ? hxL : hxR, holeY(ys[k])], p2 = [sobe ? hxR : hxL, holeY(ys[k + 1])];
        const a = p1[0] < p2[0] ? p1 : p2, b = p1[0] < p2[0] ? p2 : p1;
        m.put(translate(recortaDiag(travessaD(a, b), xA + CW / 2, xB - CW / 2), -a[0], -a[1]), a[0], a[1], 'MONTANTE', nomeBloco('DI_TRAVESSA_D', nb(b[0] - a[0]) + 'X' + nb(b[1] - a[1])));
      }
      const sec = [...m.caixa(0, -TB, 50, 0, 'LONGARINA')], nomeS = nomeBloco('PP_LONG_CORTE', 'TB' + TB);
      for (const y of niv) { m.put(clone(sec), x0 - 50, y, 'LONGARINA', nomeS); m.put(clone(sec), x0 + P, y, 'LONGARINA', nomeS); }
      const pal = geoPalete(E.profPal, md.hp, true), xp = x0 + (P - E.profPal) / 2, nomeP = nomeBloco('PP_PALETE_LT', nb(E.profPal) + 'X' + nb(md.hp));
      for (const y of (md.chao ? [0] : []).concat(md.niveis)) m.put(clone(pal), xp, y, 'PALETE', nomeP);
      m.cota(x0, H, x0 + P, H, 300, `${P}`, false, 'c');
    }
    const xa = 0, xb = inicios[inicios.length - 1] + P;
    if (E.fileiras === 2) m.cota(P, H, P + E.entreFileiras, H, 300, `${E.entreFileiras}`, false, 'c');
    piso(m, xa - 1500, xb + 1500);
    const marcas = [0, ...ys, H + X().BASE_BARRA].filter((v, k, a) => k === 0 || v - a[k - 1] > 1);
    for (let k = 0; k < marcas.length - 1; k++) m.cota(xa, marcas[k], xa, marcas[k + 1], 300, `${Math.round(marcas[k + 1] - marcas[k])}`, true, 'c');
    m.cota(xa, 0, xa, H + X().BASE_BARRA, 750, `${Math.round(H + X().BASE_BARRA)}`, true, 'g');
    m.text((xa + xb) / 2, -600, 120, titulo, TXT);
    if (r.quadros.some((q) => q.H !== H)) m.text((xa + xb) / 2, -780, 80, `QUADRO DA COLUNA ${jq + 1} (MAIS ALTO); DEMAIS: ${[...new Set(r.colunasH)].filter((h) => h !== H).join(' / ')} mm`, TXT);
    return { ...m, bbox: [xa - 1900, -900, xb + 1200, H + 1150] };
  }

  // ---- vista superior: colunas, longarinas (frente e fundo) e travessas em cada fileira
  function superior(r, titulo) {
    const m = novoModelo(), { clone, nomeBloco, nb } = X(), E = r.entradas, col = E.col, P = E.P, xs = eixos(r);
    for (let f = 0; f < E.fileiras; f++) {
      const y0 = f * (P + E.entreFileiras);
      // quadro visto de cima: bloco DI_MONT_<col> do Drive-In (2 seções + contraventamento; alma de trás em y = 0, desenhado com 1025, esticado na profundidade)
      const MONT = (root.BLOCOS || {})['DI_MONT_' + col];
      for (const x of xs) {
        if (MONT) m.put(clone(MONT).map((q) => ({ ...q, p: q.p && q.p.map((v) => [v[0], v[1] < -512.5 ? v[1] - (P - 1025) : v[1]]), c: q.c && [q.c[0], q.c[1] < -512.5 ? q.c[1] - (P - 1025) : q.c[1]] })), x, y0 + P, 'MONTANTE', nomeBloco('DI_PL_QUADRO', col, nb(P)));
        else { for (const y of [y0, y0 + P - 70]) m.put(m.caixa(-col / 2, 0, col / 2, 70, 'MONTANTE'), x, y, 'MONTANTE'); m.line(x, y0 + 70, x, y0 + P - 70, 'Contraventamento'); }
      }
      r.modulos.forEach((md, i) => { for (const y of [y0 - 50, y0 + P]) m.put(m.caixa(0, 0, md.L, 50, 'LONGARINA'), xs[i] + col / 2, y, 'LONGARINA'); if (md.tunel) m.text(xs[i] + col / 2 + md.L / 2, y0 + P / 2 - 40, 90, 'TÚNEL', TXT); });
    }
    const W = xs[xs.length - 1] + col / 2, D = E.fileiras * P + (E.fileiras - 1) * E.entreFileiras;
    m.cota(0, D + 50, W, D + 50, 300, `${Math.round(W)}`, false, 'g');
    m.cota(0, 0, 0, D, 400, `${Math.round(D)}`, true, 'g');
    m.text(W / 2, -900, 120, titulo, TXT);
    m.text(W / 2, -450, 80, 'FRENTE (CORREDOR)', TXT);
    return { ...m, bbox: [-1500, -1300, W + 900, D + 1150] };
  }

  const junta = (ms) => ({ prims: [].concat(...ms.map((x) => x.prims)), items: [].concat(...ms.map((x) => x.items)), linhas: [].concat(...ms.map((x) => x.linhas)), textos: [].concat(...ms.map((x) => x.textos)),
    bbox: [Math.min(...ms.map((x) => x.bbox[0])), Math.min(...ms.map((x) => x.bbox[1])), Math.max(...ms.map((x) => x.bbox[2])), Math.max(...ms.map((x) => x.bbox[3]))] });

  // modelo completo: lateral à esquerda, frontal à direita, superior embaixo da frontal; com dd (dados da folha) monta a folha A0
  function modelo(r, corte = 'A', dd = null) {
    const { shiftModel, montarFolha } = X(), c = String(corte || r.nome || 'A').toUpperCase();
    const mL = lateral(r, `VISTA LATERAL CORTE ${c}`), mF = frontal(r, `VISTA FRONTAL CORTE ${c}`), mS = superior(r, `VISTA SUPERIOR CORTE ${c}`);
    shiftModel(mF, mL.bbox[2] + 1500 - mF.bbox[0]);
    shiftModel(mS, mF.bbox[0] - mS.bbox[0], Math.min(mL.bbox[1], mF.bbox[1]) - 1200 - mS.bbox[3]);
    const aviso = root.PPEngine ? root.PPEngine.AVISO_ESTRUTURAL : '';
    if (aviso) mL.textos.push({ x: mL.bbox[0] + 400, y: -1200, h: 90, s: aviso, l: TXT, rot: 0, just: 0 });
    const info = [['POSIÇÕES', r.posicoes], ['MÓDULOS', `${r.entradas.modulos} x ${r.entradas.fileiras} FILEIRA(S)`], ['PROF. DO PALETE', `${r.entradas.profPal} mm`]]
      .concat(r.modulos.map((md) => [`M${md.i + 1}${md.tunel ? ' (TÚNEL)' : ''}`, `${md.nPal} x ${md.frente}x${md.hp} - ${md.carga} kg - ${md.chao ? 'CHÃO + ' : ''}${md.niveis.length} NÍV. - TB ${md.TB} ${md.L} mm ${md.capacidade != null ? md.capacidade + ' KG/PAR' : 'SEM CAP.'}`]));
    const xI = mL.bbox[0] + 400, yI = -1600; // embaixo da lateral, abaixo do aviso
    mL.bbox[1] = Math.min(mL.bbox[1], yI - (info.length + 1) * 170 - 200);
    mL.textos.push({ x: xI, y: yI, h: 110, s: 'INFORMAÇÕES DO PORTA-PALETE', l: TXT, rot: 0, just: 0 });
    info.forEach(([k, v], i) => mL.textos.push({ x: xI, y: yI - (i + 1) * 170, h: 90, s: `${k}: ${v}`, l: TXT, rot: 0, just: 0 }));
    const mc = junta([mL, mF, mS]);
    if (r.qtd > 1) mc.textos.push({ x: (mc.bbox[0] + mc.bbox[2]) / 2, y: mc.bbox[3] + 150, h: 120, s: `CORTE ${c} - ${r.qtd} BLOCOS IGUAIS`, l: TXT, rot: 0, just: 1 });
    if (dd) montarFolha(mc, dd);
    return mc;
  }
  // projeto: uma folha A0 por corte, lado a lado (dds[i] = dados da folha do corte i)
  function projeto(lista, dds) {
    const { shiftModel } = X(), out = { prims: [], items: [], linhas: [], textos: [] };
    let dir = 0;
    lista.forEach((r, i) => {
      const mc = modelo(r, r.nome || String.fromCharCode(65 + i), dds ? dds[i] : null);
      shiftModel(mc, dir - mc.bbox[0], -mc.bbox[1]); dir = mc.bbox[2] + 0.1 * (mc.bbox[2] - mc.bbox[0]);
      for (const k of ['prims', 'items', 'linhas', 'textos']) out[k] = out[k].concat(mc[k]);
    });
    return out;
  }
  const dxf = (r, corte, dd) => DXF.dxfLateral(null, '', modelo(r, corte, dd));
  const dxfProjeto = (lista, dds) => DXF.dxfLateral(null, '', projeto(lista, dds));
  const svg = (r, vista) => DXF.svgModelo(vista === 'lateral' ? lateral(r, 'VISTA LATERAL') : vista === 'superior' ? superior(r, 'VISTA SUPERIOR') : frontal(r, 'VISTA FRONTAL'));

  const PPDesenho = { frontal, lateral, superior, modelo, projeto, dxf, dxfProjeto, svg };
  if (typeof module !== 'undefined' && module.exports) module.exports = PPDesenho; else root.PPDesenho = PPDesenho;
})(typeof window !== 'undefined' ? window : globalThis);
