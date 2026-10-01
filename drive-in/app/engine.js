// Motor de cálculo do configurador Drive-In.
// Regras: ver ../REGRAS_RASCUNHO.md. Dados: catalogo.json (gerado de CATALOGO.xlsx).
// Funciona no navegador (window.Engine) e no Node (module.exports).
(function (root) {
  'use strict';

  const KG_M_TRAVESSA = 80 * 1.4 * 7.85e-6 * 1000; // sliter 80 x 1,40 (ACO0602), sliter fechado
  const MAX_PECA = 8500;      // limite da cabine de pintura (mm)
  const PASSO_COLUNA = 50;    // altura da coluna em múltiplos de 50 mm
  const TOL_SA = 3;           // ±3 mm para aceitar um SA de travessa/diagonal
  const LARGURA_RUA = 1400;   // única largura cadastrada

  const SEM = { SA: 'SA04XXXX', CO: 'COXXXXXX', PA: 'PAXXXXXX', PK: 'PKXXXXXX' };

  const PARAFUSO_TRAV = { 80: 'INT0993', 101: 'INT0958', 122: 'INT0973' };
  const TUBO = { 80: 'TUBO-80', 101: 'TUBO-101', 122: 'TUBO-122' };
  const PLACA = { 80: 'PLN-80-101', 101: 'PLN-80-101', 122: 'PLN-122' };
  const SAPATA = { 80: 'SAP-80', 101: 'SAP-101', 122: 'SAP-122' };

  const r50 = (v) => Math.ceil(v / PASSO_COLUNA) * PASSO_COLUNA;
  const r1 = (v) => Math.round(v * 10) / 10;

  function prodOf(cat, id) {
    let p = cat.produtos[id];
    if (!p) p = Object.values(cat.produtos).find((x) => x.codigo === id) || {};
    return { id, desc: p.desc || id, codigo: p.codigo || '', peso: p.peso, unid: p.unid, aco: p.aco || '' };
  }

  function buscaSA(lista, total) {
    let best = null;
    for (const it of lista) {
      const d = Math.abs(it.total - total);
      if (d <= TOL_SA && (!best || d < best.d)) best = { d, it };
    }
    return best ? best.it : null;
  }

  // Posições das travessas horizontais (mm, do pé da coluna): 100, +600 x3, depois +900; a última no topo.
  function posicoesHorizontais(H) {
    const ys = [100];
    for (let i = 0; i < 3 && ys[ys.length - 1] + 600 <= H - 100; i++) ys.push(ys[ys.length - 1] + 600);
    while (ys[ys.length - 1] + 900 <= H - 100) ys.push(ys[ys.length - 1] + 900);
    if (H - 100 - ys[ys.length - 1] > 1) ys.push(H - 100); // travessa de topo [CONFIRMAR posição]
    return ys;
  }

  function calcular(inp, cat) {
    const col = Number(inp.coluna);
    const esp = String(inp.espessura);
    const R = Number(inp.ruas), P = Number(inp.paletesPorRua), N = Number(inp.niveis);
    const n = Number(inp.espacamentos), A = Number(inp.largura);
    const alertas = [], pend = [], pecas = [];
    const add = (grupo, id, desc, codigo, qtd, compr, pesoUnit, obs) =>
      pecas.push({ grupo, id, desc, codigo: codigo || '', qtd, compr: compr || null, pesoUnit: pesoUnit == null ? null : pesoUnit, pesoTotal: pesoUnit == null ? null : qtd * pesoUnit, obs: obs || '' });

    // ---- geometria
    const Hcalc = Number(inp.alt1Nivel) + (N - 2) * (Number(inp.alturaPalete) + 200) + 1400;
    const H = inp.alturaManual ? r50(Number(inp.alturaManual)) : r50(Hcalc);
    if (!inp.alturaManual && H !== Hcalc) alertas.push(`Altura calculada ${Hcalc} mm arredondada para ${H} mm (múltiplo de 50).`);
    if (H > 2 * MAX_PECA) alertas.push(`Altura ${H} mm excede o máximo de ${2 * MAX_PECA} mm (uma emenda, peças de até ${MAX_PECA} mm).`);
    if (Number(inp.alt1Nivel) > 2005) alertas.push('1º nível acima de 2005 mm: a planilha antiga exigia análise de engenharia.');
    if (H > MAX_PECA) alertas.push('Altura acima de 8500 mm: a planilha antiga exigia análise de engenharia. Emenda incluída.');
    if (Number(inp.larguraRua || LARGURA_RUA) !== LARGURA_RUA) alertas.push('Largura de rua diferente de 1400 mm: sem regra cadastrada.');
    if (n !== P + 1) alertas.push(`Espaçamentos (${n}) ≠ paletes por rua + 1 (${P + 1}). Relação a confirmar (pergunta 2 das regras).`);

    const laterais = R + 1;                 // [CONFIRMAR] laterais compartilhadas entre ruas
    const colPorLateral = n + 1;
    const colunas = laterais * colPorLateral;
    const largura = R * LARGURA_RUA + laterais * col;
    const profundidade = n * A + 100;       // [CONFIRMAR] planilha antiga: A tratado como passo entre colunas; +100 sem origem
    const posicoes = R * P * N;

    // ---- colunas (+ emenda)
    const kgm = (cat.colunas[String(col)] || {})[esp];
    if (kgm == null) alertas.push(`Perfil COL ${col} #${esp} mm não encontrado no catálogo.`);
    const saCol = (h) => (cat.colunas_sa[String(col)] || {})[String(h)] || SEM.SA;
    const trechos = H > MAX_PECA ? [MAX_PECA, H - MAX_PECA] : [H];
    trechos.forEach((L, i) => {
      const sa = saCol(L);
      add('Colunas', `COL-${col}-${L}`, `AMPP COL ${col} C/ABA #${esp} mm – ${L} mm${trechos.length > 1 ? (i ? ' (superior)' : ' (inferior)') : ''}`, sa, colunas, L, kgm != null ? kgm * L / 1000 : null,
        sa === SEM.SA ? 'altura sem SA cadastrado' : '');
    });
    const emendas = H > MAX_PECA ? colunas : 0;
    if (emendas) {
      pend.push('Posição da emenda: regra "o mais alta possível, desviando de braços e longarinas" ainda não aplicada (usa 8500 + restante).');
      for (const c of cat.composicao.filter((x) => x.pai === 'EMENDA')) {
        const p = prodOf(cat, c.item);
        add('Emenda de coluna', c.item, p.desc, p.codigo, c.qtd * emendas, null, p.peso);
      }
    }

    // ---- sapatas
    for (const c of cat.composicao.filter((x) => x.pai === SAPATA[col])) {
      const p = prodOf(cat, c.item);
      add('Sapatas', c.item, p.desc, p.codigo || (c.item.startsWith('SAP-U') ? SEM.SA : ''), c.qtd * colunas, null, c.item.startsWith('SAP-') && c.item !== SAPATA[col] ? null : p.peso);
    }
    const sap = prodOf(cat, SAPATA[col]);
    add('Sapatas', SAPATA[col], sap.desc + ' (conjunto)', sap.codigo || SEM.CO, colunas, null, sap.peso, 'peso do conjunto (componentes acima sem peso próprio)');

    // ---- laterais: travessas, diagonais, tubos, parafusos
    const ys = posicoesHorizontais(H);
    const nH = ys.length, nD = nH - 1 - 1; // todos os vãos menos o de topo
    const vaos = laterais * n;
    const ccH = A - 109.1, totH = A - 78.6;
    const itH = buscaSA(cat.travessas, totH);
    add('Travessas', 'TRAV-H', `Travessa horizontal – lateral ${A} mm (total ${r1(totH)} mm, c/c ${r1(ccH)} mm)`, itH ? itH.sa : SEM.SA, nH * vaos, r1(totH), KG_M_TRAVESSA * totH / 1000, itH ? itH.nome : 'sem SA no cadastro (±3 mm)');
    const diagPorV = {};
    for (let i = 0; i < nD; i++) { const V = ys[i + 1] - ys[i]; diagPorV[V] = (diagPorV[V] || 0) + 1; }
    for (const [V, q] of Object.entries(diagPorV)) {
      const cc = Math.hypot(ccH, Number(V)), tot = cc + 30.5;
      const it = buscaSA(cat.diagonais, tot);
      add('Travessas', `TRAV-D-${V}`, `Travessa diagonal – vão ${V} mm (total ${r1(tot)} mm, c/c ${r1(cc)} mm)`, it ? it.sa : SEM.SA, q * vaos, r1(tot), KG_M_TRAVESSA * tot / 1000, it ? it.nome : 'sem SA no cadastro (±3 mm)');
    }
    const tubos = (2 * nH - 2 * nD) * vaos;
    const tb = prodOf(cat, TUBO[col]);
    add('Travessas', TUBO[col], tb.desc, tb.codigo, tubos, null, tb.peso, 'nós de travessa sem diagonal');
    const nPar = 2 * nH * vaos;
    const par = prodOf(cat, PARAFUSO_TRAV[col]), porca = prodOf(cat, 'INT0650');
    add('Fixadores das travessas', par.id, par.desc, par.codigo, nPar, null, null);
    add('Fixadores das travessas', 'INT0650', porca.desc, porca.codigo, nPar, null, null, 'diagonais usam o mesmo parafuso da horizontal');

    // ---- ainda não levantado
    pend.push(`Profundidade usa a fórmula da planilha antiga (espaçamentos × ${A} + 100), que trata ${A} mm como passo entre colunas. Se ${A} for a largura total da lateral (face a face), a profundidade seria ${n * (A - col) + col} mm. A confirmar.`);
    pend.push('Braços (simples/duplo 180/230), contraventamentos LG-UE superior e de fundo, viga túnel e complemento, diagonais superiores e de amarração de fundo, protetores de coluna e caneleira, stop de palete: ainda não levantados. Não entram no peso.');
    if (col === 80) pend.push('COL 80: sapata (CO) e perfil U (SA) sem código cadastrado.');

    const pesoTotal = pecas.reduce((s, p) => s + (p.pesoTotal || 0), 0);
    return {
      entradas: { ...inp, coluna: col, espessura: esp },
      dimensoes: { altura: H, alturaCalculada: Hcalc, largura, profundidade, laterais, colPorLateral, colunas, emendas },
      posicoes, pesoTotal, kgPorPosicao: posicoes ? pesoTotal / posicoes : null,
      lateral: { ys, nH, nD, tubosPorVao: 2 * nH - 2 * nD, ccH: r1(ccH), totH: r1(totH), A },
      pecas, alertas, pendencias: pend,
    };
  }

  const Engine = { calcular, posicoesHorizontais, buscaSA, KG_M_TRAVESSA, SEM };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine; else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
