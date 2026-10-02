// Exporta a vista lateral em DXF R12 usando os blocos DI_* do responsável técnico (blocos.js).
// Layers: MONTANTE (170), Contraventamento (9), COTAS (7), "4 - TEXTO DE ESCALA E VISTA" (2).
(function (root) {
  'use strict';
  const LAYERS = { MONTANTE: 170, Contraventamento: 9, LONGARINA: 3, BRACO: 30, CANELEIRA: 2, COTAS: 7, '4 - TEXTO DE ESCALA E VISTA': 2, 0: 7 };
  // DXF R12 não aceita espaços em nomes de layer: nome gravado no arquivo (o AutoCAD mostra estes)
  const LAYER_DXF = { MONTANTE: 'MONTANTE', Contraventamento: 'CONTRAVENTAMENTO', LONGARINA: 'LONGARINA', BRACO: 'BRACO', CANELEIRA: 'CANELEIRA', COTAS: 'COTAS', '4 - TEXTO DE ESCALA E VISTA': 'TEXTO_ESCALA_VISTA', 0: '0' };
  const ld = (l) => LAYER_DXF[l] || String(l).replace(/[^A-Za-z0-9_$-]/g, '_');
  const f = (v) => (Math.round(v * 100) / 100).toString();
  const B = () => root.BLOCOS || (typeof require === 'function' ? (global.window && global.window.BLOCOS) : null);

  // ---- utilitários de geometria sobre primitivas {t:'l'|'c'|'p', l:layer, p:[[x,y]..], c:[x,y], r}
  const clone = (prims) => prims.map((q) => ({ t: q.t, l: q.l, p: q.p ? q.p.map((v) => [v[0], v[1]]) : undefined, c: q.c ? [q.c[0], q.c[1]] : undefined, r: q.r }));
  const mapPts = (prims, fn) => { for (const q of prims) { if (q.p) q.p = q.p.map((v) => fn(v)); if (q.c) q.c = fn(q.c); } return prims; };
  const translate = (prims, dx, dy) => mapPts(prims, (v) => [v[0] + dx, v[1] + dy]);
  const mirrorX = (prims) => mapPts(prims, (v) => [-v[0], v[1]]);
  const rotate = (prims, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return mapPts(prims, (v) => [v[0] * c - v[1] * s, v[0] * s + v[1] * c]); };
  // estica ao longo de X: pontos com x > xMid deslocam delta
  const stretchX = (prims, xMid, delta) => mapPts(prims, (v) => [v[0] > xMid ? v[0] + delta : v[0], v[1]]);
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
  // base da sapata em y = 0 e topo da coluna em H; furação oblonga a cada 50 mm com o 1º furo a 25 mm do topo
  // (como a coluna é cortada em múltiplos de 50, os furos ficam a 25 mm das duas pontas)
  const FR_TOPO_FURO = 25;
  const yrq = (q) => { const ys = q.p ? q.p.map((v) => v[1]) : [q.c[1]]; return [Math.min(...ys), Math.max(...ys)]; };
  const longq = (q) => q.p && yrq(q)[1] - yrq(q)[0] > 500;
  function geoFrontal(src) {
    return { Y0: -Math.min(...src.map((q) => yrq(q)[0])),                  // sapata abaixo da origem do bloco
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
      else if (q.t === 'p') {
        out.push('0', 'POLYLINE', '8', lay, '66', '1', '10', '0', '20', '0', '30', '0', '70', '0');
        for (const v of q.p) out.push('0', 'VERTEX', '8', lay, '10', f(v[0] + dx), '20', f(v[1] + dy), '30', '0');
        out.push('0', 'SEQEND');
      }
    }
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
    const put = (ps, dx, dy, layerDefault) => { for (const q of ps) { q.l = q.l && q.l !== '0' ? q.l : layerDefault; prims.push(translate([q], dx, dy)[0]); } };
    const line = (x1, y1, x2, y2, layer) => linhas.push({ l: layer, p: [[x1, y1], [x2, y2]] });
    const text = (x, y, h, s, layer, rot = 0, just = 1) => textos.push({ x, y, h, s, l: layer, rot, just });
    const cota = (x1, y1, x2, y2, off, label, vertical) => {
      if (!vertical) { line(x1, y1, x1, y1 + off, 'COTAS'); line(x2, y2, x2, y2 + off, 'COTAS'); line(x1, y1 + off, x2, y2 + off, 'COTAS'); text((x1 + x2) / 2, y1 + off + 20, 60, label, 'COTAS'); }
      else { line(x1, y1, x1 - off, y1, 'COTAS'); line(x2, y2, x2 - off, y2, 'COTAS'); line(x1 - off, y1, x2 - off, y2, 'COTAS'); text(x1 - off - 20, (y1 + y2) / 2, 60, label, 'COTAS', 90); }
    };
    const holeY = (y) => 54.75 + 50 * Math.round((y - 54.75) / 50);
    const holesRight = (i) => (solteira ? i === 0 || i % 2 === 1 : i % 2 === 0) && i < n;
    xs.forEach((x, i) => { const hr = holesRight(i); put(coluna(H, hr), x, 0, 'MONTANTE'); put(hr ? sapata() : mirrorX(sapata()), x + (hr ? -7.35 : 7.35), 0, 'MONTANTE'); });
    for (let i = 0; i < n; i++) {
      const uni = solteira && i === 0, quadro = solteira ? i % 2 === 1 : i % 2 === 0;
      // travessa: furos c/c = A − 109,1 (regra do cadastro), centrada no quadro
      const ccQ = espacos[i] - 109.1, xm = (xs[i] + xs[i + 1]) / 2;
      const hxL = quadro ? xm - ccQ / 2 : xs[i] + HOLE_DX, hxR = quadro ? xm + ccQ / 2 : xs[i + 1] - HOLE_DX;
      if (quadro) {
        ys.forEach((y) => put(travessaH(hxR - hxL), hxL, holeY(y), 'MONTANTE'));
        for (let k = 0; k < nD; k++) put(travessaD([hxL, holeY(ys[k])], [hxR, holeY(ys[k + 1])]), 0, 0, 'MONTANTE');
      }
      if (uni) ys.forEach((y) => put(uniao((xs[i + 1] - HOLE_DX) - hxL), hxL, holeY(y), 'MONTANTE'));
      put(topo(xs[i + 1] - xs[i] + CW), xs[i], H, 'Contraventamento'); // DI_TOPO desenhado para quadro de 820 externo [CONFIRMAR]
      const yc = H + 120 + (i % 2) * 90;
      cota(cum[i], H + 60, cum[i + 1], H + 60, yc - H - 60, `A${i + 1}`, false);
    }
    cota(cum[0], H + 60, cum[n], H + 60, 420, 'A', false);
    cota(xs[0] - 200, 0, xs[0] - 200, H, 700, 'B', true);
    cota(xs[0] - 200, ys[0], xs[0] - 200, ys[1], 300, 'C', true);
    const x0p = xs[0] - 1500, nP = Math.ceil((xs[n] + 1500 - x0p) / 1000);
    for (let k = 0; k < nP; k++) put(piso(k === 0, k === nP - 1), x0p + k * 1000, 0, '0'); // topo do concreto (y local 0) na base da sapata
    text((xs[0] + xs[n]) / 2, -600, 120, titulo || 'CORTE A - VISTA LATERAL', '4 - TEXTO DE ESCALA E VISTA');
    const tab = [['B', H], ['C', ys[1] - ys[0]], ['A', cum[n]]].concat(espacos.map((a, i) => [`A${i + 1}`, a]));
    tab.forEach(([k, v], i) => text(xs[n] + 1500, H - i * 200, 100, `${k} = ${v} mm`, '4 - TEXTO DE ESCALA E VISTA', 0, 0));
    return { prims, linhas, textos, bbox: [xs[0] - 1500, -800, xs[n] + 3200, H + 700] };
  }

  // ---- vista frontal (olhando para dentro das ruas)
  const HOLE_FX = { 80: 21.9, 101: 32.4, 122: 43.05 }; // furo da face frontal (oblongo), distância ao eixo
  function montarFrontal(r, titulo) {
    const col = Number(r.entradas.coluna), H = r.dimensoes.altura, R = Number(r.entradas.ruas), F = r.frontal, rua = F.larguraRua;
    const prims = [], linhas = [], textos = [], faltam = new Set();
    const put = (ps, dx, dy, layerDefault) => { for (const q of ps) { q.l = q.l && q.l !== '0' ? q.l : layerDefault; prims.push(translate([q], dx, dy)[0]); } };
    const line = (x1, y1, x2, y2, layer) => linhas.push({ l: layer, p: [[x1, y1], [x2, y2]] });
    const text = (x, y, h, s, layer, rot = 0, just = 1) => textos.push({ x, y, h, s, l: layer, rot, just });
    const cota = (x1, y1, x2, y2, off, label, vertical) => {
      if (!vertical) { line(x1, y1, x1, y1 + off, 'COTAS'); line(x2, y2, x2, y2 + off, 'COTAS'); line(x1, y1 + off, x2, y2 + off, 'COTAS'); text((x1 + x2) / 2, y1 + off + 20, 60, label, 'COTAS'); }
      else { line(x1, y1, x1 - off, y1, 'COTAS'); line(x2, y2, x2 - off, y2, 'COTAS'); line(x1 - off, y1, x2 - off, y2, 'COTAS'); text(x1 - off - 20, (y1 + y2) / 2, 60, label, 'COTAS', 90); }
    };
    const xs = []; for (let i = 0; i <= R; i++) xs.push(i * (rua + col) + col / 2); // eixos das colunas (rua = vão livre entre faces)
    const hy = furosFrontal(col, H), hx = HOLE_FX[col] || col / 2 - 18;
    const pe = hy.length ? hy[0] - FR_TOPO_FURO : 185; // pé da coluna (acima da sapata)
    const snapBraco = (y) => { let best = hy[0]; for (const h of hy) if (Math.abs(h - 15 - y) < Math.abs(best - 15 - y)) best = h; return best - 15; };
    xs.forEach((x, i) => {
      put(colunaFrontal(col, H), x, 0, 'MONTANTE');
      // caneleira 700 mm (sobre a sapata)
      const w = col / 2 + 6; [[x - w, 105], [x + w, 105]].forEach(() => {}); 
      const c0 = pe, c1 = pe + 700;
      line(x - w, c0, x + w, c0, 'CANELEIRA'); line(x + w, c0, x + w, c1, 'CANELEIRA'); line(x + w, c1, x - w, c1, 'CANELEIRA'); line(x - w, c1, x - w, c0, 'CANELEIRA');
      // braços: simples nas colunas externas (voltados para dentro), duplo nas internas
      const externa = i === 0 || i === R;
      for (const yNivel of F.niveis) {
        const mod = yNivel <= 2500 ? '180' : F.modeloAlto, yb = snapBraco(yNivel);
        if (externa) {
          const nome = `DI_BRACO_S${mod}_COL${col}`, blk = B()[nome];
          if (!blk) { faltam.add(nome); continue; }
          put(i === 0 ? clone(blk) : mirrorX(clone(blk)), x, yb, 'BRACO');
        } else {
          const nome = `DI_BRACO_D${mod}_COL${col}`, blk = B()[nome];
          if (!blk) { faltam.add(nome); continue; }
          put(clone(blk), x, yb, 'BRACO');
        }
      }
    });
    // longarina superior (DI_LGTOPO) em cada rua, conforme VISTA_FRONTAL_COM_DI_LGTOPO.dxf:
    // furo de fixação 8,46 mm acima do 3º furo de cima da coluna (topo da longarina 4,65 mm abaixo do topo da coluna)
    // e 2,23 mm além do centro do oblongo; o bloco é esticado pelo meio para acompanhar a largura da rua
    const LG_DX = 2.23, LG_DY = 8.46, LG_VAO0 = 1931.73;
    for (let i = 0; i < R; i++) {
      const src = B().DI_LGTOPO; if (!src) { faltam.add('DI_LGTOPO'); break; }
      const yLg = H - FR_TOPO_FURO - 100 + LG_DY, x1 = xs[i] + hx + LG_DX, x2 = xs[i + 1] - hx - LG_DX;
      put(stretchX(clone(src), LG_VAO0 / 2, (x2 - x1) - LG_VAO0), x1, yLg, 'LONGARINA');
      cota(xs[i] + col / 2, H + 80, xs[i + 1] - col / 2, H + 80, 150, `${rua}`, false);
    }
    const W = xs[R] + col / 2;
    const x0p = -1500, nP = Math.ceil((W + 3000) / 1000);
    for (let k = 0; k < nP; k++) put(piso(k === 0, k === nP - 1), x0p + k * 1000, 0, '0');
    cota(0, H + 80, W, H + 80, 450, `L = ${Math.round(W)}`, false);
    cota(-200, 0, -200, H, 600, `B = ${H}`, true);
    if (F.niveis.length) cota(-200, 0, -200, snapBraco(F.niveis[0]), 300, `1º braço ${Math.round(snapBraco(F.niveis[0]))}`, true);
    if (F.niveis.length > 1) cota(W + 400, F.niveis[0], W + 400, F.niveis[1], -300, `passo ${F.niveis[1] - F.niveis[0]}`, true);
    text(W / 2, -600, 120, titulo || 'VISTA FRONTAL', '4 - TEXTO DE ESCALA E VISTA');
    if (faltam.size) text(W / 2, -800, 70, 'Blocos ainda nao recebidos (nao desenhados): ' + [...faltam].join(', '), '4 - TEXTO DE ESCALA E VISTA');
    return { prims, linhas, textos, bbox: [-1500, -1000, W + 1600, H + 700], faltam: [...faltam] };
  }
  function shiftModel(m, dx) {
    for (const q of m.prims) { if (q.p) q.p = q.p.map((v) => [v[0] + dx, v[1]]); if (q.c) q.c = [q.c[0] + dx, q.c[1]]; }
    for (const q of m.linhas) q.p = q.p.map((v) => [v[0] + dx, v[1]]);
    for (const t of m.textos) t.x += dx;
    m.bbox = [m.bbox[0] + dx, m.bbox[1], m.bbox[2] + dx, m.bbox[3]];
    return m;
  }
  function dxfLateral(r, titulo, modelo) {
    const m = modelo || montarLateral(r, titulo), out = [];
    emit(out, m.prims, 0, 0, '0');
    for (const q of m.linhas) out.push('0', 'LINE', '8', ld(q.l), '10', f(q.p[0][0]), '20', f(q.p[0][1]), '30', '0', '11', f(q.p[1][0]), '21', f(q.p[1][1]), '31', '0');
    const asc = (s) => String(s).replace(/[^\x00-\x7F]/g, (c) => '\\U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')); // acentos no padrão do AutoCAD
    for (const t of m.textos) out.push('0', 'TEXT', '8', ld(t.l), '10', f(t.x), '20', f(t.y), '30', '0', '40', f(t.h), '1', asc(t.s), '50', f(t.rot), '72', String(t.just), '11', f(t.x), '21', f(t.y), '31', '0');
    const layers = Object.entries(LAYERS).filter(([n]) => n !== '0').flatMap(([name, c]) => ['0', 'LAYER', '2', ld(name), '70', '0', '62', String(c), '6', 'CONTINUOUS']);
    return ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'TABLES',
      '0', 'TABLE', '2', 'LTYPE', '70', '1', '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0', '0', 'ENDTAB',
      '0', 'TABLE', '2', 'LAYER', '70', String(Object.keys(LAYERS).length), '0', 'LAYER', '2', '0', '70', '0', '62', '7', '6', 'CONTINUOUS', ...layers, '0', 'ENDTAB',
      '0', 'TABLE', '2', 'STYLE', '70', '1', '0', 'STYLE', '2', 'STANDARD', '70', '0', '40', '0', '41', '1', '50', '0', '71', '0', '42', '2.5', '3', 'txt', '4', '', '0', 'ENDTAB',
      '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES', ...out, '0', 'ENDSEC', '0', 'EOF'].join('\n');
  }
  // ---- a mesma vista em SVG (tela): fundo escuro como o AutoCAD, cores por layer
  const COR = { MONTANTE: '#4f8cff', Contraventamento: '#9aa0a6', LONGARINA: '#22c55e', BRACO: '#f97316', CANELEIRA: '#facc15', COTAS: '#e5e7eb', '4 - TEXTO DE ESCALA E VISTA': '#facc15', 0: '#e5e7eb' };
  function dxfCompleto(r, titulo) {
    const mL = montarLateral(r, `CORTE - VISTA LATERAL ${titulo || ''}`.trim()), mF = montarFrontal(r, `VISTA FRONTAL ${titulo || ''}`.trim());
    shiftModel(mF, mL.bbox[2] + 2000 - mF.bbox[0]);
    const m = { prims: mL.prims.concat(mF.prims), linhas: mL.linhas.concat(mF.linhas), textos: mL.textos.concat(mF.textos) };
    return dxfLateral(r, titulo, m);
  }
  function svgFrontal(r, titulo) { return svgModelo(montarFrontal(r, titulo)); }
  function svgLateral(r, titulo) { return svgModelo(montarLateral(r, titulo)); }
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
        if (q.t === 'c') parts.push(`<circle cx="${X(q.c[0])}" cy="${Y(q.c[1])}" r="${q.r.toFixed(1)}" fill="none" stroke="${COR[l] || '#fff'}" stroke-width="${sw}" vector-effect="non-scaling-stroke"/>`);
        else path += 'M' + q.p.map((v, i) => (i ? 'L' : '') + X(v[0]) + ' ' + Y(v[1])).join('');
      }
      if (path) parts.push(`<path d="${path}" fill="none" stroke="${COR[l] || '#fff'}" stroke-width="${sw}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`);
    }
    for (const t of m.textos) parts.push(`<text x="${X(t.x)}" y="${Y(t.y)}" font-size="${t.h}" fill="${COR[t.l] || '#fff'}" text-anchor="${t.just === 1 ? 'middle' : 'start'}" transform="rotate(${-t.rot} ${X(t.x)} ${Y(t.y)})" font-family="Arial, sans-serif">${t.s}</text>`);
    return `<svg viewBox="0 0 ${W.toFixed(0)} ${Hh.toFixed(0)}" style="background:#1f2430"><rect width="100%" height="100%" fill="#1f2430"/>${parts.join('')}</svg>`;
  }
  const DXF = { dxfLateral, dxfCompleto, svgLateral, svgFrontal, montarLateral, montarFrontal, colunaFrontal };
  if (typeof module !== 'undefined' && module.exports) module.exports = DXF; else root.DXF = DXF;
})(typeof window !== 'undefined' ? window : globalThis);
