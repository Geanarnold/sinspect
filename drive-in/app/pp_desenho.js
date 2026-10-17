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

  // ---- vista frontal: módulos de longarina entre colunas (vão livre = comprimento da longarina), paletes em cada nível
  function frontal(r, titulo) {
    const m = novoModelo(), { colunaFrontal, nomeBloco, nb, geoPalete } = X();
    const E = r.entradas, Lg = r.longarina, H = r.dimensoes.altura, col = E.col, L = Lg.L, TB = Lg.TB;
    const xs = []; for (let i = 0; i <= E.modulos; i++) xs.push(i * (L + col) + col / 2);
    for (const x of xs) m.put(colunaFrontal(col, H), x, 0, 'MONTANTE', nomeBloco('PP_COLUNA_FRONTAL', col, 'H' + H));
    // longarina (des. 0004.0001.02.001): perfil com altura TB − 3,5, garras de 3,7 mm nas pontas, 35 mm abaixo do perfil (150 ou 250 de altura)
    const hP = TB - 3.5, gH = Lg.garraH, gE = 3.7;
    const long = [...m.caixa(gE, -hP, L - gE, 0, 'LONGARINA'), { t: 'p', l: 'LONGARINA', p: [[gE, -hP + 3.5], [L - gE, -hP + 3.5]] }, { t: 'p', l: 'LONGARINA', p: [[gE, -3.5], [L - gE, -3.5]] },
      ...m.caixa(0, -hP - 35, gE, -hP - 35 + gH, 'LONGARINA'), ...m.caixa(L - gE, -hP - 35, L, -hP - 35 + gH, 'LONGARINA')];
    const nomeL = nomeBloco('PP_LONG_FRONTAL', 'TB' + TB, nb(L));
    const pal = geoPalete(E.frente, E.hp, true), nomeP = nomeBloco('PP_PALETE_FR', nb(E.frente) + 'X' + nb(E.hp));
    const camadas = (E.chao ? [0] : []).concat(r.niveis);
    for (let i = 0; i < E.modulos; i++) {
      const x0 = xs[i] + col / 2;
      for (const y of r.niveis) m.put(X().clone(long), x0, y, 'LONGARINA', nomeL);
      // paletes centrados no vão: folgas iguais entre paletes e até as colunas
      const folga = (L - E.nPal * E.frente) / (E.nPal + 1);
      for (const y of camadas) for (let k = 0; k < E.nPal; k++) m.put(X().clone(pal), x0 + folga + k * (E.frente + folga), y, 'PALETE', nomeP);
    }
    const xa = xs[0] - col / 2, xb = xs[E.modulos] + col / 2;
    piso(m, xa - 1000, xb + 1000);
    // cotas: vão livre de cada módulo e total em cima; níveis (apoio) à esquerda; altura da coluna
    for (let i = 0; i < E.modulos; i++) m.cota(xs[i] + col / 2, H, xs[i + 1] - col / 2, H, 300, `${L}`, false, 'c');
    m.cota(xa, H, xb, H, 650, `${Math.round(xb - xa)}`, false, 'g');
    const marcas = [0, ...r.niveis];
    for (let k = 0; k < marcas.length - 1; k++) m.cota(xa, marcas[k], xa, marcas[k + 1], 300, `${marcas[k + 1] - marcas[k]}`, true, 'c');
    m.cota(xa, 0, xa, H, 750, `${H}`, true, 'g');
    r.niveis.forEach((y, k) => m.text(xb + 200, y - 40, 90, `N${k + 1} ${y}`, 'COTAS', 0, 0, 'ROMANS'));
    m.text((xa + xb) / 2, -600, 120, titulo, TXT);
    return { ...m, bbox: [xa - 1900, -900, xb + 1400, H + 1150] };
  }

  // ---- vista lateral: quadro(s) com travessas pela modulação escolhida; corte das longarinas e paletes de lado
  function lateral(r, titulo) {
    const m = novoModelo(), { coluna, sapata, travessaH, travessaD, recortaDiag, mirrorX, translate, clone, nomeBloco, nb, geoPalete } = X();
    const E = r.entradas, H = r.dimensoes.altura, P = E.P, CW = 69.8, { ys, nD } = r.lateral, TB = r.longarina.TB;
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
      // longarinas em corte (frente e fundo, por fora das colunas) e palete de lado centrado no quadro
      const sec = [...m.caixa(0, -TB, 50, 0, 'LONGARINA')], nomeS = nomeBloco('PP_LONG_CORTE', 'TB' + TB);
      for (const y of r.niveis) { m.put(clone(sec), x0 - 50, y, 'LONGARINA', nomeS); m.put(clone(sec), x0 + P, y, 'LONGARINA', nomeS); }
      const pal = geoPalete(E.profPal, E.hp, true), xp = x0 + (P - E.profPal) / 2, nomeP = nomeBloco('PP_PALETE_LT', nb(E.profPal) + 'X' + nb(E.hp));
      for (const y of (E.chao ? [0] : []).concat(r.niveis)) m.put(clone(pal), xp, y, 'PALETE', nomeP);
      m.cota(x0, H, x0 + P, H, 300, `${P}`, false, 'c');
    }
    const xa = 0, xb = inicios[inicios.length - 1] + P;
    if (E.fileiras === 2) m.cota(P, H, P + E.entreFileiras, H, 300, `${E.entreFileiras}`, false, 'c');
    piso(m, xa - 1500, xb + 1500);
    const marcas = [0, ...ys, H + X().BASE_BARRA].filter((v, k, a) => k === 0 || v - a[k - 1] > 1);
    for (let k = 0; k < marcas.length - 1; k++) m.cota(xa, marcas[k], xa, marcas[k + 1], 300, `${Math.round(marcas[k + 1] - marcas[k])}`, true, 'c');
    m.cota(xa, 0, xa, H + X().BASE_BARRA, 750, `${Math.round(H + X().BASE_BARRA)}`, true, 'g');
    m.text((xa + xb) / 2, -600, 120, titulo, TXT);
    return { ...m, bbox: [xa - 1900, -900, xb + 1200, H + 1150] };
  }

  // ---- vista superior: colunas, longarinas (frente e fundo) e travessas em cada fileira
  function superior(r, titulo) {
    const m = novoModelo(), E = r.entradas, L = r.longarina.L, col = E.col, P = E.P;
    const xs = []; for (let i = 0; i <= E.modulos; i++) xs.push(i * (L + col) + col / 2);
    for (let f = 0; f < E.fileiras; f++) {
      const y0 = f * (P + E.entreFileiras);
      for (const x of xs) {
        for (const y of [y0, y0 + P - 70]) m.put(m.caixa(-col / 2, 0, col / 2, 70, 'MONTANTE'), x, y, 'MONTANTE');
        m.line(x, y0 + 70, x, y0 + P - 70, 'Contraventamento');
      }
      for (let i = 0; i < E.modulos; i++) for (const y of [y0 - 50, y0 + P]) m.put(m.caixa(0, 0, L, 50, 'LONGARINA'), xs[i] + col / 2, y, 'LONGARINA');
    }
    const W = xs[E.modulos] + col / 2, D = E.fileiras * P + (E.fileiras - 1) * E.entreFileiras;
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
    const { shiftModel, montarFolha } = X(), c = String(corte || 'A').toUpperCase();
    const mL = lateral(r, `VISTA LATERAL CORTE ${c}`), mF = frontal(r, `VISTA FRONTAL CORTE ${c}`), mS = superior(r, `VISTA SUPERIOR CORTE ${c}`);
    shiftModel(mF, mL.bbox[2] + 1500 - mF.bbox[0]);
    shiftModel(mS, mF.bbox[0] - mS.bbox[0], Math.min(mL.bbox[1], mF.bbox[1]) - 1200 - mS.bbox[3]);
    const aviso = root.PPEngine ? root.PPEngine.AVISO_ESTRUTURAL : '';
    if (aviso) mL.textos.push({ x: mL.bbox[0] + 400, y: -1200, h: 90, s: aviso, l: TXT, rot: 0, just: 0 });
    const info = [['POSIÇÕES', r.posicoes], ['MÓDULOS', `${r.entradas.modulos} x ${r.entradas.fileiras} FILEIRA(S)`], ['NÍVEIS', `${r.entradas.chao ? 'CHÃO + ' : ''}${r.niveis.length}`],
      ['LONGARINA', `TB ${r.longarina.TB} - ${r.longarina.L} mm - ${r.longarina.capacidade != null ? r.longarina.capacidade + ' KG/PAR' : 'SEM CAP. TABELADA'}`],
      ['CARGA POR PALETE', `${r.entradas.carga} kg`], ['PALETE', `${r.entradas.frente} x ${r.entradas.profPal} x ${r.entradas.hp} mm`]];
    const xI = mL.bbox[0] + 400, yI = -1600; // embaixo da lateral, abaixo do aviso
    mL.bbox[1] = Math.min(mL.bbox[1], yI - (info.length + 1) * 170 - 200);
    mL.textos.push({ x: xI, y: yI, h: 110, s: 'INFORMAÇÕES DO PORTA-PALETE', l: TXT, rot: 0, just: 0 });
    info.forEach(([k, v], i) => mL.textos.push({ x: xI, y: yI - (i + 1) * 170, h: 90, s: `${k}: ${v}`, l: TXT, rot: 0, just: 0 }));
    const mc = junta([mL, mF, mS]);
    if (dd) montarFolha(mc, dd);
    return mc;
  }
  const dxf = (r, corte, dd) => DXF.dxfLateral(null, '', modelo(r, corte, dd));
  const svg = (r, vista) => DXF.svgModelo(vista === 'lateral' ? lateral(r, 'VISTA LATERAL') : vista === 'superior' ? superior(r, 'VISTA SUPERIOR') : frontal(r, 'VISTA FRONTAL'));

  const PPDesenho = { frontal, lateral, superior, modelo, dxf, svg };
  if (typeof module !== 'undefined' && module.exports) module.exports = PPDesenho; else root.PPDesenho = PPDesenho;
})(typeof window !== 'undefined' ? window : globalThis);
