// Exporta a vista lateral em DXF R12 usando os blocos DI_* do responsável técnico (blocos.js).
// Layers: MONTANTE (170), Contraventamento (9), COTAS (7), "4 - TEXTO DE ESCALA E VISTA" (2).
(function (root) {
  'use strict';
  const LAYERS = { MONTANTE_HACHURA: 170, BRACO_PARAFUSO: 250, BRACO_HACHURA: 30, LONGARINA_FUNDO: 30, TRILHO: 50, PALETE: 8, PALETE_HACHURA: 32, MONTANTE: 170, Contraventamento: 9, LONGARINA: 3, BRACO: 7, CANELEIRA: 7, CANELEIRA_HACHURA: 2, COTAS: 7, '4 - TEXTO DE ESCALA E VISTA': 2, 0: 7 };
  // DXF R12 não aceita espaços em nomes de layer: nome gravado no arquivo (o AutoCAD mostra estes)
  const LAYER_DXF = { MONTANTE_HACHURA: 'MONTANTE_HACHURA', BRACO_PARAFUSO: 'BRACO_PARAFUSO', CANELEIRA_HACHURA: 'CANELEIRA_HACHURA', BRACO_HACHURA: 'BRACO_HACHURA', LONGARINA_FUNDO: 'LONGARINA_FUNDO', TRILHO: 'TRILHO', PALETE: 'PALETE', MONTANTE: 'MONTANTE', Contraventamento: 'CONTRAVENTAMENTO', LONGARINA: 'LONGARINA', BRACO: 'BRACO', CANELEIRA: 'CANELEIRA', COTAS: 'COTAS', '4 - TEXTO DE ESCALA E VISTA': 'TEXTO_ESCALA_VISTA', 0: '0' };
  const ld = (l) => LAYER_DXF[l] || String(l).replace(/[^A-Za-z0-9_$-]/g, '_');
  const f = (v) => (Math.round(v * 100) / 100).toString();
  const B = () => root.BLOCOS || (typeof require === 'function' ? (global.window && global.window.BLOCOS) : null);

  // ---- utilitários de geometria sobre primitivas {t:'l'|'c'|'p', l:layer, p:[[x,y]..], c:[x,y], r}
  const clone = (prims) => prims.map((q) => ({ t: q.t, l: q.l, p: q.p ? q.p.map((v) => [v[0], v[1]]) : undefined, c: q.c ? [q.c[0], q.c[1]] : undefined, r: q.r }));
  const mapPts = (prims, fn) => { for (const q of prims) { if (q.p) q.p = q.p.map((v) => fn(v)); if (q.c) q.c = fn(q.c); } return prims; };
  // hachura a 45° num retângulo (x0, y0, w, h), linhas a cada 'esp' mm (medido na horizontal): segmentos já recortados no retângulo
  const hachura45 = (x0, y0, w, h, esp) => {
    const out = [];
    for (let c = -h + esp / 2; c < w; c += esp) { // reta x = c + (y − y0) local: começa em (c, 0) e sobe a 45°
      const xa = Math.max(c, 0), xb = Math.min(c + h, w);
      if (xb - xa > 1) out.push([[x0 + xa, y0 + (xa - c)], [x0 + xb, y0 + (xb - c)]]);
    }
    return out;
  };
  // palete visto de lado (Gean: "geometria de palete mesmo"): tábua de baixo (22), 3 tacos de 100 (entre 22 e 128, vãos para o garfo),
  // tabuado de cima (128–150) e a carga acima (contorno + hachura opcional). Origem no canto inferior esquerdo.
  const BASE_PAL = 150;
  function geoPalete(w, h, comHachura) {
    const L = [], seg = (a, b, c, d, l = 'PALETE') => L.push({ t: 'p', l, p: [[a, b], [c, d]] });
    const box = (x0, y0, x1, y1) => { seg(x0, y0, x1, y0); seg(x1, y0, x1, y1); seg(x1, y1, x0, y1); seg(x0, y1, x0, y0); };
    const tb = 22, tc = 100;
    box(0, 0, w, tb); box(0, BASE_PAL - tb, w, BASE_PAL);
    for (const x of [0, (w - tc) / 2, w - tc]) box(x, tb, x + tc, BASE_PAL - tb);
    if (h > BASE_PAL) { box(0, BASE_PAL, w, h); if (comHachura) for (const q of hachura45(0, BASE_PAL, w, h - BASE_PAL, 120)) L.push({ t: 'p', l: 'PALETE_HACHURA', p: q }); }
    return L;
  }
  const translate = (prims, dx, dy) => mapPts(prims, (v) => [v[0] + dx, v[1] + dy]);
  const mirrorX = (prims) => mapPts(prims, (v) => [-v[0], v[1]]);
  const rotate = (prims, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return mapPts(prims, (v) => [v[0] * c - v[1] * s, v[0] * s + v[1] * c]); };
  // estica ao longo de X: pontos com x > xMid deslocam delta
  const stretchX = (prims, xMid, delta) => mapPts(prims, (v) => [v[0] > xMid ? v[0] + delta : v[0], v[1]]);
  // nome de bloco DXF (R12: letras, números, _ - $): DI_<PEÇA>_<parâmetros>; decimais com "-" (710.9 → 710-9)
  const nb = (v) => String(Math.round(v * 10) / 10).replace('.', '-');
  // DXF R12 (AutoCAD): nome de bloco com no máximo 31 caracteres; acima disso o AutoCAD descarta o arquivo inteiro
  const MAX_NOME = 31;
  const hash4 = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(36).toUpperCase().padStart(4, '0').slice(-4); };
  const limitarNome = (n) => n.length <= MAX_NOME ? n : n.slice(0, MAX_NOME - 5) + '_' + hash4(n);
  const nomeBloco = (...partes) => limitarNome(partes.filter((p) => p !== '' && p != null).join('_').toUpperCase().replace(/[^A-Z0-9_$-]/g, '_'));
  const circles = (prims) => prims.filter((q) => q.t === 'c').map((q) => q.c);

  // ---- peças paramétricas
  function coluna(H, holesRight) {
    // DI_COLUNA: 1000 mm (linhas 4,75..1004,75), furos a cada 50 a partir de 54,75, largura -19,85..49,9 (eixo em x = 15)
    const src = B().DI_COLUNA, out = [];
    const H0 = 1000, dH = H - H0;
    for (const q of src) {
      const ys = q.p ? q.p.map((v) => v[1]) : [q.c[1]]; const y0 = Math.min(...ys), y1 = Math.max(...ys);
      if (y1 - y0 > 500) { const c = clone([q])[0]; c.p = c.p.map((v) => [v[0], v[1] > 500 ? v[1] + dH : v[1]]); out.push(c); continue; } // linhas longas
      if (y0 > 990) { out.push(translate(clone([q]), 0, dH)[0]); continue; } // topo
      if (y0 < 40) { out.push(clone([q])[0]); continue; } // base
      if (y0 >= 40 && y1 <= 120) { // módulo periódico de 50 mm (furo + detalhe): replica
        for (let k = 0; k * 50 + y1 <= H - 10; k++) out.push(translate(clone([q]), 0, k * 50)[0]);
        continue;
      }
      // demais módulos já cobertos pela replicação do primeiro; ignora
    }
    let r = translate(out, -15, 0); // eixo da coluna em x = 0
    if (!holesRight) r = mirrorX(r);
    return r;
  }

  // coluna na vista frontal (com sapata), conforme VISTA_FRONTAL_COM_DI_LGTOPO.dxf:
  // base da chapa da sapata em y = 0 (piso) e topo da coluna em H; furação oblonga a cada 50 mm com o 1º furo a 25 mm do topo
  // (como a coluna é cortada em múltiplos de 50, os furos ficam a 25 mm das duas pontas)
  const FR_TOPO_FURO = 25;
  const yrq = (q) => { const ys = q.p ? q.p.map((v) => v[1]) : [q.c[1]]; return [Math.min(...ys), Math.max(...ys)]; };
  const longq = (q) => q.p && yrq(q)[1] - yrq(q)[0] > 500;
  function geoFrontal(src) {
    return { Y0: 0, // base da chapa da sapata (y = 0 no bloco) apoiada no piso; placas niveladoras e chumbadores ficam abaixo, no concreto
      Ht: Math.max(...src.filter(longq).map((q) => yrq(q)[1])),           // topo da coluna no bloco
      Hb: Math.min(...src.filter(longq).map((q) => yrq(q)[0])) };         // pé da coluna (acima da sapata)
  }
  function colunaFrontal(c, H) {
    const src = B()['DI_COLUNA_FRONTAL_' + c]; if (!src) return [];
    const { Y0, Ht, Hb } = geoFrontal(src), T = H - Y0, dH = T - Ht, out = [];
    const m0 = Ht - FR_TOPO_FURO - 50;                                    // furo-modelo: 2º de cima no bloco
    for (const q of src) {
      if (longq(q)) { const cq = clone([q])[0]; cq.p = cq.p.map((v) => [v[0], v[1] > Ht - 1 ? v[1] + dH : v[1]]); out.push(cq); continue; }
      const [y0, y1] = yrq(q);
      if (y1 < Hb + 12) { out.push(clone([q])[0]); continue; }             // sapata + pé
      if (y0 > Ht - 1) { out.push(translate(clone([q]), 0, dH)[0]); continue; } // tampa do topo
      if (y0 >= m0 - 25 && y1 <= m0 + 25) {                                 // módulo do furo: replica do topo para baixo
        for (let k = 0; ; k++) { const cy = T - FR_TOPO_FURO - 50 * k; if (cy < Hb + FR_TOPO_FURO - 1) break; out.push(translate(clone([q]), 0, cy - m0)[0]); }
      }
    }
    return translate(out, 0, Y0);
  }
  // centros dos furos frontais em y global, de baixo para cima
  function furosFrontal(c, H) {
    const src = B()['DI_COLUNA_FRONTAL_' + c], ys = []; if (!src) return ys;
    const { Y0, Hb } = geoFrontal(src);
    for (let cy = H - FR_TOPO_FURO; cy >= Hb + Y0 + FR_TOPO_FURO - 1; cy -= 50) ys.unshift(cy);
    return ys;
  }
  const HOLE_DX = 17.9; // furo a 17,9 mm do eixo (32,9 - 15)
  function travessaH(ccNovo) {
    const src = clone(B().DI_TRAVESSA_H), [c1, c2] = circles(src), cc0 = c2[0] - c1[0];
    return translate(stretchX(src, (c1[0] + c2[0]) / 2, ccNovo - cc0), -c1[0], -c1[1]); // origem no 1º furo
  }
  function travessaD(p1, p2) {
    const src = clone(B().DI_TRAVESSA_D), [c1, c2] = circles(src);
    const a0 = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]), L0 = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), a = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    let r = translate(src, -c1[0], -c1[1]); r = rotate(r, -a0); r = stretchX(r, L0 / 2, L - L0); r = rotate(r, a);
    return translate(r, p1[0], p1[1]);
  }
  // diagonal terminando rente à face interna das colunas (Gean): as bordas (linhas longas) são recortadas em x = xa…xb e cada ponta
  // é fechada com um corte vertical entre as duas bordas; porcas e furos (dentro da coluna) continuam no desenho
  function recortaDiag(prims, xa, xb) {
    const out = [], bordas = [];
    for (const q of prims) {
      if (q.t === 'l' && Math.hypot(q.p[1][0] - q.p[0][0], q.p[1][1] - q.p[0][1]) > 100) {
        let [a, b] = q.p[0][0] <= q.p[1][0] ? [q.p[0], q.p[1]] : [q.p[1], q.p[0]];
        const yAt = (x) => a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
        const x0 = xa, x1 = xb; if (b[0] < xa || a[0] > xb) continue; // a reta da borda vai exatamente de face a face (estende a borda que terminava antes)
        const seg = { t: 'l', l: q.l, p: [[x0, yAt(x0)], [x1, yAt(x1)]] }; out.push(seg); bordas.push(seg);
      } else out.push(q);
    }
    if (bordas.length >= 2) for (const k of [0, 1]) {
      const ys = bordas.map((sg) => sg.p[k][1]), x = bordas[0].p[k][0];
      if (bordas.every((sg) => Math.abs(sg.p[k][0] - x) < 0.01)) out.push({ t: 'l', l: bordas[0].l, p: [[x, Math.min(...ys)], [x, Math.max(...ys)]] });
    }
    return out;
  }
  function uniao(distFuros) {
    // ancorada nos furos: 1º furo na coluna solteira; parafusos da chapa posterior na face de trás da coluna do quadro (eixo − 17,9), como no DXF "vista lateral com união"
    const src = clone(B().DI_UNIAO), cs = circles(src), c1 = cs[0], xPlaca = Math.max(...cs.map((c) => c[0]));
    return translate(stretchX(src, (c1[0] + xPlaca) / 2, distFuros - (xPlaca - c1[0])), -c1[0], -c1[1]);
  }
  function topo(A) { const src = clone(B().DI_TOPO), A0 = 820; return stretchX(src, 340, A - A0); } // [CONFIRMAR A0 = 820]
  const sapata = () => clone(B().DI_SAPATA);
  // piso de 1000 em 1000: remove as bordas verticais internas para não aparecer emenda entre trechos
  const piso = (primeiro, ultimo) => clone(B().DI_PISO).filter((q) => {
    if (q.t !== 'l' || Math.abs(q.p[0][0] - q.p[1][0]) > 0.01) return true;
    const x = q.p[0][0]; if (Math.abs(x) < 0.01) return primeiro; if (Math.abs(x - 1000) < 0.01) return ultimo; return true;
  });

  // ---- escrita DXF
  function emit(out, prims, dx, dy, layerDefault) {
    for (const q of prims) {
      const lay = ld(q.l && q.l !== '0' ? q.l : layerDefault);
      if (q.t === 'l') out.push('0', 'LINE', '8', lay, '10', f(q.p[0][0] + dx), '20', f(q.p[0][1] + dy), '30', '0', '11', f(q.p[1][0] + dx), '21', f(q.p[1][1] + dy), '31', '0');
      else if (q.t === 'c') out.push('0', 'CIRCLE', '8', lay, '10', f(q.c[0] + dx), '20', f(q.c[1] + dy), '30', '0', '40', f(q.r));
      else if (q.t === 's') { // SOLID: vértices na ordem do R12 (1, 2, 3, 4 = inf-esq, inf-dir, sup-esq, sup-dir)
        out.push('0', 'SOLID', '8', lay);
        q.p.forEach((v, k) => out.push(String(10 + k), f(v[0] + dx), String(20 + k), f(v[1] + dy), String(30 + k), '0'));
      }
      else if (q.t === 'p') {
        out.push('0', 'POLYLINE', '8', lay, '66', '1', '10', '0', '20', '0', '30', '0', '70', '0');
        for (const v of q.p) out.push('0', 'VERTEX', '8', lay, '10', f(v[0] + dx), '20', f(v[1] + dy), '30', '0');
        out.push('0', 'SEQEND');
      }
    }
  }
  // cota no padrão do projeto 260324 (estilos IGOR): marca oblíqua nas pontas, texto sobre a linha, fonte ROMANS
  // tamanhos: 'c' corrente (texto 80, marca 25) · 'p' principal (150, 40) · 'g' total (220, 50)
  function fazCota(line, text) {
    const T = { c: [80, 25], p: [150, 40], g: [220, 50] };
    return (x1, y1, x2, y2, off, label, vertical, tam = 'p') => {
      const [h, a] = T[tam] || T.p, ext = a * 2, s = Math.sign(off) || 1;
      if (!vertical) {
        const y = y1 + off;
        line(x1, y1, x1, y + s * ext, 'COTAS'); line(x2, y2, x2, y + s * ext, 'COTAS'); line(x1, y, x2, y, 'COTAS');
        for (const x of [x1, x2]) line(x - a, y - a, x + a, y + a, 'COTAS');
        text((x1 + x2) / 2, y + h * 0.35, h, label, 'COTAS', 0, 1, 'ROMANS');
      } else {
        const x = x1 - off;
        line(x1, y1, x - s * ext, y1, 'COTAS'); line(x2, y2, x - s * ext, y2, 'COTAS'); line(x, y1, x, y2, 'COTAS');
        for (const y of [y1, y2]) line(x - a, y - a, x + a, y + a, 'COTAS');
        text(x - h * 0.35, (y1 + y2) / 2, h, label, 'COTAS', 90, 1, 'ROMANS');
      }
    };
  }
  // ---- montagem da vista (primitivas em coordenadas de mundo + cotas/textos), usada pelo DXF e pela tela
  function montarLateral(r, titulo) {
    const { ys, espacos, solteira, nD } = r.lateral, H = r.dimensoes.altura, n = espacos.length;
    // A1..An são medidas face a face (externas), como no DRIVE_IN.dxf:
    //  quadro = face externa a face externa das 2 colunas; vão entre quadros = vão livre entre faces;
    //  coluna solteira = face esquerda da solteira até a face esquerda da 1ª coluna do quadro.
    const CW = 69.8; // largura da coluna na vista lateral (DI_COLUNA)
    const cum = [0]; espacos.forEach((a) => cum.push(cum[cum.length - 1] + a)); // cotas A1..An
    const lf = [0];
    espacos.forEach((a, i) => { const quadroI = solteira ? i % 2 === 1 : i % 2 === 0; lf.push(lf[i] + (solteira && i === 0 ? a : quadroI ? a - CW : a + CW)); });
    const xs = lf.map((v) => v + CW / 2); // eixos das colunas
    const prims = [], linhas = [], textos = [];
    const items = []; // cada peça vira um bloco no DXF (definição local + INSERT)
    const put = (ps, dx, dy, layerDefault, nome) => {
      for (const q of ps) q.l = q.l && q.l !== '0' ? q.l : layerDefault;
      if (nome) items.push({ nome, local: clone(ps), x: dx, y: dy, l: layerDefault });
      for (const q of ps) { const w = translate([q], dx, dy)[0]; if (nome) w.blk = 1; prims.push(w); }
    };
    const line = (x1, y1, x2, y2, layer) => linhas.push({ l: layer, p: [[x1, y1], [x2, y2]] });
    const text = (x, y, h, s, layer, rot = 0, just = 1, st) => textos.push({ x, y, h, s, l: layer, rot, just, st });
    const cota = fazCota(line, text);
    const holeY = (y) => 54.75 + 50 * Math.round((y - 54.75) / 50);
    const holesRight = (i) => (solteira ? i === 0 || i % 2 === 1 : i % 2 === 0) && i < n;
    xs.forEach((x, i) => { const hr = holesRight(i), lado = hr ? 'D' : 'E'; put(coluna(H, hr), x, 0, 'MONTANTE', nomeBloco('DI_COLUNA', 'H' + H, lado)); put(hr ? sapata() : mirrorX(sapata()), x + (hr ? -7.35 : 7.35), 0, 'MONTANTE', nomeBloco('DI_SAPATA', lado)); });
    for (let i = 0; i < n; i++) {
      const uni = solteira && i === 0, quadro = solteira ? i % 2 === 1 : i % 2 === 0;
      // travessa: furos c/c = A − 109,1 (regra do cadastro), centrada no quadro
      const ccQ = espacos[i] - 109.1, xm = (xs[i] + xs[i + 1]) / 2;
      const hxL = quadro ? xm - ccQ / 2 : xs[i] + HOLE_DX, hxR = quadro ? xm + ccQ / 2 : xs[i + 1] - HOLE_DX;
      if (quadro) {
        ys.forEach((y) => put(travessaH(hxR - hxL), hxL, holeY(y), 'MONTANTE', nomeBloco('DI_TRAVESSA_H', 'CC' + nb(hxR - hxL))));
        for (let k = 0; k < nD; k++) {
          const p1 = [hxL, holeY(ys[k])], p2 = [hxR, holeY(ys[k + 1])];
          put(translate(recortaDiag(travessaD(p1, p2), xs[i] + CW / 2, xs[i + 1] - CW / 2), -p1[0], -p1[1]), p1[0], p1[1], 'MONTANTE', nomeBloco('DI_TRAVESSA_D', nb(p2[0] - p1[0]) + 'X' + nb(p2[1] - p1[1])));
        }
      }
      if (uni) ys.forEach((y) => put(uniao((xs[i + 1] - HOLE_DX) - hxL), hxL, holeY(y), 'MONTANTE', nomeBloco('DI_UNIAO', nb((xs[i + 1] - HOLE_DX) - hxL))));
      put(topo(xs[i + 1] - xs[i] + CW), xs[i], H, 'Contraventamento', nomeBloco('DI_TOPO', nb(xs[i + 1] - xs[i] + CW))); // DI_TOPO desenhado para quadro de 820 externo [CONFIRMAR]
      cota(cum[i], H, cum[i + 1], H, 300, `${Math.round(espacos[i])}`, false, 'c');
    }
    // longarina de túnel em cada nível (topo = apoio do palete), face a face da estrutura; trilho guia no piso a partir da frente (lado direito)
    const L = r.lateral, Lt = cum[n] - cum[0];
    if (L.niveis && L.lgU) for (const yN of L.niveis) {
      const h = L.lgU.A, e = L.lgU.e;
      const cortes = [0, ...(L.juntasTunel || []), Lt]; // barras ≤ 3000 com emenda sobre o braço
      for (let k = 0; k < cortes.length - 1; k++) {
        const Lb = cortes[k + 1] - cortes[k];
        const ps = [[0, 0, Lb, 0], [0, e, Lb, e], [0, h - e, Lb, h - e], [0, h, Lb, h], [0, 0, 0, h], [Lb, 0, Lb, h]].map(([a, b, c, d]) => ({ t: 'p', l: 'LONGARINA', p: [[a, b], [c, d]] }));
        put(ps, cum[0] + cortes[k], yN - h, 'LONGARINA', nomeBloco('DI_LG_TUNEL', 'U' + nb(h), nb(Lb)));
      }
      if (B().DI_EMENDA_LONG) for (const j of L.juntasTunel || []) put(clone(B().DI_EMENDA_LONG), cum[0] + j, yN - h / 2, 'LONGARINA', 'DI_EMENDA_LONG');
    }
    // paletes (Gean): no nível de baixo (chão, + escravo) e no nível mais alto, ao longo de toda a profundidade, com hachura a 45°
    // (layer PALETE_HACHURA) para ler como palete; do fundo (x = 0) para a frente: palete + 25 mm cada
    const Fr = r.frontal, hp = Fr.alturaPalete, pp = r.planta.profPalete, Pn = r.paletesPorRua;
    if (hp > 0 && pp > 0 && Pn > 0) {
      const camadas = [0, ...(Fr.escravo ? [hp] : [])];
      if (L.niveis && L.niveis.length) camadas.push(L.niveis[L.niveis.length - 1]);
      const pal = geoPalete(pp, hp, true);
      for (const y0 of camadas) for (let k = 0; k < Pn; k++) put(clone(pal), cum[0] + k * r.ocupPalete, y0, 'PALETE', nomeBloco('DI_LT_PALETE', nb(pp) + 'X' + nb(hp)));
    }
    if (L.trilho && L.trilho.comp > 0) {
      const Tl = L.trilho.comp, th = L.trilho.alt;
      const ps = [[0, 0, Tl, 0], [Tl, 0, Tl, th], [Tl, th, 0, th], [0, th, 0, 0]].map(([a, b, c, d]) => ({ t: 'p', l: 'TRILHO', p: [[a, b], [c, d]] }));
      put(ps, cum[n] + L.trilho.frente - Tl, 0, 'TRILHO', nomeBloco('DI_TRILHO_GUIA', nb(Tl)));
      text(cum[n] + 200, -250, 70, 'FRENTE', '4 - TEXTO DE ESCALA E VISTA');
    }
    cota(cum[0], H, cum[n], H, 650, `${Math.round(cum[n] - cum[0])}`, false, 'g');
    // corrente das travessas (piso → 1ª, vãos, última → topo) e altura total, à esquerda
    const marcasY = [0, ...ys, H].filter((v, k, a) => k === 0 || v - a[k - 1] > 1);
    for (let k = 0; k < marcasY.length - 1; k++) cota(cum[0], marcasY[k], cum[0], marcasY[k + 1], 300, `${Math.round(marcasY[k + 1] - marcasY[k])}`, true, 'c');
    cota(cum[0], 0, cum[0], H, 750, `${H}`, true, 'g');
    const x0p = xs[0] - 1500, nP = Math.ceil((xs[n] + 1500 - x0p) / 1000);
    for (let k = 0; k < nP; k++) put(piso(k === 0, k === nP - 1), x0p + k * 1000, 0, '0', nomeBloco('DI_PISO', k === 0 ? 'INI' : k === nP - 1 ? 'FIM' : '')); // topo do concreto (y local 0) na base da sapata
    text((xs[0] + xs[n]) / 2, -600, 120, titulo || 'CORTE A - VISTA LATERAL', '4 - TEXTO DE ESCALA E VISTA');
    const tab = [['B', H], ['C', ys[1] - ys[0]], ['A', cum[n]]].concat(espacos.map((a, i) => [`A${i + 1}`, a]));
    tab.forEach(([k, v], i) => text(xs[n] + 1500, H - i * 200, 100, `${k} = ${v} mm`, '4 - TEXTO DE ESCALA E VISTA', 0, 0));
    return { prims, items, linhas, textos, bbox: [xs[0] - 1900, -800, xs[n] + 3200, H + 1150] };
  }

  // ---- vista frontal (olhando para dentro das ruas)
  // braço paramétrico na vista frontal (modelo 0004.0003.01.008 SUP BRAÇO DRIVE IN)
  // origem: eixo da coluna, base do U. lado: +1 = C para a direita, -1 = esquerda, 0 = duplo (os dois lados)
  // U: interno = largura da coluna, chapa 2,65, altura 180; rasgos 14 x 9 a 15 mm das bordas, c/c = largura − 40 (40 na COL 80)
  // C: altura A centralizada no U, passa na frente do U (esconde o U nesse trecho); linhas de dobra a D + 2,3 das bordas
  function bracoParam(col, bal, lado, pf, esp = 2.65, alt = 180) {
    const L = [], ln = (x1, y1, x2, y2) => L.push({ t: 'p', l: 'BRACO', p: [[x1, y1], [x2, y2]] });
    const arc = (cx, cy, r, a0, a1) => { const p = []; for (let k = 0; k <= 8; k++) { const a = (a0 + (a1 - a0) * k / 8) * Math.PI / 180; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } L.push({ t: 'p', l: 'BRACO', p }); };
    const uo = col / 2 + esp, yc0 = (alt - pf.A) / 2, yc1 = yc0 + pf.A;
    const xa = lado === 1 ? -uo : -uo - bal, xb = lado === -1 ? uo : uo + bal;
    // preenchimento sólido laranja (SOLID, R12 não tem HATCH) para diferenciar o braço das longarinas na vista frontal
    const sol = (x0, y0, x1, y1) => L.push({ t: 's', l: 'BRACO_HACHURA', p: [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] });
    sol(-uo, 0, uo, yc0); sol(-uo, yc1, uo, alt); sol(xa, yc0, xb, yc1);
    // U (verticais interrompidas atrás do C)
    for (const x of [-uo, -col / 2, col / 2, uo]) { ln(x, 0, x, yc0); ln(x, yc1, x, alt); }
    ln(-uo, 0, uo, 0); ln(-uo, alt, uo, alt);
    // rasgos oblongos
    const sx = (col - 40) / 2;
    for (const cy of [15, alt - 15]) for (const cx of [-sx, sx]) { arc(cx - 2.5, cy, 4.5, 90, 270); arc(cx + 2.5, cy, 4.5, -90, 90); ln(cx - 2.5, cy + 4.5, cx + 2.5, cy + 4.5); ln(cx - 2.5, cy - 4.5, cx + 2.5, cy - 4.5); }
    // parafusos nos rasgos da frente (INT0648 5/16" + arruela INT0812 Ø20): arruela, cabeça sextavada (1/2" entre faces) e ponta do parafuso
    for (const cy of [15, alt - 15]) for (const cx of [-sx, sx]) {
      L.push({ t: 'c', l: 'BRACO_PARAFUSO', c: [cx, cy], r: 10 }, { t: 'c', l: 'BRACO_PARAFUSO', c: [cx, cy], r: 3.97 });
      const hx = []; for (let k = 0; k <= 6; k++) { const a = (30 + 60 * k) * Math.PI / 180; hx.push([cx + 7.33 * Math.cos(a), cy + 7.33 * Math.sin(a)]); }
      L.push({ t: 'p', l: 'BRACO_PARAFUSO', p: hx });
    }
    // perfil C
    const d = pf.D + 1.15 * pf.D; // linha de tangência da dobra: espessura + raio interno (ri = 1,15·D, como na tala 2025.0066)
    ln(xa, yc0, xb, yc0); ln(xa, yc1, xb, yc1); ln(xa, yc0 + d, xb, yc0 + d); ln(xa, yc1 - d, xb, yc1 - d); ln(xa, yc0, xa, yc1); ln(xb, yc0, xb, yc1);
    // ponta do C (corte do perfil): espessura das abas e da dobra nas extremidades, dá leitura de profundidade
    for (const xe of lado === 0 ? [xa, xb] : lado === 1 ? [xb] : [xa]) { const s = xe > 0 ? -1 : 1; ln(xe + s * pf.D, yc0, xe + s * pf.D, yc0 + pf.B); ln(xe + s * pf.D, yc1, xe + s * pf.D, yc1 - pf.B); }
    return { prims: L, topoC: yc1 };
  }
  const HOLE_FX = { 80: 21.9, 101: 32.4, 122: 43.05 };
  const MAX_RUAS_FRONTAL = 5; // Gean: projetos com mais de 5 ruas mostram só 5 na frontal
  // numeração das posições em planta (Gean): a fileira da frente leva o número da rua (01…R); a fileira seguinte continua (R+1…2R)
  // e assim até o fundo → último palete da última rua = R × P. O número vale para a pilha toda (todos os níveis daquele ponto).
  // Ex.: 28 ruas × 2 paletes: rua 01 = 01 (frente) e 29 (fundo); rua 28 = 28 e 56. Prefixo = nome do corte [CONFIRMAR]
  function numPos(r, corte, rua, prof) {
    const R = Number(r.entradas.ruas), tot = R * r.paletesPorRua;
    const n = prof * R + rua + 1;
    return `${String(corte || 'A').trim().toUpperCase()}${String(n).padStart(Math.max(2, String(tot).length), '0')}`;
  } // furo da face frontal (oblongo), distância ao eixo
  function montarFrontal(r, titulo, corte) {
    // col = largura ocupada na frontal (duplada: 2 × perfil); cp = perfil da montante
    // projeto leve (Gean): a frontal mostra no máximo 5 ruas (RT = total do corte, R = ruas desenhadas); a lista de peças continua com todas
    const cp = Number(r.entradas.coluna), dup = !!r.entradas.dup, col = r.dimensoes.colW || cp, H = r.dimensoes.altura, RT = Number(r.entradas.ruas), R = Math.min(RT, MAX_RUAS_FRONTAL), F = r.frontal, rua = F.larguraRua;
    const prims = [], linhas = [], textos = [], faltam = new Set();
    const comPalete = F.frentePalete > 0 && F.alturaPalete > 0; // paletes só na 1ª rua; nela o zig-zag de fundo não é desenhado (continua na lista)
    const items = []; // cada peça vira um bloco no DXF (definição local + INSERT)
    const put = (ps, dx, dy, layerDefault, nome) => {
      for (const q of ps) q.l = q.l && q.l !== '0' ? q.l : layerDefault;
      if (nome) items.push({ nome, local: clone(ps), x: dx, y: dy, l: layerDefault });
      for (const q of ps) { const w = translate([q], dx, dy)[0]; if (nome) w.blk = 1; prims.push(w); }
    };
    const line = (x1, y1, x2, y2, layer) => linhas.push({ l: layer, p: [[x1, y1], [x2, y2]] });
    const text = (x, y, h, s, layer, rot = 0, just = 1, st) => textos.push({ x, y, h, s, l: layer, rot, just, st });
    const cota = fazCota(line, text);
    const xs = []; for (let i = 0; i <= R; i++) xs.push(i * (rua + col) + col / 2); // eixos das colunas (rua = vão livre entre faces)
    const hy = furosFrontal(cp, H), hx1 = HOLE_FX[cp] || cp / 2 - 18, hx = dup ? cp / 2 + hx1 : hx1; // duplada: oblongo externo da montante do lado da rua
    const pe = hy.length ? hy[0] - FR_TOPO_FURO : 185; // pé da coluna (acima da sapata)
    // braço: o topo do C (apoio do palete) deve ficar no nível ou logo acima (furação de 50 em 50; furo inferior do braço 15 mm acima da base)
    const offApoio = (180 - F.perfilC.A) / 2 + F.perfilC.A;
    const snapApoio = (y) => { for (const h of hy) if (h - 15 + offApoio >= y - 0.01) return h - 15; return hy[hy.length - 1] - 15; };
    const snapBraco = (y) => { let best = hy[0]; for (const h of hy) if (Math.abs(h - 15 - y) < Math.abs(best - 15 - y)) best = h; return best - 15; };
    const topoBraco = []; // altura do apoio do palete em cada nível
    xs.forEach((x, i) => {
      // duplada: duas montantes grudadas, eixos a ±cp/2 do centro da posição
      for (const dx of dup ? [-cp / 2, cp / 2] : [0]) put(colunaFrontal(cp, H), x + dx, 0, 'MONTANTE', nomeBloco('DI_COLUNA_FRONTAL', cp, 'H' + H));
      const w = col / 2 + 6;
      // caneleira 700 mm: mesmo formato do braço — preenchimento sólido (amarelo) + contorno e linhas de dobra por cima (layer CANELEIRA, cor 7)
      const seg = (a1, b1, c1, d1) => ({ t: 'p', l: 'CANELEIRA', p: [[a1, b1], [c1, d1]] });
      const cnl = [{ t: 's', l: 'CANELEIRA_HACHURA', p: [[-w, 0], [w, 0], [-w, 700], [w, 700]] },
        seg(-w, 0, w, 0), seg(w, 0, w, 700), seg(w, 700, -w, 700), seg(-w, 700, -w, 0),
        seg(-w + 4, 0, -w + 4, 700), seg(w - 4, 0, w - 4, 700), seg(-w, 696, w, 696)];
      put(cnl, x, pe, 'CANELEIRA', nomeBloco('DI_CANELEIRA', 'COL' + col));
      // braços: simples nas colunas externas (voltados para dentro), duplo nas internas
      const externa = i === 0 || i === RT; // a última coluna desenhada de uma vista parcial é interna (braço duplo)
      for (const yNivel of F.niveis) {
        const bal = yNivel === F.niveis[0] ? F.balBaixo : F.balAlto, yb = snapApoio(yNivel);
        const br = bracoParam(col, bal, externa ? (i === 0 ? 1 : -1) : 0, F.perfilC, F.espU);
        const ladoB = externa ? (i === 0 ? 'ESQ' : 'DIR') : '', pf = F.perfilC;
        put(br.prims, x, yb, 'BRACO', nomeBloco('DI_BR', (externa ? 'S' : 'D') + nb(bal), col + (ladoB ? ladoB[0] : ''), 'C' + [pf.A, pf.C, pf.B, pf.D].map(nb).join('X')));
        if (i === 0) topoBraco.push(yb + br.topoC);
      }
    });
    // travamento de fundo em zig-zag (plano do fundo, visto através da rua): só diagonais alternadas por painel; longarina de fundo em cada nível de braço
    if (F.zigzag && B().DI_TRAVESSA_D) {
      const Z = F.zigzag;
      for (let i = comPalete ? 1 : 0; i < R; i++) {
        const xl = xs[i] + Z.hx, xr = xs[i + 1] - Z.hx;
        Z.paineis.forEach(([y1, y2], k) => {
          if (y2 <= y1) return;
          const p1 = k % 2 === 0 ? [xl, y1] : [xr, y1], p2 = k % 2 === 0 ? [xr, y2] : [xl, y2];
          put(translate(travessaD(p1, p2), -p1[0], -p1[1]), p1[0], p1[1], 'Contraventamento', nomeBloco('DI_ZIGZAG_D', nb(p2[0] - p1[0]) + 'X' + nb(p2[1] - p1[1])));
        });
      }
    }
    // longarina de fundo: perfil da longarina de topo (DI_LGTOPO esticado pela rua), em cada nível de braço, layer laranja; topo no nível de apoio [CONFIRMAR altura]
    // bloco do Gean (DI_LGFUNDO.dxf): longarina de fundo entre as pontas dos braços (desenhada para balanço 180 em rua 1400: pontas a ±519
    // do centro), na altura do C: corpo de 76 mm centrado na altura A do C (print do Gean) → y = 0 do bloco = topo do C − (A + 76) / 2
    const LGF = B().DI_LGFUNDO;
    if (F.lgFundo && LGF) for (let i = 0; i < R; i++) F.niveis.forEach((yN, k) => {
      const bal = k === 0 ? F.balBaixo : F.balAlto, ponta = rua / 2 - F.espU - bal, d = ponta - 519, xm = (xs[i] + xs[i + 1]) / 2;
      put(mapPts(clone(LGF), (v) => [v[0] > 100 ? v[0] + d : v[0] < -100 ? v[0] - d : v[0], v[1]]), xm, snapApoio(yN) + offApoio - (F.perfilC.A + 76) / 2, 'LONGARINA_FUNDO', nomeBloco('DI_LGFUNDO', 'RUA' + nb(rua), 'BAL' + nb(bal)));
    });
    else if (F.lgFundo && B().DI_LGTOPO) for (let i = 0; i < R; i++) for (const yN of F.niveis) {
      const ya = snapApoio(yN) + offApoio, x1 = xs[i] + hx + 2.23, x2 = xs[i + 1] - hx - 2.23;
      put(stretchX(clone(B().DI_LGTOPO).map((q) => ({ ...q, l: 'LONGARINA_FUNDO' })), 1931.73 / 2, (x2 - x1) - 1931.73), x1, ya - 111.89, 'LONGARINA_FUNDO', nomeBloco('DI_LG_FUNDO', 'RUA' + nb(rua), 'COL' + col));
    }
    // paletes: centralizados na rua (100 mm de cada coluna), no chão e apoiados no topo do C de cada nível
    if (F.frentePalete > 0 && F.alturaPalete > 0) {
      const ret = (x0, y0, w, h) => put(geoPalete(w, h, true), x0, y0, 'PALETE', nomeBloco('DI_PALETE', nb(w) + 'X' + nb(h)));
      for (const i of [0]) { // paletes só na 1ª rua (projeto leve)
        const x0 = xs[i] + col / 2 + F.folgaPalete;
        for (const y0 of [0, ...(F.escravo ? [F.alturaPalete] : []), ...topoBraco]) ret(x0, y0, F.frentePalete, F.alturaPalete);
      }
      // carga escrita no palete
      if (F.cargaPalete) for (const i of [0]) for (const y0 of [0, ...(F.escravo ? [F.alturaPalete] : []), ...topoBraco]) text(xs[i] + col / 2 + F.folgaPalete + F.frentePalete / 2, y0 + F.alturaPalete / 2, 110, `${F.cargaPalete} kg`, 'PALETE');
      // número da posição do palete da frente (igual em todos os níveis): escrito no palete do chão
      text(xs[0] + col / 2 + F.folgaPalete + F.frentePalete / 2, F.alturaPalete / 2 + (F.cargaPalete ? 200 : -50), 130, numPos(r, corte, 0, 0), 'PALETE', 0, 1, 'ROMANS'); // só na 1ª rua (a única com palete)
    }
    // longarina superior (DI_LGTOPO) em cada rua, conforme VISTA_FRONTAL_COM_DI_LGTOPO.dxf:
    // furo de fixação 8,46 mm acima do 3º furo de cima da coluna (topo da longarina 4,65 mm abaixo do topo da coluna)
    // e 2,23 mm além do centro do oblongo; o bloco é esticado pelo meio para acompanhar a largura da rua
    const LG_DX = 2.23, LG_DY = 8.46, LG_VAO0 = 1931.73;
    for (let i = 0; i < R; i++) {
      const src = B().DI_LGTOPO; if (!src) { faltam.add('DI_LGTOPO'); break; }
      const yLg = H - FR_TOPO_FURO - 100 + LG_DY, x1 = xs[i] + hx + LG_DX, x2 = xs[i + 1] - hx - LG_DX;
      const LGC = B().DI_LGTOPO_CONTRAV;
      if (LGC) {
        // bloco do Gean (Drawing1.dxf): longarina de topo + contraventamento superior, só representativo; desenhado para rua 1400,
        // ponto base no centro da rua; corpo da longarina 26,89 mm abaixo do furo de referência do DI_LGTOPO (mesma altura de antes);
        // os ganchos ficam a ~18 mm da face da coluna (furos das COL 80/101/122) → estica o que está a mais de 100 mm do centro
        const dR = (rua - 1400) / 2, xm = (xs[i] + xs[i + 1]) / 2;
        put(mapPts(clone(LGC), (v) => [v[0] > 100 ? v[0] + dR : v[0] < -100 ? v[0] - dR : v[0], v[1]]), xm, yLg + 26.89, 'LONGARINA', nomeBloco('DI_LGTOPO_CONTRAV', 'RUA' + nb(rua)));
      } else
      put(stretchX(clone(src), LG_VAO0 / 2, (x2 - x1) - LG_VAO0), x1, yLg, 'LONGARINA', nomeBloco('DI_LGTOPO', 'RUA' + nb(rua), 'COL' + col));
      cota(xs[i] + col / 2, H, xs[i + 1] - col / 2, H, 300, `${rua}`, false, 'p');
    }
    const W = xs[R] + col / 2;
    const x0p = -1500, nP = Math.ceil((W + 3000) / 1000);
    for (let k = 0; k < nP; k++) put(piso(k === 0, k === nP - 1), x0p + k * 1000, 0, '0', nomeBloco('DI_PISO', k === 0 ? 'INI' : k === nP - 1 ? 'FIM' : ''));
    cota(0, H, W, H, 650, `${Math.round(W)}`, false, 'g');
    // à esquerda: corrente palete + folga (por dentro), corrente dos níveis e altura total (como no 260324)
    const niv = [0, ...topoBraco, H];
    for (let k = 0; k < niv.length - 1; k++) cota(0, niv[k], 0, niv[k + 1], 600, `${Math.round(niv[k + 1] - niv[k])}`, true, 'p');
    cota(0, 0, 0, H, 1050, `${H}`, true, 'g');
    if (F.alturaPalete > 0) {
      const hp = F.alturaPalete, baseC = (y) => y - F.perfilC.A, lgBase = H - 154.65;
      const apoios = [0, ...topoBraco];
      apoios.forEach((y0, k) => {
        const yp = y0 + (k === 0 && F.escravo ? 2 * hp : hp), prox = k + 1 < apoios.length ? baseC(apoios[k + 1]) : lgBase;
        cota(0, y0, 0, yp, 250, `${Math.round(yp - y0)}`, true, 'c');
        if (prox > yp + 1) cota(0, yp, 0, prox, 250, `${Math.round(prox - yp)}`, true, 'c');
      });
    }
    // em cada nível, na última rua: balanço / vão livre entre pontas / balanço (a partir da face do suporte U)
    if (R && topoBraco.length) {
      const i = R - 1, uo = col / 2 + F.espU;
      topoBraco.forEach((yA, k) => {
        const bal = k === 0 ? F.balBaixo : F.balAlto, yC = yA - offApoio - 150; // abaixo do suporte U
        const a1 = xs[i] + uo, t1 = a1 + bal, a2 = xs[i + 1] - uo, t2 = a2 - bal;
        cota(a1, yC, t1, yC, -1, `${bal}`, false, 'c'); cota(t1, yC, t2, yC, -1, `${Math.round(t2 - t1)}`, false, 'c'); cota(t2, yC, a2, yC, -1, `${bal}`, false, 'c');
      });
    }
    if (RT > R) { // vista parcial: linha de interrupção à direita e nota com o total
      const xb = W + 350, z = [[xb, -200], [xb, H * 0.45], [xb - 120, H * 0.48], [xb + 120, H * 0.52], [xb, H * 0.55], [xb, H + 300]];
      for (let k = 0; k < z.length - 1; k++) line(z[k][0], z[k][1], z[k + 1][0], z[k + 1][1], 'COTAS');
      text(W / 2, -1000, 110, `VISTA PARCIAL: ${R} DE ${RT} RUAS - LARGURA TOTAL ${Math.round(r.dimensoes.largura)} mm`, 'COTAS', 0, 1, 'ROMANS');
    }
    text(W / 2, -600, 120, titulo || 'VISTA FRONTAL', '4 - TEXTO DE ESCALA E VISTA');
    if (faltam.size) text(W / 2, -1180, 70, 'Blocos ainda nao recebidos (nao desenhados): ' + [...faltam].join(', '), '4 - TEXTO DE ESCALA E VISTA');
    return { prims, items, linhas, textos, bbox: [-1900, -1300, W + 1600, H + 1150], faltam: [...faltam] };
  }

  // ---- vista superior (planta), no padrão do projeto 260324: frente embaixo (y = 0), fundo em cima
  // x: mesmas posições da frontal (eixos das colunas); y: posições das colunas na lateral, medidas a partir da frente
  function montarPlanta(r, titulo, corte) {
    const cp = Number(r.entradas.coluna), dup = !!r.entradas.dup, col = r.dimensoes.colW || cp, R = Number(r.entradas.ruas), F = r.frontal, rua = F.larguraRua;
    const D = r.dimensoes.profundidade, CW = 69.8;
    const dxM = dup ? [-cp / 2, cp / 2] : [0]; // eixos das montantes em relação ao centro da posição (duplada: 2 montantes grudadas)
    const prims = [], linhas = [], textos = [], items = [];
    const put = (ps, dx, dy, layerDefault, nome) => {
      for (const q of ps) q.l = q.l && q.l !== '0' ? q.l : layerDefault;
      if (nome) items.push({ nome, local: clone(ps), x: dx, y: dy, l: layerDefault });
      for (const q of ps) { const w = translate([q], dx, dy)[0]; if (nome) w.blk = 1; prims.push(w); }
    };
    const line = (x1, y1, x2, y2, layer) => linhas.push({ l: layer, p: [[x1, y1], [x2, y2]] });
    const text = (x, y, h, s, layer, rot = 0, just = 1, st) => textos.push({ x, y, h, s, l: layer, rot, just, st });
    const cota = fazCota(line, text);
    const ret = (w, h, layer, sol) => { const L = [[0, 0, w, 0], [w, 0, w, h], [w, h, 0, h], [0, h, 0, 0]].map(([a, b, c, d]) => ({ t: 'p', l: layer, p: [[a, b], [c, d]] })); if (sol) L.unshift({ t: 's', l: sol, p: [[0, 0], [w, 0], [0, h], [w, h]] }); return L; };
    const xs = []; for (let i = 0; i <= R; i++) xs.push(i * (rua + col) + col / 2);
    const W = xs[R] + col / 2;
    const uo = col / 2 + F.espU, bal = F.balAlto, pf = F.perfilC;
    // paletes não são desenhados na planta (projeto leve, Gean); só a numeração dos cantos, no lugar de cada palete (do fundo para a frente, palete + 25)
    const prof = r.planta.profPalete, P = r.paletesPorRua;
    if (F.frentePalete > 0) for (let i = 0; i < R; i++) for (let k = 0; k < P; k++) {
      const yTopo = D - k * r.ocupPalete;
      // número da posição (vale para todos os níveis deste ponto da rua): só nos cantos — 1º e último palete da 1ª e da última rua (Gean)
      if ((i === 0 || i === R - 1) && (k === 0 || k === P - 1)) text(xs[i] + col / 2 + F.folgaPalete + F.frentePalete / 2, yTopo - prof / 2 - 60, 150, numPos(r, corte, i, P - 1 - k), 'PALETE', 0, 1, 'ROMANS');
    }
    // linhas de coluna (VISTA_SUPERIOR.dxf): cada coluna tem a alma para fora do quadro e a abertura para dentro (a solteira abre para a vizinha);
    // o braço fica encostado na alma, por fora; a longarina superior fica na linha da alma, para o lado da abertura
    const PL = r.planta, almaY = PL.almaT.map((t) => D - t), abreY = PL.abreT.map((v) => -v), FL = PL.furoLg, nRows = almaY.length;
    const furoY = (j, dir) => almaY[j] + dir * (dir === abreY[j] ? FL.dentro : FL.fora); // furo da chapa de ponta da longarina superior
    const Lt = r.lateral, nEsp = Lt.espacos.length;
    const quadroEsp = (k) => k >= 0 && k < nEsp && (Lt.solteira ? k % 2 === 1 : k % 2 === 0);
    const espMont = (ps, dA) => mapPts(ps, (v) => [v[0], v[1] < -512.5 ? v[1] - dA : v[1]]); // DI_MONT_80 desenhado com quadro de 1025
    // braços (vistos de cima: aba do C, largura = aba C do perfil): simples nas laterais das pontas (cobrem a coluna até a ponta), duplos nas internas
    for (let i = 0; i <= R; i++) almaY.forEach((yA, j) => {
      const y0 = abreY[j] > 0 ? yA - pf.C : yA, simples = i === 0 || i === R;
      const L = simples ? translate(ret(col / 2 + uo + bal, pf.C, 'BRACO', 'BRACO_HACHURA'), -col / 2, 0) : translate(ret(2 * (uo + bal), pf.C, 'BRACO', 'BRACO_HACHURA'), -(uo + bal), 0);
      put(simples && i === R ? mirrorX(L) : L, xs[i], y0, 'BRACO', nomeBloco('DI_PL_BRACO', (simples ? 'S' : 'D') + nb(bal), col + (simples ? (i === 0 ? 'D' : 'E') : '')));
    });
    // longarinas de túnel: ao longo de toda a profundidade, na ponta do braço, nos dois lados de cada rua
    const lgB = r.lateral.lgU ? r.lateral.lgU.B : 38;
    for (let i = 0; i < R; i++) for (const lado of [1, -1]) {
      const xt = lado === 1 ? xs[i] + uo + bal : xs[i + 1] - uo - bal, x0 = lado === 1 ? xt - lgB : xt;
      put(ret(lgB, D, 'LONGARINA', 'BRACO_HACHURA'), x0, 0, 'LONGARINA', nomeBloco('DI_PL_LG_TUNEL', nb(D)));
    }
    // colunas (MONTANTES_DE_MODELO.dxf, Gean): quadro DI_MONT_<col> (2 seções + contraventamento; alma de trás em y = 0, desenhado com A = 1025,
    // esticado no A do quadro) e solteira DI_PL_SOLT_<col> (união + coluna solteira; y = 0 na alma da coluna vizinha do quadro, solteira em
    // y = 1025, esticado no A da solteira); duplada = 2 blocos da COL 80 lado a lado. Sem bloco: seção real (COLUNAS.dxf) + linha do contraventamento
    const MONT = B()['DI_MONT_' + cp], SOLT = B()['DI_PL_SOLT_' + cp], SEC = B()['DI_SECAO_COL' + cp];
    const secao = (sy) => SEC ? mapPts(clone(SEC), (v) => [v[0], sy * v[1]]) : mapPts(ret(cp, CW, 'MONTANTE', 'MONTANTE_HACHURA'), (v) => [v[0] - cp / 2, sy * v[1]]);
    const emQuadro = new Set();
    for (let k = 0; k < nEsp; k++) if (quadroEsp(k)) {
      emQuadro.add(k); emQuadro.add(k + 1);
      const A = almaY[k] - almaY[k + 1];
      for (let i = 0; i <= R; i++) for (const dx of dxM) {
        if (MONT) put(espMont(clone(MONT), A - 1025), xs[i] + dx, almaY[k], 'MONTANTE', nomeBloco('DI_PL_QUADRO', cp, nb(A)));
        else line(xs[i] + dx, almaY[k] - CW, xs[i] + dx, almaY[k + 1] + CW, 'Contraventamento');
      }
    }
    for (let i = 0; i <= R; i++) almaY.forEach((yA, j) => {
      if (MONT && emQuadro.has(j)) return;
      const k = j + 1 < nRows ? j + 1 : j - 1; // coluna vizinha (do quadro) à qual a solteira se une
      if (!emQuadro.has(j) && SOLT && k >= 0) {
        const A = yA - almaY[k], sg = Math.sign(A) || 1;
        const ps = mapPts(clone(SOLT), (v) => [v[0], sg * (v[1] > 512.5 ? v[1] + Math.abs(A) - 1025 : v[1])]);
        for (const dx of dxM) put(clone(ps), xs[i] + dx, almaY[k], 'MONTANTE', nomeBloco('DI_PL_SOLT', cp, nb(Math.abs(A)), sg > 0 ? 'F' : 'T'));
        return;
      }
      const ps = secao(abreY[j]);
      for (const dx of dxM) put(clone(ps), xs[i] + dx, yA, 'MONTANTE', nomeBloco('DI_PL_COLUNA', cp, abreY[j] > 0 ? 'F' : 'T'));
    });
    // longarina superior (DI_LONG_VIST_SUP, TB 80) em cada linha de coluna, esticada para a largura da rua (desenhada para rua 1400)
    const LGS = B().DI_LONG_VIST_SUP, dR = (rua - 1400) / 2;
    for (let i = 0; i < R; i++) almaY.forEach((yA, j) => {
      const xm = (xs[i] + xs[i + 1]) / 2, sy = abreY[j];
      const ps = LGS ? mapPts(clone(LGS), (v) => [v[0] > 100 ? v[0] + dR : v[0] < -100 ? v[0] - dR : v[0], sy * v[1]]) : mapPts(ret(rua, 40, 'LONGARINA'), (v) => [v[0] - rua / 2, sy * v[1]]);
      put(ps, xm, yA, 'LONGARINA', nomeBloco('DI_PL_LGSUP', nb(rua), sy > 0 ? 'F' : 'T'));
    });
    // travamento de topo em zig-zag: diagonais (DI_TRAV_SUP esticada) entre os furos das chapas de ponta das longarinas superiores,
    // alternando o lado a partir da frente (linha da frente: furo do lado direito)
    const TRV = B().DI_TRAV_SUP, CC0 = 1561.87, dxh = rua / 2 - FL.x;
    for (let i = 0; i < R; i++) for (let j = 0; j < nRows - 1; j++) {
      const xm = (xs[i] + xs[i + 1]) / 2, dirJ = (nRows - 1 - j) % 2 === 0 ? 1 : -1; // lado do furo na linha j (+1 = direita)
      const p1 = [xm + dirJ * dxh, furoY(j, -1)], p2 = [xm - dirJ * dxh, furoY(j + 1, 1)];
      const cc = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
      if (TRV) put(rotate(mapPts(clone(TRV), (v) => [v[0] > CC0 / 2 ? v[0] + cc - CC0 : v[0], v[1]]), ang), p1[0], p1[1], 'Contraventamento', nomeBloco('DI_PL_DIAG_TOPO', nb(cc), dirJ > 0 ? 'A' : 'B'));
      else line(p1[0], p1[1], p2[0], p2[1], 'Contraventamento');
    }
    // trilho guia (DI_TRILHO_GUIA): centrado na linha de colunas de cada lateral, começa à frente da estrutura e entra até o fim do penúltimo palete
    // trilho por modelo de coluna (DI_TRILHO_GUIA_80 / _101 / _122 / _80D, Gean); sem bloco do modelo: DI_TRILHO_GUIA genérico
    const Tr = r.lateral.trilho, TRL = B()['DI_TRILHO_GUIA_' + cp + (dup ? 'D' : '')] || B().DI_TRILHO_GUIA;
    const TL0 = TRL ? Math.max(...TRL.filter((q) => q.p).map((q) => Math.max(...q.p.map((v) => v[1])))) : 0;
    if (Tr && Tr.comp > 100 && TRL) for (let i = 0; i <= R; i++)
      put(mapPts(clone(TRL), (v) => [v[0], v[1] > 100 ? v[1] + Tr.comp - TL0 : v[1]]), xs[i], -Tr.frente, 'TRILHO', nomeBloco('DI_PL_TRILHO', cp + (dup ? 'D' : ''), nb(Tr.comp)));
    // entrada de cada rua: seta e número da rua
    for (let i = 0; i < R; i++) {
      const xm = (xs[i] + xs[i + 1]) / 2;
      line(xm, -900, xm, -250, 'COTAS'); line(xm, -250, xm - 90, -420, 'COTAS'); line(xm, -250, xm + 90, -420, 'COTAS');
      text(xm, -1150, 150, `RUA ${String(i + 1).padStart(2, '0')}`, 'COTAS', 0, 1, 'ROMANS');
    }
    text(W / 2, -1450, 110, 'FRENTE (ENTRADA DA EMPILHADEIRA)', 'COTAS', 0, 1, 'ROMANS');
    // cotas: ruas e largura total em cima; espaços (A1…An, do fundo para a frente) e profundidade total à esquerda
    for (let i = 0; i < R; i++) cota(xs[i] + col / 2, D, xs[i + 1] - col / 2, D, 300, `${rua}`, false, 'p');
    cota(0, D, W, D, 700, `${Math.round(W)}`, false, 'g');
    const esp = r.lateral.espacos; let acc = 0;
    esp.forEach((a) => { cota(0, D - acc, 0, D - acc - a, 300, `${Math.round(a)}`, true, 'c'); acc += a; });
    cota(0, D, 0, 0, 750, `${Math.round(D)}`, true, 'g');
    text(W / 2, -2000, 120, titulo || 'VISTA SUPERIOR', '4 - TEXTO DE ESCALA E VISTA');
    return { prims, items, linhas, textos, bbox: [-1900, -2300, W + 900, D + 1150] };
  }
  function shiftModel(m, dx, dy = 0) {
    for (const q of m.prims) { if (q.p) q.p = q.p.map((v) => [v[0] + dx, v[1] + dy]); if (q.c) q.c = [q.c[0] + dx, q.c[1] + dy]; }
    for (const q of m.linhas) q.p = q.p.map((v) => [v[0] + dx, v[1] + dy]);
    for (const t of m.textos) { t.x += dx; t.y += dy; }
    for (const it of m.items || []) { it.x += dx; it.y += dy; }
    m.bbox = [m.bbox[0] + dx, m.bbox[1] + dy, m.bbox[2] + dx, m.bbox[3] + dy];
    return m;
  }
  function dxfLateral(r, titulo, modelo) {
    const m = modelo || montarLateral(r, titulo), out = [], blocos = [];
    // peças como blocos: uma definição por geometria (nome com os parâmetros) + INSERT na posição; o resto (cotas, textos) solto
    const defs = new Map();
    for (const it of m.items || []) {
      const sig = JSON.stringify(it.local.map((q) => [q.t, q.l, q.p && q.p.map((v) => [f(v[0]), f(v[1])]), q.c && [f(q.c[0]), f(q.c[1])], q.r && f(q.r)]));
      let nome = it.nome, k = 2;
      while (defs.has(nome) && defs.get(nome).sig !== sig) nome = limitarNome(`${it.nome}_${k++}`.length <= MAX_NOME ? `${it.nome}_${k - 1}` : `${it.nome.slice(0, MAX_NOME - 3)}_${k - 1}`);
      if (!defs.has(nome)) {
        defs.set(nome, { sig });
        blocos.push('0', 'BLOCK', '8', '0', '2', nome, '70', '0', '10', '0', '20', '0', '30', '0', '3', nome);
        emit(blocos, it.local, 0, 0, it.l);
        blocos.push('0', 'ENDBLK', '8', '0');
      }
      out.push('0', 'INSERT', '8', ld(it.l), '2', nome, '10', f(it.x), '20', f(it.y), '30', '0');
    }
    emit(out, m.prims.filter((q) => !q.blk), 0, 0, '0');
    for (const q of m.linhas) out.push('0', 'LINE', '8', ld(q.l), '10', f(q.p[0][0]), '20', f(q.p[0][1]), '30', '0', '11', f(q.p[1][0]), '21', f(q.p[1][1]), '31', '0');
    const asc = (s) => String(s).replace(/[^\x00-\x7F]/g, (c) => '\\U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')); // acentos no padrão do AutoCAD
    for (const t of m.textos) out.push('0', 'TEXT', '8', ld(t.l), '10', f(t.x), '20', f(t.y), '30', '0', '40', f(t.h), '1', asc(t.s), '50', f(t.rot), ...(t.st ? ['7', t.st] : []), '72', String(t.just), '11', f(t.x), '21', f(t.y), '31', '0');
    const layers = Object.entries(LAYERS).filter(([n]) => n !== '0').flatMap(([name, c]) => ['0', 'LAYER', '2', ld(name), '70', '0', '62', String(c), '6', 'CONTINUOUS']);
    return ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'TABLES',
      '0', 'TABLE', '2', 'LTYPE', '70', '1', '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0', '0', 'ENDTAB',
      '0', 'TABLE', '2', 'LAYER', '70', String(Object.keys(LAYERS).length), '0', 'LAYER', '2', '0', '70', '0', '62', '7', '6', 'CONTINUOUS', ...layers, '0', 'ENDTAB',
      '0', 'TABLE', '2', 'STYLE', '70', '2', '0', 'STYLE', '2', 'STANDARD', '70', '0', '40', '0', '41', '1', '50', '0', '71', '0', '42', '2.5', '3', 'txt', '4', '', '0', 'STYLE', '2', 'ROMANS', '70', '0', '40', '0', '41', '1', '50', '0', '71', '0', '42', '2.5', '3', 'romans.shx', '4', '', '0', 'ENDTAB',
      '0', 'ENDSEC',
      '0', 'SECTION', '2', 'BLOCKS', ...blocos, '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES', ...out, '0', 'ENDSEC', '0', 'EOF'].join('\n');
  }
  // ---- a mesma vista em SVG (tela): fundo escuro como o AutoCAD, cores por layer
  const COR = { MONTANTE_HACHURA: '#4f8cff', BRACO_PARAFUSO: '#000000', BRACO_HACHURA: '#f97316', LONGARINA_FUNDO: '#fb923c', TRILHO: '#eab308', PALETE_HACHURA: '#a5520a', PALETE: '#a78b6d', MONTANTE: '#4f8cff', Contraventamento: '#9aa0a6', LONGARINA: '#22c55e', BRACO: '#1f2937', CANELEIRA: '#1f2937', CANELEIRA_HACHURA: '#facc15', COTAS: '#e5e7eb', '4 - TEXTO DE ESCALA E VISTA': '#facc15', 0: '#e5e7eb' };
  // título das vistas com o nome do corte informado pelo operador: "VISTA LATERAL CORTE A", "VISTA FRONTAL CORTE A" (e "VISTA SUPERIOR CORTE A" quando existir)
  const tituloVista = (vista, corte) => `VISTA ${vista} CORTE ${String(corte || 'A').trim().toUpperCase()}`;
  // um corte = vista lateral + vista frontal lado a lado (modelo de primitivas + blocos)
  function modeloCorte(r, corte) {
    const mL = montarLateral(r, tituloVista('LATERAL', corte)), mF = montarFrontal(r, tituloVista('FRONTAL', corte), corte);
    shiftModel(mF, mL.bbox[2] + 2000 - mF.bbox[0]);
    const aviso = (typeof root.Engine !== 'undefined' ? root.Engine : (typeof require === 'function' ? require('./engine.js') : {})).AVISO_ESTRUTURAL;
    if (aviso) for (const mm of [mL, mF]) mm.textos.push({ x: (mm.bbox[0] + mm.bbox[2]) / 2, y: -800, h: 90, s: aviso, l: '4 - TEXTO DE ESCALA E VISTA', rot: 0, just: 1 });
    const pd = Number(r.frontal.peDireito) || 0;
    if (pd > 0) { // linha de pé-direito com marcador, como no 260324
      const x0 = mL.bbox[0] + 400, x1 = mF.bbox[2] - 400;
      mL.linhas.push({ l: 'COTAS', p: [[x0, pd], [x1, pd]] }, { l: 'COTAS', p: [[x0 + 150, pd], [x0 + 300, pd + 260]] }, { l: 'COTAS', p: [[x0 + 300, pd + 260], [x0, pd + 260]] }, { l: 'COTAS', p: [[x0, pd + 260], [x0 + 150, pd]] });
      mL.textos.push({ x: x0 + 400, y: pd + 330, h: 150, s: 'PÉ DIREITO', l: 'COTAS', rot: 0, just: 0, st: 'ROMANS' }, { x: x0 + 400, y: pd + 90, h: 150, s: `${pd} mm`, l: 'COTAS', rot: 0, just: 0, st: 'ROMANS' });
      mL.bbox[3] = Math.max(mL.bbox[3], pd + 700); mF.bbox[3] = Math.max(mF.bbox[3], pd + 700);
    }
    // vista superior embaixo da frontal (mesma escala e mesmo alinhamento em X das ruas)
    const mP = montarPlanta(r, tituloVista('SUPERIOR', corte), corte);
    shiftModel(mP, mF.bbox[0] - mP.bbox[0], Math.min(mL.bbox[1], mF.bbox[1]) - 1500 - mP.bbox[3]);
    const ms = [mL, mF, mP];
    return { prims: [].concat(...ms.map((m) => m.prims)), items: [].concat(...ms.map((m) => m.items)), linhas: [].concat(...ms.map((m) => m.linhas)), textos: [].concat(...ms.map((m) => m.textos)),
      bbox: [Math.min(...ms.map((m) => m.bbox[0])), Math.min(...ms.map((m) => m.bbox[1])), Math.max(...ms.map((m) => m.bbox[2])), Math.max(...ms.map((m) => m.bbox[3]))] };
  }
  function dxfCompleto(r, corte) { return dxfLateral(r, corte, modeloCorte(r, corte)); }
  // projeto com vários cortes: um DXF só, cortes empilhados de cima para baixo (mesma origem X), 3000 mm entre eles
  function dxfProjeto(lista) {
    const m = { prims: [], items: [], linhas: [], textos: [] };
    let topo = 0;
    lista.forEach(({ r, corte, qtd }) => {
      const mc = modeloCorte(r, corte);
      if (qtd > 1) mc.textos.push({ x: (mc.bbox[0] + mc.bbox[2]) / 2, y: mc.bbox[3] + 150, h: 120, s: `CORTE ${String(corte).toUpperCase()} - ${qtd} BLOCOS IGUAIS`, l: '4 - TEXTO DE ESCALA E VISTA', rot: 0, just: 1 });
      shiftModel(mc, -mc.bbox[0], topo - mc.bbox[3] - 400);
      for (const k of ['prims', 'items', 'linhas', 'textos']) m[k] = m[k].concat(mc[k]);
      topo = mc.bbox[1] - 3000;
    });
    return dxfLateral(lista[0] && lista[0].r, '', m);
  }
  function svgFrontal(r, titulo, corte) { return svgModelo(montarFrontal(r, titulo, corte)); }
  function svgLateral(r, titulo) { return svgModelo(montarLateral(r, titulo)); }
  function svgPlanta(r, titulo, corte) { return svgModelo(montarPlanta(r, titulo, corte)); }
  function svgModelo(m) {
    const [x0, y0, x1, y1] = m.bbox, W = x1 - x0, Hh = y1 - y0;
    const X = (x) => (x - x0).toFixed(1), Y = (y) => (y1 - y).toFixed(1);
    const parts = [];
    const byLayer = {};
    for (const q of m.prims.concat(m.linhas)) (byLayer[q.l] = byLayer[q.l] || []).push(q);
    for (const [l, qs] of Object.entries(byLayer)) {
      const sw = l === 'MONTANTE' ? 2.2 : 1.6;
      let path = '';
      for (const q of qs) {
        if (q.t === 's') { const [a, b, c, e] = q.p; parts.unshift(`<polygon points="${[a, b, e, c].map((v) => X(v[0]) + ',' + Y(v[1])).join(' ')}" fill="${COR[l] || '#f97316'}" stroke="none"/>`); continue; }
        if (q.t === 'c') parts.push(`<circle cx="${X(q.c[0])}" cy="${Y(q.c[1])}" r="${q.r.toFixed(1)}" fill="none" stroke="${COR[l] || '#fff'}" stroke-width="${sw}" vector-effect="non-scaling-stroke"/>`);
        else path += 'M' + q.p.map((v, i) => (i ? 'L' : '') + X(v[0]) + ' ' + Y(v[1])).join('');
      }
      if (path) parts.push(`<path d="${path}" fill="none" stroke="${COR[l] || '#fff'}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`);
    }
    for (const t of m.textos) parts.push(`<text x="${X(t.x)}" y="${Y(t.y)}" font-size="${t.h}" fill="${COR[t.l] || '#fff'}" text-anchor="${t.just === 1 ? 'middle' : 'start'}" transform="rotate(${-t.rot} ${X(t.x)} ${Y(t.y)})" font-family="Arial, sans-serif">${t.s}</text>`);
    return `<svg viewBox="0 0 ${W.toFixed(0)} ${Hh.toFixed(0)}" style="background:#1f2430"><rect width="100%" height="100%" fill="#1f2430"/>${parts.join('')}</svg>`;
  }
  const DXF = { svgPlanta, montarPlanta, dxfProjeto, tituloVista, bracoParam, dxfLateral, dxfCompleto, svgLateral, svgFrontal, montarLateral, montarFrontal, colunaFrontal };
  if (typeof module !== 'undefined' && module.exports) module.exports = DXF; else root.DXF = DXF;
})(typeof window !== 'undefined' ? window : globalThis);
