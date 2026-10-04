// Motor de cálculo do configurador Drive-In.
// Regras: ver ../REGRAS_RASCUNHO.md. Dados: catalogo.json (gerado de CATALOGO.xlsx).
// Funciona no navegador (window.Engine) e no Node (module.exports).
(function (root) {
  'use strict';

  const KG_M_TRAVESSA = 80 * 1.4 * 7.85e-6 * 1000; // sliter 80 x 1,40 (ACO0602), sliter fechado
  const DENS = 7.85e-6;       // kg/mm³ (aço)
  const MAX_PECA = 8500;      // limite da cabine de pintura (mm)
  const PASSO_COLUNA = 50;    // altura da coluna em múltiplos de 50 mm
  const TOL_SA = 3;           // ±3 mm para aceitar um SA de travessa/diagonal
  const LARGURA_RUA = 1400;   // padrão quando o operador não informa (vão livre entre colunas)

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
    return ys; // a última fica no último passo que cabe; o vão até o topo fecha com o elemento de topo (DXF de referência)
  }

  // ---- tabelas de dimensionamento F 346 a F 351 (Treinamento Comercial Drive-In fev/2024, Eng. Rafael Brant)
  // premissas das tabelas: rua 1400, braço 230, 1º braço até 2000 mm, contraventamento de topo e fundo em zig-zag, espaçamento 1025
  // cortes = níveis acima do chão (C+n). Espaçamento especial: { nº de paletes na profundidade: [espaços, medida] }; null = não permitido
  const GAUGE_MM = { 12: '2.65', 13: '2.25', 14: '2.0', 15: '1.8', 16: '1.5' }; // [CONFIRMAR] bitola # → espessura do catálogo
  const RED = { 1000: { 3: [4, 769], 4: [5, 820], 5: [6, 855], 6: [7, 879], 7: [8, 897], 8: [9, 912], 9: [10, 923] },
                1200: { 3: [4, 769], 4: [6, 684], 5: [7, 733], 6: [8, 769], 7: [10, 718], 8: [11, 746], 9: [12, 769] } };
  const DIMENS = [
    { f: 'F 346', H: 4000, C: 1, k: { 600: ['80', 15, 15], 1000: ['80', 15, 15], 1200: ['80', 15, 15], 1500: ['80', 15, 14] } },
    { f: 'F 347', H: 6000, C: 2, k: { 600: ['80', 15, 15], 1000: ['80', 15, 15], 1200: ['101', 15, 15], 1500: ['101', 15, 14] } },
    { f: 'F 348', H: 6000, C: 3, k: { 600: ['80', 15, 15], 1000: ['101', 15, 15], 1200: ['101', 15, 15], 1500: ['101', 14, 14] } },
    { f: 'F 349', H: 8500, C: 3, k: { 600: ['101', 15, 15], 1000: ['122', 15, 15], 1200: ['122', 14, 15], 1500: ['122', 12, 14] } },
    { f: 'F 350', H: 8500, C: 4, k: { 600: ['122', 15, 15], 1000: ['122', 13, 15], 1200: ['122', 12, 15],
        1500: ['122', 12, 15, { 2: 'AMPP122#15 + requadro', ...RED[1200] }] } },
    { f: 'F 351', H: 8500, C: 5, k: { 600: ['122', 15, 15], 1000: ['122', 12, 15, { 2: 'AMPP122#15 + requadro', ...RED[1000] }],
        1200: ['122', 12, 15, { 2: 'AMPP122#15 + requadro', ...RED[1200] }],
        1500: ['122', 12, 15, { 2: 'AMPP122#13 + requadro', 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null }] } },
  ];
  function dimensionar({ H, cortes, carga, col, esp, P, rua, alt1, balAlto, cD }) {
    const out = { alertas: [], erros: [], sugestao: null };
    const t = DIMENS.filter((d) => d.H >= H && d.C >= cortes).sort((a, b) => a.H - b.H || a.C - b.C)[0];
    const cargas = [600, 1000, 1200, 1500], kc = cargas.find((c) => c >= carga);
    if (!t || !kc) { out.alertas.push(`Fora das tabelas F 346–F 351 (altura ${H} mm, chão + ${cortes}, ${carga} kg): dimensionamento pela engenharia.`); return out; }
    const [c, g, gb, esp2] = t.k[kc], e = GAUGE_MM[g];
    out.sugestao = { tabela: t.f, coluna: c, espessura: e, gauge: g, braco: `Ue94x40x15#${gb}`, bracoEsp: GAUGE_MM[gb], carga: kc };
    const ref = `${t.f} (${t.H} mm, chão + ${t.C}, ${kc} kg): coluna AMPP${c}#${g} (${e} mm), braço Ue94x40x15#${gb} (${GAUGE_MM[gb]} mm)`;
    const fraca = Number(col) < Number(c) || (Number(col) === Number(c) && Number(esp) < Number(e));
    if (fraca) out.erros.push(`Coluna COL ${col} / ${esp} mm abaixo do dimensionamento da ${ref}.`);
    else out.alertas.push(`Dimensionamento ${ref}. Selecionado: COL ${col} / ${esp} mm.`);
    if (cD < Number(GAUGE_MM[gb])) out.erros.push(`Espessura do C do braço (${cD} mm) abaixo da tabela ${t.f}: #${gb} (${GAUGE_MM[gb]} mm).`);
    if (esp2 && esp2[P] !== undefined) {
      const s = esp2[P];
      if (s === null) out.erros.push(`${t.f}, ${kc} kg: ${P} paletes na profundidade não é permitido.`);
      else if (typeof s === 'string') out.alertas.push(`${t.f}, ${kc} kg com 2 paletes na profundidade: ${s} no fundo ("porta-paletes").`);
      else out.alertas.push(`${t.f}, ${kc} kg com ${P} paletes na profundidade: usar ${s[0]} espaços de ${s[1]} mm (em vez de 1025).`);
    }
    if (rua > 1400) out.alertas.push(`Rua de ${rua} mm maior que a premissa das tabelas (1400 mm): confirmar com a engenharia.`);
    if (alt1 > 2000) out.alertas.push(`1º braço a ${alt1} mm acima da premissa das tabelas (até 2000 mm): confirmar com a engenharia.`);
    if (balAlto > 230) out.alertas.push(`Balanço ${balAlto} mm maior que a premissa das tabelas (230 mm).`);
    return out;
  }

  function calcular(inp, cat) {
    const col = Number(inp.coluna);
    const esp = String(inp.espessura);
    const R = Number(inp.ruas), N = Number(inp.niveis);
    const n = Number(inp.espacamentos);
    const espacos = (inp.espacos && inp.espacos.length === n ? inp.espacos : Array(n).fill(inp.largura)).map(Number);
    const A = espacos[0];
    const alertas = [], erros = [], pend = [], pecas = [];
    const add = (grupo, id, desc, codigo, qtd, compr, pesoUnit, obs) =>
      pecas.push({ grupo, id, desc, codigo: codigo || '', qtd, compr: compr || null, pesoUnit: pesoUnit == null ? null : pesoUnit, pesoTotal: pesoUnit == null ? null : qtd * pesoUnit, obs: obs || '' });

    // ---- geometria
    // 1º braço: padrão = altura do palete + 100 mm (o operador pode informar outro valor)
    const alt1 = inp.alt1Nivel ? Number(inp.alt1Nivel) : Number(inp.alturaPalete) + 100;
    inp = { ...inp, alt1Nivel: alt1 };
    const Hcalc = alt1 + (N - 2) * (Number(inp.alturaPalete) + 200) + 1400;
    const H = inp.alturaManual ? r50(Number(inp.alturaManual)) : r50(Hcalc);
    if (!inp.alturaManual && H !== Hcalc) alertas.push(`Altura calculada ${Hcalc} mm arredondada para ${H} mm (múltiplo de 50).`);
    if (H > 2 * MAX_PECA) alertas.push(`Altura ${H} mm excede o máximo de ${2 * MAX_PECA} mm (uma emenda, peças de até ${MAX_PECA} mm).`);
    if (Number(inp.alt1Nivel) > 2005) alertas.push('1º nível acima de 2005 mm: a planilha antiga exigia análise de engenharia.');
    if (H > MAX_PECA) alertas.push('Altura acima de 8500 mm: a planilha antiga exigia análise de engenharia. Emenda incluída.');

    const laterais = R + 1;                 // [CONFIRMAR] laterais compartilhadas entre ruas
    const colPorLateral = n + 1;
    const colunas = laterais * colPorLateral;
    // rua = frente do palete + 100 mm de cada lado até as colunas (palete centralizado na rua)
    const FOLGA_PALETE_COLUNA = 100;
    const frentePalete = Number(inp.frentePalete) || 0;
    const larguraRua = frentePalete > 0 ? frentePalete + 2 * FOLGA_PALETE_COLUNA : Number(inp.larguraRua || LARGURA_RUA);
    const largura = R * larguraRua + laterais * col;
    const profundidade = espacos.reduce((s, v) => s + v, 0); // A1..An são medidas face a face (externas), como no DRIVE_IN.dxf: o total já inclui as colunas
    // quadros de 2 colunas nos passos 1,3,5...; passos par → coluna solteira no último passo (união, sem diagonal)
    const quadros = Math.floor((n + 1) / 2);
    const solteira = n % 2 === 0;           // coluna solteira sempre à ESQUERDA (1º passo) na vista lateral
    const passoSolteira = solteira ? espacos[0] : null;
    const passosQuadro = espacos.filter((_, i) => solteira ? i % 2 === 1 : i % 2 === 0);
    // paletes por rua: profundidade do palete + 25 mm de folga; o último palete deve terminar dentro da profundidade da estrutura
    const ocupPalete = Number(inp.profPalete || 1000) + 25;
    const Pauto = Math.floor(profundidade / ocupPalete);
    const P = inp.paletesInformados ? Number(inp.paletesInformados) : Pauto; // operador pode informar a quantidade para conferência
    const sobra = profundidade - P * ocupPalete;
    if (sobra < 0) erros.push(`Palete ultrapassa a estrutura: ${P} × ${ocupPalete} = ${P * ocupPalete} mm > profundidade ${profundidade} mm (excede ${-sobra} mm). Máximo que cabe: ${Pauto} palete(s).`);
    else if (sobra > 50) alertas.push(`Sobra de estrutura: ${sobra} mm além dos paletes (${P} × ${ocupPalete} = ${P * ocupPalete} mm de ${profundidade} mm).`);
    if (P < 1) erros.push(`A profundidade da estrutura (${profundidade} mm) não comporta nenhum palete de ${ocupPalete} mm (palete + 25).`);
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

    // ---- laterais: travessas, diagonais, tubos, parafusos (por quadro de 2 colunas)
    const ys = posicoesHorizontais(H);
    const nH = ys.length, nD = nH - 1; // diagonais em todos os vãos entre horizontais; vão de topo (última → topo) sem diagonal
    const porPasso = {};
    for (const a of passosQuadro) porPasso[a] = (porPasso[a] || 0) + 1;
    for (const [aStr, q] of Object.entries(porPasso)) {
      const a = Number(aStr), vaos = q * laterais, ccH = a - 109.1, totH = a - 78.6;
      const itH = buscaSA(cat.travessas, totH);
      add('Travessas', `TRAV-H-${a}`, `Travessa horizontal – passo ${a} mm (total ${r1(totH)} mm, c/c ${r1(ccH)} mm)`, itH ? itH.sa : SEM.SA, nH * vaos, r1(totH), KG_M_TRAVESSA * totH / 1000, itH ? itH.nome : 'sem SA no cadastro (±3 mm)');
      const diagPorV = {};
      for (let i = 0; i < nD; i++) { const V = ys[i + 1] - ys[i]; diagPorV[V] = (diagPorV[V] || 0) + 1; }
      for (const [V, qd] of Object.entries(diagPorV)) {
        const cc = Math.hypot(ccH, Number(V)), tot = cc + 30.5;
        const it = buscaSA(cat.diagonais, tot);
        add('Travessas', `TRAV-D-${a}-${V}`, `Travessa diagonal – passo ${a}, vão ${V} mm (total ${r1(tot)} mm, c/c ${r1(cc)} mm)`, it ? it.sa : SEM.SA, qd * vaos, r1(tot), KG_M_TRAVESSA * tot / 1000, it ? it.nome : 'sem SA no cadastro (±3 mm)');
      }
    }
    const vaosQuadro = passosQuadro.length * laterais;
    const tubos = (2 * nH - 2 * nD) * vaosQuadro;
    const tb = prodOf(cat, TUBO[col]);
    add('Travessas', TUBO[col], tb.desc, tb.codigo, tubos, null, tb.peso, 'nós de travessa sem diagonal (1ª e última horizontais)');
    if (solteira) {
      const a = passoSolteira, totU = r1(a - 69.8);
      const itU = (cat.uniao || []).filter((u) => u.col === col).find((u) => Math.abs(u.total - totU) <= TOL_SA);
      add('Coluna solteira', 'UNIAO', `Travessa união COL ${col} – passo ${a} mm (total ${totU} mm)`, itU ? itU.co : SEM.CO, nH * laterais, totU, itU ? itU.peso : null, itU ? itU.nome : 'sem CO cadastrado para este comprimento (±3 mm); peso não estimado');
      const q = nH * laterais;
      add('Coluna solteira', 'INT0648', prodOf(cat, 'INT0648').desc, 'INT0648', 6 * q, null, null, '6 por união (a confirmar para todas as variantes)');
      add('Coluna solteira', 'INT0650', prodOf(cat, 'INT0650').desc, 'INT0650', 6 * q, null, null, '6 por união (a confirmar)');
    }
    // elemento de topo: dois modelos, um para o passo dentro do quadro e outro para o passo entre quadros (inclui o passo da solteira [CONFIRMAR])
    const porPassoTopo = (lista, rotulo, id) => {
      const c = {}; for (const a of lista) c[a] = (c[a] || 0) + 1;
      for (const [a, q] of Object.entries(c)) add('Topo', `${id}-${a}`, `Topo (DI_TOPO) ${rotulo} – passo ${a} mm`, SEM.SA, q * laterais, Number(a), null, 'SA e peso a confirmar');
    };
    porPassoTopo(passosQuadro, 'da montante (dentro do quadro)', 'TOPO-Q');
    porPassoTopo(espacos.filter((_, i) => solteira ? i % 2 === 0 : i % 2 === 1), 'entre montantes', 'TOPO-E');
    const nPar = 2 * nH * vaosQuadro;
    const par = prodOf(cat, PARAFUSO_TRAV[col]), porca = prodOf(cat, 'INT0650');
    add('Fixadores das travessas', par.id, par.desc, par.codigo, nPar, null, null);
    add('Fixadores das travessas', 'INT0650', porca.desc, porca.codigo, nPar, null, null, 'diagonais usam o mesmo parafuso da horizontal');

    // ---- braços (paletes padronizados)
    // simples nas laterais das pontas (1ª e última), duplo nas laterais internas (entre duas ruas) [CONFIRMAR leitura de "montantes das pontas"]
    // 1 braço por coluna por nível de armazenagem (níveis acima do chão); nível ≤ 2500 mm → 180; acima → escolha do operador (180 ou 230)
    const passoNivel = Number(inp.alturaPalete) + 200;
    const niveisArm = []; for (let k = 0; k < N - 1; k++) niveisArm.push(Number(inp.alt1Nivel) + k * passoNivel);
    // braço paramétrico (modelo 0004.0003.01.008): suporte em U (chapa 2,65, altura 180) abraçando a coluna + perfil C informado pelo operador
    // balanço medido da face externa do U até a ponta do C; 1º nível usa o balanço "baixo" (180), 2º em diante o "alto" (230) — treinamento slide 17
    const balBaixo = Number(inp.balancoBaixo) || 180, balAlto = Number(inp.balancoAlto || inp.bracoAcima) || 230;
    const modeloAlto = String(balAlto);
    const perfilC = { A: Number(inp.cA) || 94, B: Number(inp.cB) || 15, C: Number(inp.cC) || 40, D: Number(inp.cD) || 2 };
    const ESP_U = 2.65, ALT_BRACO = 180, ABA_U = 42.65;
    const uExt = col + 2 * ESP_U;
    const pesoU = (col + 2 * ABA_U) * ALT_BRACO * ESP_U * DENS;                       // chapa desenvolvida, sem descontar furos
    const desenvC = perfilC.A + 2 * perfilC.C + 2 * perfilC.B - 4 * perfilC.D;          // desenvolvimento aproximado do C (linha média)
    const compC = (tipo, bal) => uExt + (tipo === 'D' ? 2 : 1) * bal;
    const pesoBracoCalc = (tipo, bal) => pesoU + desenvC * perfilC.D * compC(tipo, bal) * DENS;
    const lateraisPonta = Math.min(laterais, 2), lateraisInternas = Math.max(laterais - 2, 0);
    const contBraco = {};
    for (const [k, y] of niveisArm.entries()) {
      const bal = k === 0 ? balBaixo : balAlto;
      if (lateraisPonta) contBraco['S|' + bal] = (contBraco['S|' + bal] || 0) + lateraisPonta * colPorLateral;
      if (lateraisInternas) contBraco['D|' + bal] = (contBraco['D|' + bal] || 0) + lateraisInternas * colPorLateral;
    }
    let totBracos = 0;
    const cTxt = `C ${perfilC.A}x${perfilC.C}x${perfilC.B}x${perfilC.D}`;
    for (const [m, q] of Object.entries(contBraco)) {
      totBracos += q;
      const [tipo, bal] = m.split('|'), b = Number(bal);
      add('Braços', `BRACO-${tipo}${bal}-${col}`, `Braço ${tipo === 'S' ? 'simples' : 'duplo'} balanço ${bal} – COL ${col} – ${cTxt} (comp. C ${compC(tipo, b).toFixed(1)})`, SEM.SA, q, compC(tipo, b), +pesoBracoCalc(tipo, b).toFixed(3), 'peso calculado pela geometria (U 2,65 + perfil C), sem descontar furos; SA a definir');
    }
    // apoio do palete sobre o braço: o palete fica a 100 mm da face da coluna; o braço avança 2,65 (U) + balanço
    const apoioBaixo = ESP_U + balBaixo - FOLGA_PALETE_COLUNA, apoioAlto = ESP_U + balAlto - FOLGA_PALETE_COLUNA;
    for (const [nome, ap, usa] of [['1º nível', apoioBaixo, niveisArm.length > 0], ['2º nível em diante', apoioAlto, niveisArm.length > 1]]) {
      if (!usa) continue;
      if (ap <= 0) erros.push(`Braço ${nome}: balanço não alcança o palete (apoio ${ap.toFixed(1)} mm). O palete fica a ${FOLGA_PALETE_COLUNA} mm da coluna.`);
      else alertas.push(`Apoio do palete sobre o braço (${nome}): ${ap.toFixed(1)} mm por lado. Apoio mínimo ainda não definido pela engenharia.`);
    }
    if (totBracos) {
      add('Fixadores dos braços', 'INT0648', prodOf(cat, 'INT0648').desc, 'INT0648', 8 * totBracos, null, null, '8 por braço');
      add('Fixadores dos braços', 'INT0650', prodOf(cat, 'INT0650').desc, 'INT0650', 8 * totBracos, null, null, '8 por braço');
      add('Fixadores dos braços', 'INT0812', prodOf(cat, 'INT0812').desc, 'INT0812', 16 * totBracos, null, null, '16 por braço');
    }
    // caneleira (protetor 700 mm) na coluna de frente de cada lateral; longarina superior (DI_LGTOPO) no topo de cada rua
    add('Protetores', 'CANELEIRA', 'Caneleira (protetor de coluna) 700 mm', SEM.SA, laterais, 700, 2.5, 'peso da planilha antiga (a confirmar); 1 por lateral, na frente [CONFIRMAR]');
    add('Longarinas', 'LGTOPO', `Longarina superior (frontal) – rua ${larguraRua} mm`, SEM.SA, R, larguraRua, null, '1 por rua, no topo; peso e SA a confirmar');
    const dim = dimensionar({ H, cortes: N - 1, carga: Number(inp.cargaPalete) || 0, col, esp, P, rua: larguraRua, alt1, balAlto, cD: perfilC.D });
    alertas.push(...dim.alertas); erros.push(...dim.erros);

    // ---- ainda não levantado
    pend.push('Contraventamentos LG-UE superior e de fundo, viga túnel e complemento, diagonais superiores e de amarração de fundo, protetores de coluna e caneleira, stop de palete: ainda não levantados. Não entram no peso.');
    if (col === 80) pend.push('COL 80: sapata (CO) e perfil U (SA) sem código cadastrado.');

    const pesoTotal = pecas.reduce((s, p) => s + (p.pesoTotal || 0), 0);
    return {
      entradas: { ...inp, coluna: col, espessura: esp },
      dimensoes: { altura: H, alturaCalculada: Hcalc, largura, profundidade, laterais, colPorLateral, colunas, emendas },
      dimensionamento: dim.sugestao, posicoes, paletesPorRua: P, ocupPalete, sobraProfundidade: sobra, pesoTotal, kgPorPosicao: posicoes ? pesoTotal / posicoes : null,
      lateral: { ys, nH, nD, tubosPorVao: 2 * nH - 2 * nD, espacos, quadros, solteira },
      frontal: { niveis: niveisArm, modeloAlto, balBaixo, balAlto, perfilC, espU: ESP_U, alturaPalete: Number(inp.alturaPalete), larguraRua, frentePalete, folgaPalete: FOLGA_PALETE_COLUNA, laterais },
      pecas, alertas, erros, pendencias: pend,
    };
  }

  const Engine = { calcular, posicoesHorizontais, buscaSA, KG_M_TRAVESSA, SEM };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine; else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
