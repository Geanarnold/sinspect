// Exporta a vista lateral em DXF R12 usando os blocos DI_* do responsável técnico (blocos.js).
// Layers: MONTANTE (170), Contraventamento (9), COTAS (7), "4 - TEXTO DE ESCALA E VISTA" (2).
(function (root) {
  'use strict';
  const LAYERS = { MONTANTE: 170, Contraventamento: 9, COTAS: 7, '4 - TEXTO DE ESCALA E VISTA': 2, 0: 7 };
  // DXF R12 não aceita espaços em nomes de layer: nome gravado no arquivo (o AutoCAD mostra estes)
  const LAYER_DXF = { MONTANTE: 'MONTANTE', Contraventamento: 'CONTRAVENTAMENTO', COTAS: 'COTAS', '4 - TEXTO DE ESCALA E VISTA': 'TEXTO_ESCALA_VISTA', 0: '0' };
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
  function dxfLateral(r, titulo) {
    const m = montarLateral(r, titulo), out = [];
    emit(out, m.prims, 0, 0, '0');
    for (const q of m.linhas) out.push('0', 'LINE', '8', ld(q.l), '10', f(q.p[0][0]), '20', f(q.p[0][1]), '30', '0', '11', f(q.p[1][0]), '21', f(q.p[1][1]), '31', '0');
    for (const t of m.textos) out.push('0', 'TEXT', '8', ld(t.l), '10', f(t.x), '20', f(t.y), '30', '0', '40', f(t.h), '1', t.s, '50', f(t.rot), '72', String(t.just), '11', f(t.x), '21', f(t.y), '31', '0');
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
  const COR = { MONTANTE: '#4f8cff', Contraventamento: '#9aa0a6', COTAS: '#e5e7eb', '4 - TEXTO DE ESCALA E VISTA': '#facc15', 0: '#e5e7eb' };
  function svgLateral(r, titulo) {
    const m = montarLateral(r, titulo), [x0, y0, x1, y1] = m.bbox, W = x1 - x0, Hh = y1 - y0;
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
  const DXF = { dxfLateral, svgLateral, montarLateral };
  if (typeof module !== 'undefined' && module.exports) module.exports = DXF; else root.DXF = DXF;
})(typeof window !== 'undefined' ? window : globalThis);
