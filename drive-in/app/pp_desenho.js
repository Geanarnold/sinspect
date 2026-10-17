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
  // ---- longarina tubo com garra (blocos PP_LONG_TB80_FR / PP_LONG_TB110_FR, dos DXF CO040012 e CO040015), layer PP_LONGARINA (laranja)
  // bloco: x = 0 na ponta dos dentes da garra esquerda, face externa da garra (= face da coluna) em x = 21,2; y = 0 no topo do perfil (apoio)
  const LG_DENTE = 21.2, LG_PLACA = 3.6, LG_TUBO = 40; // dentes que entram na coluna; chapa da garra; largura do tubo (F 246: L = 40)
  function longFrontal(TB, L) {
    const BL = root.BLOCOS_PP || {}, base = TB <= 80 ? BL.PP_LONG_TB80_FR : BL.PP_LONG_TB110_FR, hBase = TB <= 80 ? 80 : 110;
    if (!base) return null;
    const W0 = 2299.3 + 2 * LG_DENTE, meio = W0 / 2, dL = L - 2299.3, dH = TB - hBase, xa = LG_DENTE + LG_PLACA - 0.5, xb = W0 - LG_DENTE - LG_PLACA + 0.5;
    // estica o comprimento (pontos à direita do meio) e a altura do tubo (só o tubo: topo sobe dH, depois tudo desce dH → garra fica 35 mm abaixo do perfil)
    return base.map((q) => ({ t: 'p', l: 'PP_LONGARINA', p: q.p.map(([x, y]) => {
      const noTubo = x > xa && x < xb && y > -(hBase - 3.5) / 2;
      return [x > meio ? x + dL : x, (noTubo ? y + dH : y) - dH];
    }) }));
  }
  // corte da longarina na lateral: tubo (40 × TB − 3,5) encostado na garra (chapa vista de frente, 250 ou 150 de altura, 35 mm abaixo do perfil)
  function longCorte(TB, gH, lado) {
    const out = [], seg = (a, b, c, d) => out.push({ t: 'p', l: 'PP_LONGARINA', p: [[a, b], [c, d]] }), box = (x0, y0, x1, y1) => { seg(x0, y0, x1, y0); seg(x1, y0, x1, y1); seg(x1, y1, x0, y1); seg(x0, y1, x0, y0); };
    const h = TB - 3.5, s = lado; // lado: −1 = longarina de frente (à esquerda do quadro), +1 = de fundo
    box(0, -h - 35, s * LG_PLACA, -h - 35 + gH);                 // garra (chapa) colada na face da coluna
    box(s * LG_PLACA, -h, s * (LG_PLACA + LG_TUBO), 0);          // tubo em corte
    box(s * (LG_PLACA + 1.5), -h + 1.5, s * (LG_PLACA + LG_TUBO - 1.5), -1.5); // parede #1,5
    return out;
  }
  // vista superior: tubo de 40 entre as garras (chapa 3,6 × 60) – y = 0 na face da coluna, tubo para fora (sinal)
  function longTopo(L, sinal) {
    const out = [], box = (x0, y0, x1, y1) => [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]].forEach(([a, b, c, d]) => out.push({ t: 'p', l: 'PP_LONGARINA', p: [[a, b], [c, d]] }));
    box(0, 0, LG_PLACA, sinal * 60); box(L - LG_PLACA, 0, L, sinal * 60); box(LG_PLACA, 0, L - LG_PLACA, sinal * LG_TUBO);
    return out;
  }
  const piso = (m, x0, x1) => { const { piso: pz, nomeBloco } = X(), n = Math.ceil((x1 - x0) / 1000); for (let k = 0; k < n; k++) m.put(pz(k === 0, k === n - 1), x0 + k * 1000, 0, '0', nomeBloco('DI_PISO', k === 0 ? 'INI' : k === n - 1 ? 'FIM' : '')); };

  // eixos das colunas: cada módulo tem a sua longarina (vão livre = comprimento da longarina)
  const eixos = (r) => { const col = r.entradas.col, xs = [col / 2]; for (const md of r.modulos) xs.push(xs[xs.length - 1] + md.L + col); return xs; };

  // ---- vista frontal: módulos lado a lado, cada um com níveis, longarina e paletes próprios; colunas com a altura de cada linha
  function frontal(r, titulo) {
    const m = novoModelo(), { colunaFrontal, nomeBloco, nb, geoPalete, clone } = X();
    const E = r.entradas, col = E.col, xs = eixos(r), Hmax = r.dimensoes.altura;
    // cotas de comprimento (cada longarina e total) sempre 500 mm acima do palete mais alto (Gean) — não cruzam paletes nem colunas
    const yCota = Math.max(Hmax, ...r.modulos.map((md) => (md.niveis.length ? md.niveis[md.niveis.length - 1] : 0) + md.hp)) + 500;
    xs.forEach((x, j) => m.put(colunaFrontal(col, r.colunasH[j]), x, 0, 'MONTANTE', nomeBloco('PP_COLUNA_FRONTAL', col, 'H' + r.colunasH[j])));
    // tala de junção (SA040045, blank 99 x 227 #2,65) na emenda da coluna: barra inferior de 8500 + superior; tala centrada na junta
    const yJ = r.emendaY + X().BASE_BARRA, tala = [...m.caixa(-col / 2 + 6, -113.5, col / 2 - 6, 113.5, 'CANELEIRA_HACHURA'), { t: 'p', l: 'CANELEIRA_HACHURA', p: [[-col / 2, 0], [col / 2, 0]] }];
    xs.forEach((x, j) => { if (r.colunasH[j] > r.emendaY) { m.put(clone(tala), x, yJ, 'CANELEIRA_HACHURA', nomeBloco('PP_TALA_JUNCAO', col)); m.text(x + col / 2 + 40, yJ - 30, 70, 'TALA DE JUNÇÃO', 'COTAS', 0, 0, 'ROMANS'); } });
    r.modulos.forEach((md, i) => {
      // longarina (des. 0004.0001.02.001): perfil com altura TB − 3,5, garras de 3,7 mm nas pontas, 35 mm abaixo do perfil (150 ou 250 de altura)
      const L = md.L, hP = md.TB - 3.5, gH = md.garraH, gE = 3.7, x0 = xs[i] + col / 2;
      const blk = longFrontal(md.TB, L), long = blk || [...m.caixa(gE, -hP, L - gE, 0, 'PP_LONGARINA'), ...m.caixa(0, -hP - 35, gE, -hP - 35 + gH, 'PP_LONGARINA'), ...m.caixa(L - gE, -hP - 35, L, -hP - 35 + gH, 'PP_LONGARINA')];
      const nomeL = nomeBloco('PP_LONG_FR', 'TB' + md.TB, nb(L)), pal = geoPalete(md.frente, md.hp, true), nomeP = nomeBloco('PP_PALETE_FR', nb(md.frente) + 'X' + nb(md.hp));
      for (const y of md.niveis) m.put(clone(long), blk ? x0 - LG_DENTE : x0, y, 'PP_LONGARINA', nomeL); // garra encostada na face da coluna, dentes dentro dela
      const folga = (L - md.nPal * md.frente) / (md.nPal + 1); // paletes centrados no vão: folgas iguais entre paletes e até as colunas
      for (const y of (md.chao ? [0] : []).concat(md.niveis)) for (let k = 0; k < md.nPal; k++) {
        const xp = x0 + folga + k * (md.frente + folga);
        m.put(clone(pal), xp, y, 'PALETE', nomeP);
        if (md.carga) m.text(xp + md.frente / 2, y + md.hp / 2, 110, `${md.carga} kg`, 'PALETE'); // carga no palete, como no Drive-In
      }
      m.cota(x0, yCota - 1, x0 + L, yCota - 1, 1, `${L}`, false, 'c');
      if (md.tunel) m.text(x0 + L / 2, Math.min(md.niveis[0] || 1000, 2000) / 2, 150, 'TÚNEL', TXT);
      // níveis do módulo: cota corrente na coluna da esquerda do módulo (piso → níveis)
      const marcas = [0, ...md.niveis];
      for (let k = 0; k < marcas.length - 1; k++) m.cota(x0 + 150, marcas[k], x0 + 150, marcas[k + 1], -120, `${marcas[k + 1] - marcas[k]}`, true, 'c');
      md.niveis.forEach((y, k) => m.text(x0 + L - 60, y + 40, 70, `N${k + 1} ${y}`, 'COTAS', 0, 2, 'ROMANS'));
    });
    const xa = xs[0] - col / 2, xb = xs[xs.length - 1] + col / 2;
    piso(m, xa - 1000, xb + 1000);
    m.cota(xa, yCota - 1, xb, yCota - 1, 351, `${Math.round(xb - xa)}`, false, 'g');
    m.cota(xa, 0, xa, r.colunasH[0], 450, `${r.colunasH[0]}`, true, 'g');
    if (r.colunasH.some((h) => h !== r.colunasH[0])) xs.forEach((x, j) => j && m.text(x, r.colunasH[j] + 120, 80, `H ${r.colunasH[j]}`, 'COTAS', 0, 1, 'ROMANS'));
    m.text((xa + xb) / 2, -600, 120, titulo, TXT);
    return { ...m, bbox: [xa - 1500, -900, xb + 1000, yCota + 800] };
  }

  // ---- vista lateral: o quadro mais alto do corte, com as travessas da modulação; longarinas em corte e paletes dos módulos vizinhos
  function lateral(r, titulo, jqSel) {
    const m = novoModelo(), { coluna, sapata, travessaH, travessaD, recortaDiag, mirrorX, translate, clone, nomeBloco, nb, geoPalete } = X();
    const E = r.entradas, P = E.P, CW = 69.8;
    const jq = jqSel != null ? jqSel : r.colunasH.indexOf(Math.max(...r.colunasH)), { H, ys, nD } = r.quadros[jq];
    const viz = [r.modulos[jq - 1], r.modulos[jq]].filter(Boolean), md = viz.reduce((a, b) => (b.niveis.length > a.niveis.length ? b : a));
    const niv = [...new Set([].concat(...viz.map((v) => v.niveis)))].sort((a, b) => a - b), TB = Math.max(...viz.map((v) => v.TB));
    const holeY = (y) => 54.75 + 50 * Math.round((y - 54.75) / 50);
    const inicios = []; for (let f = 0; f < E.fileiras; f++) inicios.push(f * (P + E.entreFileiras));
    // foco na montante (Gean): paletes só em contorno, sem hachura, desenhados primeiro (o quadro fica por cima)
    const palL = geoPalete(E.profPal, md.hp, false), nomeP = nomeBloco('PP_PALETE_LT', nb(E.profPal) + 'X' + nb(md.hp), 'C');
    for (const x0 of inicios) for (const y of (md.chao ? [0] : []).concat(md.niveis)) m.put(clone(palL), x0 + (P - E.profPal) / 2, y, 'PALETE', nomeP);
    const yCota = Math.max(H, (md.niveis.length ? md.niveis[md.niveis.length - 1] : 0) + md.hp) + 500;
    for (const x0 of inicios) {
      const xA = x0 + CW / 2, xB = x0 + P - CW / 2; // eixos das 2 colunas (P = face externa a face externa)
      m.put(coluna(H, true), xA, 0, 'MONTANTE', nomeBloco('DI_COLUNA', 'H' + H, 'D')); m.put(sapata(), xA - 7.35, 0, 'MONTANTE', nomeBloco('DI_SAPATA', 'D'));
      m.put(coluna(H, false), xB, 0, 'MONTANTE', nomeBloco('DI_COLUNA', 'H' + H, 'E')); m.put(mirrorX(sapata()), xB + 7.35, 0, 'MONTANTE', nomeBloco('DI_SAPATA', 'E'));
      const cc = P - 109.1, xm = (xA + xB) / 2, hxL = xm - cc / 2, hxR = xm + cc / 2;
      ys.forEach((y) => m.put(travessaH(hxR - hxL), hxL, holeY(y), 'MONTANTE', nomeBloco('DI_TRAVESSA_H', 'CC' + nb(hxR - hxL))));
      for (let k = 0; k < nD; k++) { // Z (des. 0004.0001.01.022 / .055): todas as diagonais no mesmo sentido, do alto à esquerda para baixo à direita
        const a = [hxL, holeY(ys[k + 1])], b = [hxR, holeY(ys[k])];
        m.put(translate(recortaDiag(travessaD(a, b), xA + CW / 2, xB - CW / 2), -a[0], -a[1]), a[0], a[1], 'MONTANTE', nomeBloco('DI_TRAVESSA_D', nb(b[0] - a[0]) + 'X' + nb(b[1] - a[1])));
      }
      const gH = Math.max(...viz.map((v) => v.garraH)), secF = longCorte(TB, gH, -1), secT = longCorte(TB, gH, 1);
      for (const y of niv) { m.put(clone(secF), x0, y, 'PP_LONGARINA', nomeBloco('PP_LONG_CORTE', 'TB' + TB, 'F')); m.put(clone(secT), x0 + P, y, 'PP_LONGARINA', nomeBloco('PP_LONG_CORTE', 'TB' + TB, 'T')); }
      m.cota(x0, yCota - 1, x0 + P, yCota - 1, 1, `${P}`, false, 'c');
    }
    const xa = 0, xb = inicios[inicios.length - 1] + P;
    if (E.fileiras === 2) m.cota(P, yCota - 1, P + E.entreFileiras, yCota - 1, 1, `${E.entreFileiras}`, false, 'c');
    piso(m, xa - 1500, xb + 1500);
    const marcas = [0, ...ys, H + X().BASE_BARRA].filter((v, k, a) => k === 0 || v - a[k - 1] > 1);
    for (let k = 0; k < marcas.length - 1; k++) m.cota(xa, marcas[k], xa, marcas[k + 1], 300, `${Math.round(marcas[k + 1] - marcas[k])}`, true, 'c');
    m.cota(xa, 0, xa, H + X().BASE_BARRA, 750, `${Math.round(H + X().BASE_BARRA)}`, true, 'g');
    m.text((xa + xb) / 2, -600, 120, titulo, TXT);
    const iguais = r.colunasH.map((h, j) => (h === H ? j + 1 : null)).filter(Boolean);
    if (r.quadros.some((q) => q.H !== H)) m.text((xa + xb) / 2, -780, 80, `QUADRO ${H} mm - COLUNA(S) ${iguais.join(', ')}`, TXT);
    return { ...m, bbox: [xa - 1900, -900, xb + 1200, yCota + 700] };
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
      r.modulos.forEach((md, i) => { m.put(longTopo(md.L, -1), xs[i] + col / 2, y0, 'PP_LONGARINA', nomeBloco('PP_LONG_TOPO', nb(md.L), 'F')); m.put(longTopo(md.L, 1), xs[i] + col / 2, y0 + P, 'PP_LONGARINA', nomeBloco('PP_LONG_TOPO', nb(md.L), 'T')); if (md.tunel) m.text(xs[i] + col / 2 + md.L / 2, y0 + P / 2 - 40, 90, 'TÚNEL', TXT); });
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
    // uma vista lateral por altura de quadro (Gean), da mais alta para a mais baixa, lado a lado
    const alturas = [...new Set(r.colunasH)].sort((a, b) => b - a), varias = alturas.length > 1;
    const laterais = alturas.map((h) => lateral(r, `VISTA LATERAL CORTE ${c}${varias ? ` - QUADRO ${h}` : ''}`, r.colunasH.indexOf(h)));
    laterais.forEach((ml, k) => { if (k) shiftModel(ml, laterais[k - 1].bbox[2] + 400 - ml.bbox[0]); });
    const mL = junta(laterais), mF = frontal(r, `VISTA FRONTAL CORTE ${c}`), mS = superior(r, `VISTA SUPERIOR CORTE ${c}`);
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
  // ---- padrão SUPRA: folha dos tipos de módulo (cada tipo = lateral(is) + frontal de UM módulo) e folha da planta baixa
  function vistasTipo(t) {
    const { shiftModel } = X(), r = t.r, c = t.nome, alturas = [...new Set(r.colunasH)].sort((a, b) => b - a);
    const laterais = alturas.map((h) => lateral(r, `VISTA LATERAL CORTE ${c}`, r.colunasH.indexOf(h)));
    laterais.forEach((ml, k) => { if (k) shiftModel(ml, laterais[k - 1].bbox[2] + 400 - ml.bbox[0]); });
    const mL = junta(laterais), mF = frontal(r, `VISTA FRONTAL CORTE ${c}`);
    shiftModel(mF, mL.bbox[2] + 1200 - mF.bbox[0]);
    const md = r.modulos[0], m = junta([mL, mF]);
    m.textos.push({ x: (mF.bbox[0] + mF.bbox[2]) / 2, y: -800, h: 100, s: `${t.qtdModulos} MÓDULOS ${md.L + 2 * r.entradas.col}x${r.entradas.P}x${r.dimensoes.altura} - ${t.posicoes} POSIÇÕES`, l: TXT, rot: 0, just: 1 });
    return m;
  }
  // quadro "DESCRIÇÕES TÉCNICAS PORTA PALLETS" (como nos projetos SUPRA), em texto + linhas, origem no canto superior esquerdo
  function tabelaTipos(P, x0, y0) {
    const m = novoModelo(), W = [900, 2200, 1700, 1700, 1300, 1600], hL = 220, cab = ['TIPO', 'DIMENSÃO DO MÓDULO', 'EMPILHAMENTO', 'CARGA MÁX. POR PLANO', 'QTD. MÓDULOS', 'CAPACIDADE TOTAL'];
    const linhas = P.tipos.map((t) => { const r = t.r, md = r.modulos[0]; return [t.nome, `${md.L + 2 * r.entradas.col}/${r.entradas.P}/${r.dimensoes.altura}`, `${md.chao ? 'PISO + ' : ''}${String(md.niveis.length).padStart(2, '0')} NÍVEIS`, `${md.cargaPar} KG`, `${t.qtdModulos}`, `${t.posicoes} PALLETS`]; });
    const todas = [cab, ...linhas, ['', '', '', '', 'TOTAL', `${P.posicoes} PALLETS`]], Wt = W.reduce((a, b) => a + b, 0);
    m.text(x0 + Wt / 2, y0 + 120, 120, 'DESCRIÇÕES TÉCNICAS PORTA PALLETS', TXT);
    todas.forEach((row, i) => { let x = x0; const y = y0 - i * hL; m.line(x0, y, x0 + Wt, y, 'COTAS'); row.forEach((v, k) => { m.text(x + W[k] / 2, y - hL * 0.65, 80, String(v), 'COTAS', 0, 1, 'ROMANS'); x += W[k]; }); });
    m.line(x0, y0 - todas.length * hL, x0 + Wt, y0 - todas.length * hL, 'COTAS');
    let x = x0; for (const w of [0, ...W]) { x += w; m.line(x, y0, x, y0 - todas.length * hL, 'COTAS'); }
    return { ...m, bbox: [x0 - 100, y0 - todas.length * hL - 100, x0 + Wt + 100, y0 + 300] };
  }
  // planta baixa: fileiras de cima para baixo, corredor entre elas; módulos rotulados "A 01…" (numeração por trecho contínuo do mesmo tipo)
  function planta(P, titulo) {
    const m = novoModelo(), { clone, nomeBloco, nb } = X(), Q = P.fileiras.length ? P.fileiras[0].r.entradas : null;
    if (!Q) return { ...m, bbox: [0, 0, 1000, 1000] };
    const col = Q.col, Pq = Q.P, MONT = (root.BLOCOS || {})['DI_MONT_' + col];
    const quadro = () => (MONT ? clone(MONT).map((q) => ({ ...q, p: q.p && q.p.map((v) => [v[0], v[1] < -512.5 ? v[1] - (Pq - 1025) : v[1]]), c: q.c && [q.c[0], q.c[1] < -512.5 ? q.c[1] - (Pq - 1025) : q.c[1]] })) : m.caixa(-col / 2, -Pq, col / 2, 0, 'MONTANTE'));
    let y = 0, Wmax = 0; const tops = [];
    for (const f of P.fileiras) {
      const xs = eixos(f.r), W = xs[xs.length - 1] + col / 2, prof = f.dupla ? 2 * Pq + Q.entreFileiras : Pq, yTopo = y;
      Wmax = Math.max(Wmax, W); tops.push([yTopo, prof]);
      for (let lin = 0; lin < (f.dupla ? 2 : 1); lin++) {
        const yF = yTopo - lin * (Pq + Q.entreFileiras); // face de cima do quadro desta linha
        for (const x of xs) m.put(quadro(), x, yF, 'MONTANTE', nomeBloco('DI_PL_QUADRO', col, nb(Pq)));
        let ant = null, n = 0;
        f.r.modulos.forEach((md, i) => {
          const x0 = xs[i] + col / 2, tp = f.rot[i].tipo; n = tp === ant ? n + 1 : 1; ant = tp;
          m.put(longTopo(md.L, 1), x0, yF, 'PP_LONGARINA', nomeBloco('PP_LONG_TOPO', nb(md.L), 'T')); m.put(longTopo(md.L, -1), x0, yF - Pq, 'PP_LONGARINA', nomeBloco('PP_LONG_TOPO', nb(md.L), 'F'));
          m.text(x0 + md.L / 2, yF - Pq / 2 - 50, Math.min(220, Pq / 4), `${tp} ${String(n).padStart(2, '0')}`, TXT, 0, 1, 'ROMANS');
        });
        if (f.dupla && lin === 0) for (const x of xs) m.line(x, yF - Pq, x, yF - Pq - Q.entreFileiras, 'FOLHA_NOTA'); // distanciador central
      }
      m.cota(0, yTopo + 60, W, yTopo + 60, 300, `${Math.round(W)}`, false, 'p');
      m.cota(0, yTopo, 0, yTopo - prof, 400, `${prof}`, true, 'p');
      m.text(-900, yTopo - prof / 2, 160, f.nome, TXT, 90, 1);
      y = yTopo - prof - (f.corredor || 0);
      if (f.corredor) m.cota(0, yTopo - prof, 0, y, 400, `${f.corredor}`, true, 'p');
    }
    const yFim = tops.length ? tops[tops.length - 1][0] - tops[tops.length - 1][1] : 0;
    m.cota(Wmax, 0, Wmax, yFim, -900, `${Math.round(-yFim)}`, true, 'g');
    m.text(Wmax / 2, yFim - 900, 220, titulo || 'PLANTA BAIXA', TXT);
    return { ...m, bbox: [-1900, yFim - 1400, Wmax + 1600, 1200] };
  }
  // projeto completo: folha 1 = tipos de módulo (+ quadro das descrições), folha 2 = planta baixa; dds = [dados folha 1, dados folha 2]
  function projetoPP(P, dds) {
    const { shiftModel, montarFolha } = X(), out = { prims: [], items: [], linhas: [], textos: [] };
    // tipos em grade (colunas × linhas): testa de 1 a n colunas e fica com a que deixa a maior escala na folha A0
    const montaGrade = (nc) => {
      const bs = P.tipos.map((t) => vistasTipo(t)); let yTop = 0;
      for (let i = 0; i < bs.length; i += nc) {
        const linha = bs.slice(i, i + nc), hMax = Math.max(...linha.map((b) => b.bbox[3] - b.bbox[1]));
        let x = 0; for (const b of linha) { shiftModel(b, x - b.bbox[0], yTop - b.bbox[3]); x = b.bbox[2] + 1500; }
        yTop -= hMax + 1200;
      }
      const f = junta(bs), t = tabelaTipos(P, f.bbox[0] + 400, f.bbox[1] - 600);
      return { f, t, esc: X().escalaFolha(junta([f, t]).bbox) || 0 };
    };
    let best = null; for (let nc = 1; nc <= Math.max(1, P.tipos.length); nc++) { const g = montaGrade(nc); if (!best || g.esc <= best.esc) best = g; } // empate: mais colunas (folha é paisagem)
    const f1 = best.f, tb = best.t;
    const aviso = root.PPEngine ? root.PPEngine.AVISO_ESTRUTURAL : '';
    if (aviso) tb.textos.push({ x: tb.bbox[0] + 100, y: tb.bbox[1] - 300, h: 90, s: aviso, l: TXT, rot: 0, just: 0 });
    tb.bbox[1] -= 500;
    const fo1 = junta([f1, tb]), fo2 = planta(P, 'PLANTA BAIXA');
    let dir = 0;
    [[fo1, dds && dds[0]], [fo2, dds && dds[1]]].forEach(([mc, dd]) => {
      if (dd) montarFolha(mc, dd);
      shiftModel(mc, dir - mc.bbox[0], -mc.bbox[1]); dir = mc.bbox[2] + 0.1 * (mc.bbox[2] - mc.bbox[0]);
      for (const k of ['prims', 'items', 'linhas', 'textos']) out[k] = out[k].concat(mc[k]);
    });
    return out;
  }
  const dxfPP = (P, dds) => DXF.dxfLateral(null, '', projetoPP(P, dds));
  const svgPlanta = (P) => DXF.svgModelo(planta(P, 'PLANTA BAIXA'));
  const svgTipo = (t, vista) => DXF.svgModelo(vista === 'lateral' ? lateral(t.r, `VISTA LATERAL CORTE ${t.nome}`) : frontal(t.r, `VISTA FRONTAL CORTE ${t.nome}`));
  const dxf = (r, corte, dd) => DXF.dxfLateral(null, '', modelo(r, corte, dd));
  const dxfProjeto = (lista, dds) => DXF.dxfLateral(null, '', projeto(lista, dds));
  const svg = (r, vista) => DXF.svgModelo(vista === 'lateral' ? lateral(r, 'VISTA LATERAL') : vista === 'superior' ? superior(r, 'VISTA SUPERIOR') : frontal(r, 'VISTA FRONTAL'));

  const PPDesenho = { frontal, lateral, superior, modelo, projeto, dxf, dxfProjeto, svg, planta, projetoPP, dxfPP, svgPlanta, svgTipo };
  if (typeof module !== 'undefined' && module.exports) module.exports = PPDesenho; else root.PPDesenho = PPDesenho;
})(typeof window !== 'undefined' ? window : globalThis);
