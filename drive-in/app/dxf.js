// Exporta a vista lateral em DXF (R12/AC1009, texto puro), no padrão do gabarito DRIVE_IN.dxf:
// layers MONTANTE (cor 170, colunas), Contraventamento (cor 9, travessas/diagonais/topo), COTAS (cor 7), TEXTO (cor 2).
(function (root) {
  'use strict';
  const L = { MONTANTE: 170, Contraventamento: 9, COTAS: 7, '4 - TEXTO DE ESCALA E VISTA': 2 };
  const f = (v) => (Math.round(v * 100) / 100).toString();
  function dxfLateral(r, titulo) {
    const { ys, espacos, solteira, nD } = r.lateral, H = r.dimensoes.altura, n = espacos.length, col = Number(r.entradas.coluna);
    const prof = 102; // profundidade da coluna na vista lateral [aprox.; o gabarito usa o perfil real]
    const xs = [0]; espacos.forEach((a) => xs.push(xs[xs.length - 1] + a));
    const out = [];
    const line = (x1, y1, x2, y2, layer) => out.push('0', 'LINE', '8', layer, '10', f(x1), '20', f(y1), '30', '0', '11', f(x2), '21', f(y2), '31', '0');
    const rect = (x, y, w, h, layer) => { line(x, y, x + w, y, layer); line(x + w, y, x + w, y + h, layer); line(x + w, y + h, x, y + h, layer); line(x, y + h, x, y, layer); };
    const text = (x, y, h, s, layer, rot = 0, just = 1) => out.push('0', 'TEXT', '8', layer, '10', f(x), '20', f(y), '30', '0', '40', f(h), '1', s, '50', f(rot), '72', String(just), '11', f(x), '21', f(y), '31', '0');
    const cota = (x1, y1, x2, y2, off, label, vertical) => {
      // linha de cota com extensões e texto (sem entidade DIMENSION, para compatibilidade)
      if (!vertical) { line(x1, y1, x1, y1 + off, 'COTAS'); line(x2, y2, x2, y2 + off, 'COTAS'); line(x1, y1 + off, x2, y2 + off, 'COTAS'); text((x1 + x2) / 2, y1 + off + 20, 60, label, 'COTAS'); }
      else { line(x1, y1, x1 - off, y1, 'COTAS'); line(x2, y2, x2 - off, y2, 'COTAS'); line(x1 - off, y1, x2 - off, y2, 'COTAS'); text(x1 - off - 20, (y1 + y2) / 2, 60, label, 'COTAS', 90); }
    };
    const base = 0, esp = 30; // travessas desenhadas com 30 mm de altura (perfil 30x22)
    // colunas (eixo em xs[i]; retângulo de 'prof' centrado) + sapata
    xs.forEach((x) => { rect(x - prof / 2, base, prof, H, 'MONTANTE'); rect(x - 77, base - 10, 155, 10, 'MONTANTE'); });
    for (let i = 0; i < n; i++) {
      const x0 = xs[i] + prof / 2, x1 = xs[i + 1] - prof / 2;
      const uniao = solteira && i === 0, quadro = solteira ? i % 2 === 1 : i % 2 === 0;
      if (quadro || uniao) ys.forEach((y) => rect(x0, y - esp / 2, x1 - x0, esp, 'Contraventamento'));
      if (quadro) for (let k = 0; k < nD; k++) { // diagonal como perfil de 30 mm (duas linhas paralelas)
        const ax = x0, ay = ys[k] + esp / 2, bx = x1, by = ys[k + 1] - esp / 2, len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / len * esp, ny = (bx - ax) / len * esp;
        line(ax, ay, bx, by, 'Contraventamento'); line(ax + nx, ay + ny, bx + nx, by + ny, 'Contraventamento'); line(ax, ay, ax + nx, ay + ny, 'Contraventamento'); line(bx, by, bx + nx, by + ny, 'Contraventamento');
      }
      rect(x0, H - 26, x1 - x0, 48, 'Contraventamento'); // elemento de topo (Travessa Sup)
      cota(xs[i], H + 60, xs[i + 1], H + 60, 300, `A${i + 1}`, false);
    }
    cota(xs[0], H + 60, xs[n], H + 60, 700, 'A', false);
    cota(xs[0] - prof / 2 - 60, base, xs[0] - prof / 2 - 60, H, 900, 'B', true);
    cota(xs[0] - prof / 2 - 60, ys[0], xs[0] - prof / 2 - 60, ys[1], 300, 'C', true);
    line(xs[0] - 2000, base - 10, xs[n] + 2000, base - 10, 'MONTANTE'); // piso
    text((xs[0] + xs[n]) / 2, base - 500, 120, titulo || 'CORTE A - VISTA LATERAL', '4 - TEXTO DE ESCALA E VISTA');
    // tabela de cotas
    const tab = [['B', H], ['C', ys[1] - ys[0]], ['A', xs[n]]].concat(espacos.map((a, i) => [`A${i + 1}`, a]));
    tab.forEach(([k, v], i) => text(xs[n] + 1500, H - i * 200, 100, `${k} = ${v} mm`, '4 - TEXTO DE ESCALA E VISTA', 0, 0));
    const layers = Object.entries(L).flatMap(([name, c]) => ['0', 'LAYER', '2', name, '70', '0', '62', String(c), '6', 'CONTINUOUS']);
    return ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', String(Object.keys(L).length), ...layers, '0', 'ENDTAB', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES', ...out, '0', 'ENDSEC', '0', 'EOF'].join('\n');
  }
  const DXF = { dxfLateral };
  if (typeof module !== 'undefined' && module.exports) module.exports = DXF; else root.DXF = DXF;
})(typeof window !== 'undefined' ? window : globalThis);
