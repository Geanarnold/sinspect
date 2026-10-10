// Relatório de emissão em PDF (A4), gerado no "Emitir" / "Conferir e aprovar projeto".
// Usa jsPDF + jsPDF-AutoTable (lib/, licença MIT). Conteúdo: identificação, responsabilidades, resumo por corte,
// conferência dos dados (personalizados destacados), pendências, lista de peças consolidada, aprovação e histórico.
(function () {
  'use strict';
  const LARANJA = [234, 88, 12], TINTA = [15, 23, 42], CINZA = [100, 116, 139], AMARELO = [254, 249, 195];
  const fmt = (v, d = 1) => (v == null || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));

  // fontes padrão do PDF (WinAnsi): troca símbolos fora da tabela, senão o texto sai espaçado/quebrado
  const limpa = (v) => typeof v === 'string' ? v.replace(/→/g, '->').replace(/←/g, '<-').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≈/g, '~').replace(/[^\x00-\xFF\u2013\u2014\u2026\u2022\u201C\u201D\u2018\u2019\u20AC]/g, '?')
    : Array.isArray(v) ? v.map(limpa) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, limpa(x)])) : v;
  function gerar(D0) {
    const D = limpa(D0);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' }), W = 210, M = 14;
    let y = 16;
    const titulo = (t) => { if (y > 260) { doc.addPage(); y = 18; } doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...LARANJA); doc.text(t, M, y); y += 2; doc.setDrawColor(...LARANJA); doc.setLineWidth(0.4); doc.line(M, y, W - M, y); y += 5; doc.setTextColor(...TINTA); };
    const tabela = (opc) => { doc.autoTable({ startY: y, margin: { left: M, right: M }, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.4, textColor: TINTA, lineColor: [226, 232, 240], lineWidth: 0.1 }, headStyles: { fillColor: [241, 245, 249], textColor: TINTA, fontStyle: 'bold' }, ...opc }); y = doc.lastAutoTable.finalY + 7; };
    const paragrafo = (t, tam = 9, cor = TINTA) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(tam); doc.setTextColor(...cor); for (const l of doc.splitTextToSize(t, W - 2 * M)) { if (y > 280) { doc.addPage(); y = 18; } doc.text(l, M, y); y += tam * 0.45; } y += 2; };

    // cabeçalho
    doc.setFillColor(...TINTA); doc.rect(0, 0, W, 24, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(255, 255, 255); doc.text('Relatório de Emissão — Drive-In', M, 11);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`${D.cab.projeto || ''}  ·  ${D.cab.revisao || ''}  ·  emitido em ${D.data}`, M, 18);
    y = 32;
    titulo('Identificação');
    tabela({ body: [['Projeto (nº do processo)', D.cab.projeto], ['Cliente', D.cab.cliente], ['Cidade / UF', `${D.cab.cidade || ''} / ${D.cab.uf || ''}`], ['Representante', D.cab.representante || '—'], ['Responsável técnico', D.cab.rt || '—'], ['Desenhista', D.cab.responsavel], ['Revisão', D.cab.revisao], ['Catálogo usado', D.catalogo]], columnStyles: { 0: { cellWidth: 55, textColor: CINZA } } });

    titulo('Responsabilidades');
    for (const t of D.responsabilidades) paragrafo('• ' + t, 8.5);

    titulo('Resumo');
    tabela({ head: [['Corte', 'Blocos', 'Posições', 'Largura × prof. × altura (mm)', 'Peso (kg)']], body: D.cortes.map((c) => [c.nome, c.qtd, c.posicoes, c.dims, fmt(c.peso)]).concat([[{ content: 'Total do projeto', colSpan: 2, styles: { fontStyle: 'bold' } }, { content: String(D.totais.posicoes), styles: { fontStyle: 'bold' } }, '', { content: fmt(D.totais.peso), styles: { fontStyle: 'bold' } }]]) });
    paragrafo(`Peso dos itens com peso cadastrado (fixadores e itens sem peso não entram). ${D.totais.semPeso} item(ns) sem peso — ver pendências.`, 8, CINZA);

    titulo('Conferência dos dados');
    for (const bloco of D.conferencia) {
      tabela({ head: [[{ content: bloco.titulo, colSpan: 2 }]], body: bloco.linhas.map(([k, v, pers]) => (k.startsWith('§') ? [{ content: k.slice(1), colSpan: 2, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }] : [k, pers ? `${v}  (personalizado)` : v])),
        columnStyles: { 0: { cellWidth: 90, textColor: CINZA } },
        didParseCell: (h) => { const ln = bloco.linhas[h.row.index]; if (h.section === 'body' && ln && ln[2]) { h.cell.styles.fillColor = AMARELO; h.cell.styles.fontStyle = 'bold'; } } });
    }

    titulo('Pendências na emissão');
    const pend = [['Atenção', D.pend.alertas], ['Itens sem código cadastrado', D.pend.semCod], ['Itens sem peso (não entram no total)', D.pend.semPeso], ['Pesos estimados', D.pend.est], ['Regras / dados a confirmar', D.pend.confirmar]].filter(([, l]) => l.length);
    if (!pend.length) paragrafo('Nenhuma pendência.', 9);
    for (const [t, l] of pend) tabela({ head: [[`${t} (${l.length})`]], body: l.map((x) => [x]) });

    titulo('Lista de peças consolidada');
    tabela({ head: [['Grupo', 'Código', 'Descrição', 'Qtd', 'Compr. (mm)', 'kg/un', 'kg total']], body: D.itens.map((p) => [p.grupo, p.codigo, p.desc, p.qtd, p.compr ?? '', p.pesoUnit == null ? '—' : fmt(p.pesoUnit, 3), p.pesoTotal == null ? '—' : fmt(p.pesoTotal)]),
      styles: { fontSize: 7, cellPadding: 1 }, columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 20 }, 3: { halign: 'right', cellWidth: 12 }, 4: { halign: 'right', cellWidth: 16 }, 5: { halign: 'right', cellWidth: 14 }, 6: { halign: 'right', cellWidth: 16 } } });

    titulo('Aprovação do operador');
    tabela({ body: [['Dados do projeto conferidos', 'SIM'], ['Pendências lidas e emissão assumida', 'SIM'], ['Aprovado por', D.aprovador], ['Data / hora', D.data]], columnStyles: { 0: { cellWidth: 90, textColor: CINZA }, 1: { fontStyle: 'bold' } } });

    titulo('Histórico de revisões');
    tabela({ head: [['Revisão', 'Por', 'Data', 'Alterações']], body: D.historico.map((h) => [h.rev + (h.emissao ? ' (EMISSÃO)' : ''), h.por, new Date(h.em).toLocaleString('pt-BR'), (h.mudancas || []).join('\n')]), columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 26 }, 2: { cellWidth: 32 } } });

    // rodapé em todas as páginas
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...CINZA); doc.text(`${D.cab.projeto || ''} · ${D.cab.revisao || ''} · Configurador Drive-In`, M, 290); doc.text(`Página ${i} de ${n}`, W - M, 290, { align: 'right' }); }
    return doc;
  }
  window.Relatorio = { gerar };
})();
