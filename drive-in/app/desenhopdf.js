// PDF das folhas do projeto (as mesmas folhas A0 do DXF, com carimbo), em vetor, para imprimir ou enviar.
// Lê o modelo montado por DXF.projetoModelo (mesmas peças, cotas e textos do DXF) e desenha cada folha FOLHA_A0_SUPRA
// numa página A0 (1189 x 841 mm), na escala da folha. Usa jsPDF (lib/, licença MIT).
(function () {
  'use strict';
  // cores para papel branco (o DXF usa as cores do AutoCAD, pensadas para fundo escuro)
  const COR = {
    MONTANTE: [37, 99, 235], MONTANTE_HACHURA: [37, 99, 235], BRACO_HACHURA: [234, 88, 12], BRACO_LT: [234, 88, 12], LONGARINA_TUNEL: [234, 88, 12],
    LONGARINA_FUNDO: [234, 88, 12], FOLHA_LOGO: [234, 88, 12], PALETE: [146, 64, 14], PALETE_HACHURA: [180, 83, 9], LONGARINA: [22, 163, 74],
    Contraventamento: [100, 116, 139], TRILHO: [202, 138, 4], CANELEIRA_HACHURA: [250, 204, 21], FOLHA_NOTA: [220, 38, 38],
  };
  const ESP = { MONTANTE: 0.25, FOLHA: 0.3, FOLHA_LINHA: 0.18, COTAS: 0.09, Contraventamento: 0.13 }; // espessura de linha no papel (mm)
  const cor = (l) => COR[l] || [17, 24, 39];
  const limpa = (s) => String(s).replace(/→/g, '->').replace(/[^\x00-\xFF–—…•]/g, '?');

  function gerar(modelo, nomeArquivo) {
    const { jsPDF } = window.jspdf, Fo = DXF.folhaPadrao();
    const folhas = modelo.items.filter((it) => it.nome === 'FOLHA_A0_SUPRA');
    if (!Fo || !folhas.length) throw new Error('folha padrão não encontrada');
    const [bx0, by0, bx1, by1] = Fo.borda, PW = 1189, PH = 841, dx = (PW - (bx1 - bx0)) / 2, dy = (PH - (by1 - by0)) / 2;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a0', compress: true });
    folhas.forEach((fo, k) => {
      if (k) doc.addPage('a0', 'landscape');
      const S = fo.esc || 1;
      // modelo (mm reais) → papel (mm): x = (X − origem)/S − borda + margem; y invertido
      const PX = (x) => (x - fo.x) / S - bx0 + dx, PY = (y) => PH - ((y - fo.y) / S - by0 + dy);
      const xMin = fo.x + bx0 * S, xMax = fo.x + bx1 * S, yMin = fo.y + by0 * S, yMax = fo.y + by1 * S;
      const dentro = (p) => p[0] >= xMin && p[0] <= xMax && p[1] >= yMin && p[1] <= yMax;
      const porLayer = new Map(), add = (l, f) => { if (!porLayer.has(l)) porLayer.set(l, []); porLayer.get(l).push(f); };
      // geometria da folha (coordenadas locais já em mm de papel)
      for (const q of Fo.prims) add(q.l, { q, folha: true });
      for (const q of modelo.prims) { const pts = q.p || (q.c ? [q.c] : []); if (pts.length && dentro(pts[0])) add(q.l, { q }); }
      for (const q of modelo.linhas) if (dentro(q.p[0])) add(q.l, { q });
      for (const [l, lista] of porLayer) {
        const c = cor(l); doc.setDrawColor(...c); doc.setFillColor(...c); doc.setLineWidth(ESP[l] || 0.13);
        for (const { q, folha } of lista) {
          const X = folha ? (x) => x - bx0 + dx : PX, Y = folha ? (y) => PH - (y - by0 + dy) : PY;
          if (q.t === 's') { const [a, b, cc, e] = q.p; doc.triangle(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), X(e[0]), Y(e[1]), 'F'); doc.triangle(X(a[0]), Y(a[1]), X(e[0]), Y(e[1]), X(cc[0]), Y(cc[1]), 'F'); continue; }
          if (q.t === 'c') { doc.circle(X(q.c[0]), Y(q.c[1]), q.r / (folha ? 1 : S), 'S'); continue; }
          if (q.p) for (let i = 0; i < q.p.length - 1; i++) doc.line(X(q.p[i][0]), Y(q.p[i][1]), X(q.p[i + 1][0]), Y(q.p[i + 1][1]));
        }
      }
      // textos (do modelo e da folha, já incluídos em modelo.textos pela montagem da folha)
      doc.setFont('helvetica', 'normal');
      for (const t of modelo.textos) {
        if (!dentro([t.x, t.y]) || !t.s) continue;
        const hmm = t.h / S; if (hmm < 0.4) continue; // texto menor que 0,4 mm no papel não é legível
        doc.setTextColor(...cor(t.l)); doc.setFontSize(hmm / 0.3528 / 0.72); // altura de maiúscula ≈ 0,72 do corpo
        doc.text(limpa(t.s), PX(t.x), PY(t.y), { angle: t.rot || 0, align: ['left', 'center', 'right'][Math.min(t.just || 0, 2)], baseline: ['alphabetic', 'bottom', 'middle', 'top'][t.v || 0] });
      }
    });
    if (nomeArquivo) doc.save(nomeArquivo);
    return doc;
  }
  window.DesenhoPdf = { gerar };
})();
