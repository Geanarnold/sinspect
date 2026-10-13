// Motor de cálculo do configurador Drive-In.
// Regras: ver ../REGRAS_RASCUNHO.md. Dados: catalogo.json (gerado de CATALOGO.xlsx).
// Funciona no navegador (window.Engine) e no Node (module.exports).
(function (root) {
  'use strict';

  const KG_M_TRAVESSA = 80 * 1.4 * 7.85e-6 * 1000; // sliter 80 x 1,40 (ACO0602), sliter fechado
  const AVISO_ESTRUTURAL = 'COLUNA SEM VALIDAÇÃO ESTRUTURAL — conferir com a engenharia antes de enviar ao cliente.';
  // nota fixa (Gean): o app é ferramenta de orçamento/desenho; verificações operacionais e estruturais ficam com os responsáveis
  const NOTA_RESPONSABILIDADE = 'As verificações operacionais (empilhadeira, folgas, cargas por posição, pé-direito e interferências do galpão) são de responsabilidade do operador do software, do cliente e do representante. O dimensionamento estrutural é de responsabilidade do engenheiro responsável.';
  const DENS = 7.85e-6;       // kg/mm³ (aço)
  const MAX_PECA = 8500;      // limite da cabine de pintura (mm)
  const PASSO_COLUNA = 50;
  const BASE_BARRA = 4.75, FURO_BASE = BASE_BARRA + 25; // barra da coluna sobre a chapa da sapata; 1º oblongo 25 mm acima da base da barra    // altura da coluna em múltiplos de 50 mm
  const TOL_SA = 3;           // ±3 mm para aceitar um SA de travessa/diagonal
  const LARGURA_RUA = 1400;   // padrão quando o operador não informa (vão livre entre colunas)

  const SEM = { SA: 'SA04XXXX', CO: 'COXXXXXX', PA: 'PAXXXXXX', PK: 'PKXXXXXX' };

  const PARAFUSO_UNIAO = { 80: 'INT0993', 101: 'INT0958', 122: 'INT0994' }; // parafuso longo da travessa união (desenho 0004.0003.01.012 REV.04)
  // reta do peso do kit da união [kg, kg/m]: COL 80 e 122 pelos 2 modelos do desenho; COL 101 com 1 modelo e inclinação interpolada (estimada)
  const RETA_UNIAO = { 80: [0.238, 1.247], 101: [0.264, 1.614, 'COL 101: inclinação interpolada, reta fraca'], 122: [0.281, 1.829] };
  const PARAFUSO_TRAV = { 80: 'INT0993', 101: 'INT0958', 122: 'INT0973' };
  const TUBO = { 80: 'TUBO-80', 101: 'TUBO-101', 122: 'TUBO-122' };
  const PLACA = { 80: 'PLN-80-101', 101: 'PLN-80-101', 122: 'PLN-122' };
  const SAPATA = { 80: 'SAP-80', 101: 'SAP-101', 122: 'SAP-122' };

  const r50 = (v) => Math.ceil(v / PASSO_COLUNA) * PASSO_COLUNA;
  const r1 = (v) => Math.round(v * 10) / 10;
  const r3 = (v) => Math.round(v * 1000) / 1000;

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

  function calcular(inp, cat) {
    // coluna duplada ("80D"): duas montantes do mesmo perfil grudadas lado a lado (COLUNAS.dxf / 80_DUP.dxf: COL_80_DUP = 2 × COL_80, 160 mm),
    // cada montante com o próprio contraventamento lateral; na largura da estrutura ocupa 2 × perfil
    const dup = /D$/i.test(String(inp.coluna).trim());
    const col = parseInt(inp.coluna, 10), nM = dup ? 2 : 1, colW = col * nM, nomeCol = `COL ${col}${dup ? ' DUPLADA' : ''}`;
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
    // níveis = altura do apoio do palete (topo do perfil C do braço), medida da base da sapata
    // passo = palete + 100 (folga mínima) + altura do braço (cota A do C), arredondado PARA CIMA em múltiplo de 50
    // 1º nível: idem; com palete escravo no chão (2 paletes empilhados) = 2 × palete + 100 + A
    // topo: último nível + palete + 100 + longarina de topo (150 + 4,65 abaixo do topo da coluna) → arredondado para cima em 50
    const hp = Number(inp.alturaPalete), alturaBracoC = Number(inp.cA) || 94;
    const escravo = !!inp.escravo, ceil50 = (v) => Math.ceil(v / 50) * 50;
    const passoNivel = ceil50(hp + 100 + alturaBracoC);
    // o apoio real depende da furação da coluna (COL 80.DXF, Gean, padrão de todas as colunas): barra apoiada na chapa de 4,75 da sapata,
    // 1º oblongo a 25 mm da base da barra, passo 50 → furos a 29,75 + 50k do piso. Os oblongos do suporte ficam a ±75 do centro do U
    // (15 mm das bordas no U de 180, 25 mm no de 200) e o C é centrado no U → topo do C = furo inferior + 75 + A/2, qualquer que seja a altura do U
    const resto = ((FURO_BASE + 75 + alturaBracoC / 2) % 50 + 50) % 50;
    // suporte em U (Gean): altura = A do C + 110 (55 acima e 55 abaixo, C centralizado); chapa padrão 2,65 (o operador pode mudar)
    const altU = alturaBracoC + 110, espU = Number(inp.espU) || 2.65;
    const snapFuro = (y) => { const k = Math.ceil((y - resto - 1e-6) / 50); return +(k * 50 + resto).toFixed(2); };
    const alt1Req = inp.alt1Nivel ? Number(inp.alt1Nivel) : ceil50((escravo ? 2 : 1) * hp + 100 + alturaBracoC);
    const alt1 = snapFuro(alt1Req);
    if (alt1 !== alt1Req) alertas.push(`1º nível ${alt1Req} mm ajustado para ${alt1} mm (furação de 50 mm da coluna).`);
    inp = { ...inp, alt1Nivel: alt1 };
    const LGTOPO_ALT = 154.65; // topo da coluna = H + 4,75 (barra de H mm sobre a chapa da sapata); mantido o cálculo por H (a favor da folga)
    const Hcalc = ceil50(alt1 + (N - 2) * passoNivel + hp + 100 + LGTOPO_ALT);
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
    const largura = R * larguraRua + laterais * colW;
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
    const posicoes = R * P * (N + (escravo ? 1 : 0)); // palete escravo: 2 paletes no chão

    // ---- colunas (+ emenda)
    const kgm = (cat.colunas[String(col)] || {})[esp];
    if (kgm == null) alertas.push(`Perfil COL ${col} #${esp} mm não encontrado no catálogo.`);
    const saCol = (h) => (cat.colunas_sa[String(col)] || {})[String(h)] || SEM.SA;
    const trechos = H > MAX_PECA ? [MAX_PECA, H - MAX_PECA] : [H];
    trechos.forEach((L, i) => {
      const sa = saCol(L);
      add('Colunas', `COL-${col}-${L}`, `AMPP COL ${col} C/ABA #${esp} mm – ${L} mm${trechos.length > 1 ? (i ? ' (superior)' : ' (inferior)') : ''}`, sa, colunas * nM, L, kgm != null ? kgm * L / 1000 : null,
        [sa === SEM.SA ? 'altura sem SA cadastrado' : '', dup ? `duplada: 2 montantes por posição (${colunas} posições)` : ''].filter(Boolean).join('; '));
    });
    const emendas = H > MAX_PECA ? colunas * nM : 0;
    if (emendas) {
      pend.push('Posição da emenda: regra "o mais alta possível, desviando de braços e longarinas" ainda não aplicada (usa 8500 + restante).');
      for (const c of cat.composicao.filter((x) => x.pai === 'EMENDA')) {
        const p = prodOf(cat, c.item);
        add('Emenda de coluna', c.item, p.desc, p.codigo, c.qtd * emendas, null, p.peso);
      }
    }

    // ---- sapatas (duplada: uma sapata SAP-80DUP por posição, abraçando as 2 montantes)
    const idSap = dup ? `SAP-${col}DUP` : SAPATA[col];
    const compSap = cat.composicao.filter((x) => x.pai === idSap);
    for (const c of compSap) {
      const p = prodOf(cat, c.item);
      add('Sapatas', c.item, p.desc, p.codigo || (c.item.startsWith('SAP-U') ? SEM.SA : ''), c.qtd * colunas, null, c.item.startsWith('SAP-') && c.item !== idSap ? null : p.peso);
    }
    const sap = prodOf(cat, idSap);
    add('Sapatas', idSap, sap.desc + ' (conjunto)', sap.codigo || SEM.CO, colunas, null, sap.peso, compSap.length ? 'peso do conjunto (componentes acima sem peso próprio)' : 'peso do conjunto; composição (base, U, placas, chumbadores) não cadastrada');
    if (dup && !compSap.length) pend.push(`Sapata ${idSap}: composição e código CO não cadastrados no CATALOGO.xlsx (só o peso do conjunto, ${sap.peso} kg).`);

    // ---- laterais: travessas, diagonais, tubos, parafusos (por quadro de 2 colunas)
    const ys = posicoesHorizontais(H);
    const nH = ys.length, nD = nH - 1; // diagonais em todos os vãos entre horizontais; vão de topo (última → topo) sem diagonal
    const porPasso = {};
    for (const a of passosQuadro) porPasso[a] = (porPasso[a] || 0) + 1;
    for (const [aStr, q] of Object.entries(porPasso)) {
      const a = Number(aStr), vaos = q * laterais * nM, ccH = a - 109.1, totH = a - 78.6;
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
    const vaosQuadro = passosQuadro.length * laterais * nM;
    const tubos = (2 * nH - 2 * nD) * vaosQuadro;
    const tb = prodOf(cat, TUBO[col]);
    add('Travessas', TUBO[col], tb.desc, tb.codigo, tubos, null, tb.peso, 'nós de travessa sem diagonal (1ª e última horizontais)');
    if (solteira) {
      // travessa união = kit PK (desenho 0004.0003.01.012 REV.04); comprimento total = A1 − 7,2 mm (A1 da face externa da coluna solteira
      // à face da coluna do quadro; modelo "1,025" = A1 1025 → total 1017,8). Fora dos modelos (±3 mm): PK04XXXX, peso pela reta da coluna
      const a = passoSolteira, totU = r1(a - 7.2), q = nH * laterais * nM;
      const itU = (cat.uniao || []).filter((u) => u.col === col).find((u) => Math.abs(u.total - totU) <= TOL_SA);
      const reta = RETA_UNIAO[col];
      if (itU) add('Coluna solteira', 'UNIAO', `Travessa união COL ${col} – A1 ${a} mm (total ${totU} mm) – ${itU.co}`, itU.pk || SEM.PK, q, totU, itU.peso, itU.nome);
      else {
        const faixa = (cat.uniao || []).filter((u) => u.col === col).map((u) => u.total), fora = faixa.length && (totU < Math.min(...faixa) - 300 || totU > Math.max(...faixa) + 300);
        add('Coluna solteira', 'UNIAO', `Travessa união COL ${col} – A1 ${a} mm (total ${totU} mm) – especial, ${SEM.SA}`, SEM.PK, q, totU, reta ? r3(reta[0] + reta[1] * totU / 1000) : null,
          reta ? `fora dos modelos cadastrados: peso ESTIMADO pela reta ${reta[0]} + ${reta[1]} kg/m × total${reta[2] ? ' (' + reta[2] + ')' : ''}${fora ? '; fora da faixa dos modelos: conferir peso' : ''}` : 'sem modelo nem reta para esta coluna; peso não estimado');
        pend.push(`Travessa união COL ${col} com A1 ${a} mm (total ${totU} mm) fora dos modelos: criar cadastro PK/SA; peso estimado.`);
      }
      const longo = PARAFUSO_UNIAO[col];
      add('Coluna solteira', 'INT0648', prodOf(cat, 'INT0648').desc, 'INT0648', 4 * q, null, null, '4 por união (desenho 0004.0003.01.012)');
      add('Coluna solteira', 'INT0650', prodOf(cat, 'INT0650').desc, 'INT0650', 5 * q, null, null, '5 por união');
      if (longo) add('Coluna solteira', longo, prodOf(cat, longo).desc, longo, q, null, null, '1 por união (parafuso longo da coluna)');
      else add('Coluna solteira', 'INTXXXX', `Parafuso longo da união COL ${col}`, 'INTXXXX', q, null, null, 'parafuso longo não definido para esta coluna');
    }
    // DI_TOPO (vista lateral) é só a representação do zig-zag de topo (travessas diagonais da vista superior, contadas no grupo do zig-zag): não entra na lista (Gean)
    const nPar = 2 * nH * vaosQuadro;
    const par = prodOf(cat, PARAFUSO_TRAV[col]), porca = prodOf(cat, 'INT0650');
    add('Fixadores das travessas', par.id, par.desc, par.codigo, nPar, null, null);
    add('Fixadores das travessas', 'INT0650', porca.desc, porca.codigo, nPar, null, null, 'diagonais usam o mesmo parafuso da horizontal');

    // ---- braços (paletes padronizados)
    // simples nas laterais das pontas (1ª e última), duplo nas laterais internas (entre duas ruas) [CONFIRMAR leitura de "montantes das pontas"]
    // 1 braço por coluna por nível de armazenagem (níveis acima do chão); nível ≤ 2500 mm → 180; acima → escolha do operador (180 ou 230)
    const niveisArm = []; for (let k = 0; k < N - 1; k++) niveisArm.push(Number(inp.alt1Nivel) + k * passoNivel);
    // braço paramétrico (modelo 0004.0003.01.008): suporte em U (chapa padrão 2,65, altura = A + 110) abraçando a coluna + perfil C informado pelo operador
    // balanço medido da face externa do U até a ponta do C; 1º nível usa o balanço "baixo" (180), 2º em diante o "alto" (230) — treinamento slide 17
    const balBaixo = Number(inp.balancoBaixo) || 180, balAlto = Number(inp.balancoAlto || inp.bracoAcima) || 230;
    const modeloAlto = String(balAlto);
    const perfilC = { A: alturaBracoC, B: Number(inp.cB) || 15, C: Number(inp.cC) || 40, D: Number(inp.cD) || 1.8 };
    const ESP_U = espU, ALT_BRACO = altU, ABA_U = 42.65;
    const uExt = colW + 2 * ESP_U; // duplada: braço específico (Gean); sem desenho ainda → peso estimado com U abraçando as 2 montantes (160)
    const pesoU = (colW + 2 * ABA_U) * ALT_BRACO * ESP_U * DENS;                       // chapa desenvolvida, sem descontar furos
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
    // braço padrão (des. 0004.0003.03.004 REV.05, perfil U engate braço): C 94 x 40 x 15, chapa #1,8 nas COL 80/122 e #2,0 na COL 101; U #2,65
    const ESP_C_PADRAO = { 80: 1.8, 101: 2.0, 122: 1.8 };
    const bracoPadrao = perfilC.A === 94 && perfilC.C === 40 && perfilC.B === 15 && perfilC.D === ESP_C_PADRAO[col] && ESP_U === 2.65;
    let totBracos = 0;
    const cTxt = `C ${perfilC.A}x${perfilC.C}x${perfilC.B}x${perfilC.D}`;
    for (const [m, q] of Object.entries(contBraco)) {
      totBracos += q;
      const [tipo, bal] = m.split('|'), b = Number(bal);
      // braço padrão cadastrado (des. 0004.0003.02.002 REV.03): COL 80/101/122, simples/duplo, balanço 180/230, com perfil C e chapa do U padrão
      const cadB = !dup && bracoPadrao && cat.produtos[`BRACO-${tipo}${bal}-${col}`];
      if (cadB) { add('Braços', `BRACO-${tipo}${bal}-${col}`, cadB.desc, cadB.codigo, q, compC(tipo, b), cadB.peso, 'braço padrão cadastrado'); continue; }
      add('Braços', `BRACO-${tipo}${bal}-${col}${dup ? 'D' : ''}`, `Braço ${dup ? 'específico ' : ''}${tipo === 'S' ? 'simples' : 'duplo'} balanço ${bal} – ${nomeCol} – ${cTxt} (comp. C ${compC(tipo, b).toFixed(1)})`, SEM.SA, q, compC(tipo, b), +pesoBracoCalc(tipo, b).toFixed(3),
        dup ? 'braço específico da coluna duplada (sem desenho/SA): peso ESTIMADO com U de 160 abraçando as 2 montantes + perfil C' : 'peso calculado pela geometria (U 2,65 + perfil C), sem descontar furos; SA a definir');
    }
    // apoio do palete sobre o braço: o palete fica a 100 mm da face da coluna; o braço avança 2,65 (U) + balanço
    const APOIO_MIN = 80;     // apoio mínimo do palete sobre o braço, por lado (definido pelo Gean) → erro
    const APOIO_AVISO = 100;  // abaixo disto (por lado) → aviso ao operador (Gean, 10/10/2026)
    const apoioBaixo = ESP_U + balBaixo - FOLGA_PALETE_COLUNA, apoioAlto = ESP_U + balAlto - FOLGA_PALETE_COLUNA;
    for (const [nome, ap, usa] of [['1º nível', apoioBaixo, niveisArm.length > 0], ['2º nível em diante', apoioAlto, niveisArm.length > 1]]) {
      if (!usa) continue;
      if (ap < APOIO_MIN) erros.push(`Braço ${nome}: apoio do palete ${ap.toFixed(1)} mm por lado, abaixo do mínimo de ${APOIO_MIN} mm. Aumente o balanço (mínimo ${Math.ceil(APOIO_MIN + FOLGA_PALETE_COLUNA - ESP_U)} mm).`);
      else if (ap < APOIO_AVISO) alertas.push(`ATENÇÃO – braço ${nome}: apoio do palete de ${ap.toFixed(1)} mm por lado, menor que ${APOIO_AVISO} mm. Conferir; para ${APOIO_AVISO} mm o balanço deve ser de pelo menos ${Math.ceil(APOIO_AVISO + FOLGA_PALETE_COLUNA - ESP_U)} mm.`);
    }
    if (totBracos) {
      add('Fixadores dos braços', 'INT0648', prodOf(cat, 'INT0648').desc, 'INT0648', 8 * totBracos, null, null, '8 por braço');
      add('Fixadores dos braços', 'INT0650', prodOf(cat, 'INT0650').desc, 'INT0650', 8 * totBracos, null, null, '8 por braço');
      add('Fixadores dos braços', 'INT0812', prodOf(cat, 'INT0812').desc, 'INT0812', 16 * totBracos, null, null, '16 por braço');
    }
    // caneleira (protetor 700 mm) na coluna de frente de cada lateral; longarina superior (DI_LGTOPO) no topo de cada rua
    // desenho 0004.0003.01.017 REV.02: um kit por modelo de coluna (80, 101, 122, 80 duplada), cada um com 4 INT0648 + 4 INT0650
    { const idC = dup ? 'CAN-80D' : `CAN-${col}`, cn = prodOf(cat, idC);
      add('Protetores', idC, cn.desc, cn.codigo, laterais, 700, cn.peso, '1 na primeira coluna (frente) de cada lateral: ruas + 1');
      for (const id of ['INT0648', 'INT0650']) add('Protetores', id, prodOf(cat, id).desc, id, 4 * laterais, null, null, `4 por caneleira (já incluídos no ${cn.codigo})`); }
    // protetor frontal da guia (Gean 13/10/2026): fixo por coluna, 1 por lateral (ruas + 1) na coluna da frente, junto com a caneleira; 3 INT0654 cada
    { const idP = dup ? 'PROT-FRONT-80D' : `PROT-FRONT-${col}`, pf = prodOf(cat, idP);
      add('Protetores', idP, pf.desc, pf.codigo, laterais, null, pf.peso, '1 por lateral (ruas + 1), na coluna da frente, além da caneleira');
      add('Protetores', 'INT0654', prodOf(cat, 'INT0654').desc, 'INT0654', 3 * laterais, null, null, '3 chumbadores por protetor frontal'); }
    // trilho guia (Drawing1.dxf, vistas laterais A–D): perfil de 75 mm no piso, passa 50 mm à frente da estrutura; comprimento definido após as faces das colunas
    const TRILHO_ALT = 75, TRILHO_FRENTE = 50;
    // longarina de túnel (Drawing1.dxf): perfil U na mesma faixa do C do braço (topo = apoio do palete), contínua em toda a profundidade,
    // uma em cada linha de braço → 2 por rua por nível de braço
    const lgU = { A: Number(inp.uA) || 100, B: Number(inp.uB) || 38, e: Number(inp.uE) || 1.8 };
    const kgmLgU = (lgU.A + 2 * lgU.B - 2 * lgU.e) * lgU.e * DENS * 1000;
    // barras de no máximo 3000 mm; a emenda cai sempre sobre um suporte de braço (eixo de coluna na vista lateral), cada barra a maior possível
    const LG_TUNEL_MAX = 3000, CW_LAT = 69.8;
    const faces = [0]; espacos.forEach((a, i) => { const quadroI = solteira ? i % 2 === 1 : i % 2 === 0; faces.push(faces[i] + (solteira && i === 0 ? a : quadroI ? a - CW_LAT : a + CW_LAT)); });
    const eixosLat = faces.map((v) => v + CW_LAT / 2);
    // trilho/guia (Gean 13/10/2026): da frente (50 mm à frente da estrutura) até passar da penúltima coluna, contando da frente (face de trás dela)
    const compTrilho = profundidade - faces[n >= 2 ? 1 : 0] + TRILHO_FRENTE;
    const barrasTunel = []; let ini = 0;
    while (profundidade - ini > LG_TUNEL_MAX + 1e-6) {
      const cand = eixosLat.filter((x) => x > ini + 1e-6 && x - ini <= LG_TUNEL_MAX + 1e-6);
      if (!cand.length) { erros.push(`Longarina de túnel: vão sem suporte de braço maior que ${LG_TUNEL_MAX} mm a partir de ${Math.round(ini)} mm.`); break; }
      const fim = Math.max(...cand); barrasTunel.push(+(fim - ini).toFixed(1)); ini = fim;
    }
    barrasTunel.push(+(profundidade - ini).toFixed(1));
    const juntasTunel = barrasTunel.slice(0, -1).reduce((acc, b) => acc.concat((acc.length ? acc[acc.length - 1] : 0) + b), []);
    if (niveisArm.length) {
      const porComp = {}; for (const b of barrasTunel) porComp[b] = (porComp[b] || 0) + 1;
      for (const [b, q] of Object.entries(porComp)) add('Longarinas', 'LG-TUNEL', `Longarina de túnel U ${lgU.A}x${lgU.B}x${lgU.e} – ${b} mm`, SEM.SA, q * 2 * R * niveisArm.length, Number(b), +(kgmLgU * Number(b) / 1000).toFixed(3), `${q} por linha (barras ≤ ${LG_TUNEL_MAX}, emenda sobre o braço) × 2 por rua × ${niveisArm.length} nível(is); ${kgmLgU.toFixed(3)} kg/m`);
    }
    // emenda da longarina de túnel (2025.0066.01.003 REV.01): kit PK041366 = tala SA042691 C 300 × 94 × 30 × 15 + 14 INT0648 + 14 INT0650 + 14 INT0812, 1,340 kg
    // a tala entra por dentro do U; se o perfil da longarina mudar, a tala acompanha (altura = interno do U − 2,4; aba = aba do U − 8) e os 14 parafusos se mantêm
    const nJuntas = (barrasTunel.length - 1) * 2 * R * niveisArm.length;
    if (nJuntas > 0) {
      const padrao = lgU.A === 100 && lgU.B === 38 && lgU.e === 1.8;
      const tA = +(lgU.A - 2 * lgU.e - 2.4).toFixed(1), tC = +(lgU.B - 8).toFixed(1);
      const pesoKit = padrao ? 1.34 : +(1.34 * (tA + 2 * tC + 30) / (94 + 60 + 30)).toFixed(3);
      add('Emendas da longarina de túnel', padrao ? 'PK041366' : 'PK-TALA', `Tala de junção ${300} x ${tA} x ${tC} x 15 (kit com fixadores)`, padrao ? 'PK041366' : SEM.PK, nJuntas, 300, pesoKit,
        `${barrasTunel.length - 1} emenda(s) por linha × 2 por rua × ${niveisArm.length} nível(is); tala ${padrao ? 'SA042691' : SEM.SA}${padrao ? '' : '; perfil fora do padrão: tala e peso estimados, sem código'}`);
      for (const id of ['INT0648', 'INT0650', 'INT0812']) add('Emendas da longarina de túnel', id, prodOf(cat, id).desc, id, 14 * nJuntas, null, null, `14 por tala (já incluídos no ${padrao ? 'PK041366' : 'kit'})`);
    }
    // longarina TB 80 (topo e fundo, mesmo perfil — desenho 0004.0003.01.011 REV.05): comprimento = largura nominal da rua
    // modelo cadastrado (±5 mm) → PK e peso do desenho; senão PKXXXXXX e peso pela reta dos modelos: kg = 0,527 + 0,001918 × L (bate os 4 modelos de rua)
    const lgTB80 = Object.entries(cat.produtos).filter(([id, p]) => id.startsWith('LGTB80-') && p.dim != null).map(([id, p]) => ({ id, ...p }));
    const lgTB = lgTB80.find((p) => Math.abs(p.dim - larguraRua) <= 5); // ±5: a de rua 1000 (palete 800) mede 996,3
    let nLgTB80 = 0;
    const addLgTB80 = (idItem, nome, qtd, obs) => {
      nLgTB80 += qtd;
      if (lgTB) add('Longarinas', idItem, `${nome} – ${lgTB.desc}`, lgTB.codigo, qtd, lgTB.dim, lgTB.peso, obs);
      else {
        // rua sem modelo cadastrado (Gean): a longarina sai pelos componentes — 2 garras (esq./dir.), 2 fixações trav. superior e o perfil cortado
        // perfil com o comprimento da rua (Gean). Atenção: com 1,92 kg/m isso dá ~12% acima do peso dos desenhos 1350/1400/1480/1570 [CONFIRMAR kg/m]
        const gE = prodOf(cat, 'SA040009'), gD = prodOf(cat, 'SA040008'), fx = prodOf(cat, 'SA041460'), pf = prodOf(cat, 'LGTB80-PERFIL');
        const cP = larguraRua, rot = `${nome} TB 80 – rua ${larguraRua} mm (montada por componentes)`;
        add('Longarinas', `${idItem}-GE`, `${rot}: ${gE.desc}`, gE.codigo, qtd, null, gE.peso, obs);
        add('Longarinas', `${idItem}-GD`, `${rot}: ${gD.desc}`, gD.codigo, qtd, null, gD.peso, obs);
        add('Longarinas', `${idItem}-FX`, `${rot}: ${fx.desc}`, fx.codigo, 2 * qtd, null, fx.peso, `2 por longarina; ${obs}`);
        add('Longarinas', `${idItem}-PF`, `${rot}: PP PERFIL LONGARINA ${(larguraRua / 1000).toFixed(2).replace('.', ',')} - ESP MT (corte ${cP} mm)`, pf.codigo, qtd, cP, +(pf.peso * cP / 1000).toFixed(3), `${pf.peso} kg/m [CONFIRMAR]; perfil no comprimento da rua; sem SA cadastrado para este comprimento`);
      }
    };
    // ---- travamento em zig-zag (treinamento slides 9 e 11): mesmo perfil das travessas da lateral (sliter 80 × 1,40), em todas as ruas
    // fixação na furação frontal da coluna (oblongos a ±hx do eixo): c/c horizontal = rua + coluna − 2·hx; total = c/c + 30,5 (regra das travessas)
    const hx1 = { 80: 21.9, 101: 32.4, 122: 43.05 }[col] || col / 2 - 18;
    const HX = dup ? col / 2 + hx1 : hx1; // duplada: oblongo externo da montante voltada para a rua (eixo da montante a ±col/2 do centro) [CONFIRMAR]
    const ccZ = larguraRua + colW - 2 * HX;
    // FUNDO (plano do fundo, vista frontal): SEM horizontais (no lugar delas entra a longarina de fundo); uma diagonal por painel, alternada,
    // do ponto 50 mm acima da sapata / do suporte do braço até 50 mm abaixo do próximo suporte do braço / da longarina de topo (Gean)
    const offApoioZ = (altU - perfilC.A) / 2 + perfilC.A, SAPATA_TOPO = 104.76, LGTOPO_BASE = H + BASE_BARRA - 154.65;
    const basesU = niveisArm.map((y) => y - offApoioZ);
    const panZ = []; let ySup = SAPATA_TOPO + 50;
    for (const yb of basesU) { panZ.push([ySup, yb - 50]); ySup = yb + altU + 50; }
    panZ.push([ySup, LGTOPO_BASE - 50]);
    const diagZ = panZ.filter(([a1, b1]) => b1 > a1).map(([a1, b1]) => +(Math.hypot(ccZ, b1 - a1) + 30.5).toFixed(1));
    const addZ = (grupo, tipo, tot, qtd, obs) => {
      const it = buscaSA(tipo === 'H' ? cat.travessas : cat.diagonais, tot);
      add(grupo, `ZZ-${tipo}-${r1(tot)}`, `${tipo === 'H' ? 'Travessa horizontal' : 'Travessa diagonal'} zig-zag – total ${r1(tot)} mm`, it ? it.sa : SEM.SA, qtd, r1(tot), KG_M_TRAVESSA * tot / 1000, (it ? it.nome + '; ' : 'sem SA no cadastro (±3 mm); ') + obs);
    };
    const porDZ = {}; for (const t of diagZ) porDZ[t] = (porDZ[t] || 0) + 1;
    for (const [t, q] of Object.entries(porDZ)) addZ('Travamento de fundo (zig-zag)', 'D', Number(t), q * R, `${q} por rua; 50 mm acima da sapata/suporte até 50 mm abaixo do suporte seguinte`);
    // longarina de fundo: mesmo perfil da longarina de topo (DI_LGTOPO, acompanha a largura da rua), 1 por rua em cada nível de braço, cor laranja no desenho
    const compLgFundo = larguraRua;
    // longarina de fundo = LONGARINA TRAVAMENTO FUNDO (des. 0004.0003.01.015 REV.04), produto próprio (não é a TB 80 de topo): kit por largura de rua
    // com 4 INT0812 + 4 INT0648 + 4 INT0650; rua sem modelo: peso pela reta dos 4 modelos (0,481 + 2,627 kg/m × rua), marcado como estimado
    if (niveisArm.length) {
      // + 1 por rua no nível do chão, a 300 mm do piso (Gean) — só na lista; o desenho não muda
      const nF = R * (niveisArm.length + 1), obsF = `1 por rua × (${niveisArm.length} nível(is) de braço + 1 no chão, a 300 mm do piso)`;
      const lf = Object.entries(cat.produtos).filter(([id, p]) => id.startsWith('LGFUNDO-') && p.dim != null).map(([id, p]) => ({ id, ...p })).find((p) => Math.abs(p.dim - larguraRua) <= 5);
      if (lf) add('Longarinas', 'LG-FUNDO', `Longarina de fundo – ${lf.desc}`, lf.codigo, nF, lf.dim, lf.peso, obsF);
      else add('Longarinas', 'LG-FUNDO', `Longarina travamento fundo – rua ${larguraRua} mm (fora dos modelos cadastrados)`, SEM.PK, nF, larguraRua, +(0.481 + 0.002627 * larguraRua).toFixed(3), `${obsF}; peso ESTIMADO pela reta dos modelos 1350/1400/1480/1570`);
      for (const id of ['INT0812', 'INT0648', 'INT0650']) add('Longarinas', id, prodOf(cat, id).desc, id, 4 * nF, null, null, `4 por longarina de fundo (já incluídos no PK)`);
    }
    // TOPO (plano do topo, VISTA_SUPERIOR.dxf): só diagonais, alternadas, uma por vão entre linhas de coluna, presas nas chapas de ponta das
    // longarinas superiores (DI_LONG_VIST_SUP): furos a 60 mm para dentro da face da coluna (c/c em x = rua − 120) e, ao longo da profundidade,
    // a 65 mm da alma para o lado da longarina (dentro do quadro) ou 25 mm para o lado de fora (vão entre quadros / solteira)
    // alma de cada coluna (t a partir do fundo): a coluna abre para dentro do quadro; a solteira abre para a vizinha
    const quadroEsp = (k) => k >= 0 && k < n && (solteira ? k % 2 === 1 : k % 2 === 0);
    const abreT = eixosLat.map((_, j) => (quadroEsp(j - 1) ? -1 : 1));
    const almaT = faces.map((f, j) => (abreT[j] > 0 ? f : f + CW_LAT));
    const FURO_LG_DENTRO = 65, FURO_LG_FORA = 25, FURO_LG_X = 60;
    const furoT = (j, dir) => almaT[j] + dir * (dir === abreT[j] ? FURO_LG_DENTRO : FURO_LG_FORA); // dir = +1 (para a frente) ou −1
    const ccXTopo = larguraRua - 2 * FURO_LG_X;
    const vaosTopo = []; for (let j = 0; j < eixosLat.length - 1; j++) vaosTopo.push(+(furoT(j + 1, -1) - furoT(j, 1)).toFixed(1));
    const porDT = {}; for (const dy of vaosTopo) { const t = +(Math.hypot(ccXTopo, dy) + 30.5).toFixed(1); porDT[t] = (porDT[t] || 0) + 1; }
    for (const [t, q] of Object.entries(porDT)) addZ('Travamento de topo (zig-zag)', 'D', Number(t), q * R, `${q} por rua`);
    // fixadores das diagonais do zig-zag (topo e fundo): 2 INT1193 + 2 INT0650 por diagonal
    const nDiagZ = (diagZ.length + (eixosLat.length - 1)) * R;
    add('Fixadores do zig-zag', 'INT1193', prodOf(cat, 'INT1193').desc, 'INT1193', 2 * nDiagZ, null, null, `2 por diagonal (${nDiagZ} diagonais de topo + fundo)`);
    add('Fixadores do zig-zag', 'INT0650', prodOf(cat, 'INT0650').desc, 'INT0650', 2 * nDiagZ, null, null, '2 por diagonal');
    // o U da longarina de túnel abraça o C do braço: altura interna do U ≥ altura A do C
    const uInterno = lgU.A - 2 * lgU.e;
    // tolerância de encaixe: altura interna do U = A do C ± 1 mm (Gean)
    const folgaUC = uInterno - perfilC.A;
    if (folgaUC < -1) erros.push(`Longarina de túnel U ${lgU.A}x${lgU.B}x${lgU.e}: altura interna ${uInterno.toFixed(1)} mm não comporta o C do braço (A = ${perfilC.A} mm; tolerância ± 1 mm).`);
    else if (folgaUC > 1) alertas.push(`Longarina de túnel U ${lgU.A}x${lgU.B}x${lgU.e}: altura interna ${uInterno.toFixed(1)} mm deixa folga de ${folgaUC.toFixed(1)} mm sobre o C do braço (A = ${perfilC.A} mm), acima da tolerância de ± 1 mm.`);
    // VISTA_SUPERIOR.dxf: trilho (DI_TRILHO_GUIA, 167 mm) centrado na linha de colunas de cada lateral → 1 por lateral (o das internas serve às duas ruas) — confirmado pelo Gean
    // guia inferior (Gean 13/10/2026): 2 perfis laterais (des. 0004.0003.03.009 REV.04, chapa #4,75, ~3,513 kg/m) montados com peças padrão,
    // maior primeiro e sem corte, do protetor frontal (~133 mm) até passar da penúltima coluna (= trilho do desenho), com a menor sobra possível sem picar em peças pequenas
    // perfil S de reforço PK041124 (des. 0004.0003.01.009): 1 a cada 500 mm, o 1º colado na coluna da frente → floor(guia / 500) + 1
    if (compTrilho > 0) {
      const PECAS_GUIA = [2750, 2495, 1625, 1250, 1100, 1050], alvo = compTrilho - 133, lado = [];
      let rest = alvo;
      while (rest > 2750 + 1050) { lado.push(2750); rest -= 2750; } // peças de 2750 enquanto couber; o final (≤ 3800) pela combinação de até 3 peças
      if (rest > 0) {                                                  // que passa da coluna com a menor sobra, cada emenda a mais pesando como 150 mm de sobra
        let best = null; const tenta = (c) => { const t = c.reduce((a, b) => a + b, 0), n = t - rest + 150 * c.length; if (t >= rest && (!best || n < best.n)) best = { t, c, n }; };
        PECAS_GUIA.forEach((a, i) => { tenta([a]); PECAS_GUIA.slice(i).forEach((b, j) => { tenta([a, b]); PECAS_GUIA.slice(i + j).forEach((c) => tenta([a, b, c])); }); });
        lado.push(...best.c); rest -= best.t;
      }
      const soma = lado.reduce((a, b) => a + b, 0), cont = {};
      for (const pc of lado) cont[pc] = (cont[pc] || 0) + 1;
      for (const pc of PECAS_GUIA) if (cont[pc]) { const g = prodOf(cat, `GUIA-${pc}`); add('Guia inferior', `GUIA-${pc}`, g.desc, g.codigo, 2 * cont[pc] * laterais, pc, g.peso, `${cont[pc]} por lado × 2 lados × ${laterais} lateral(is); guia ${soma} mm + protetor, passa ${r1(-rest)} mm da penúltima coluna (trilho ${r1(compTrilho)} mm com o protetor)`); }
      const nS = Math.floor(soma / 500) + 1, ps = prodOf(cat, 'PERFIL-S');
      add('Guia inferior', 'PERFIL-S', ps.desc, ps.codigo, nS * laterais, null, ps.peso, `${nS} por guia: 1 colado na coluna da frente + 1 a cada 500 mm`);
      add('Guia inferior', 'INT0654', prodOf(cat, 'INT0654').desc, 'INT0654', 2 * nS * laterais, null, null, '2 por perfil S');
      add('Guia inferior', 'INT0648', prodOf(cat, 'INT0648').desc, 'INT0648', 4 * nS * laterais, null, null, '4 por perfil S');
      add('Guia inferior', 'INT0650', prodOf(cat, 'INT0650').desc, 'INT0650', 4 * nS * laterais, null, null, '4 por perfil S');
    }
    // stop palete (Gean, bloco DI_LGFUNDO): 2 por longarina de fundo → 2 por rua em cada nível de braço
    // desenho 0004.0003.01.007 REV.01: kit PA042118 = stop CO040442 + 1 parafuso autobrocante INT1132, 0,424 kg (existe também o invertido PA042271, mesmo peso)
    if (niveisArm.length) {
      const st = prodOf(cat, 'STOP-PALETE'), nSt = 2 * R * niveisArm.length;
      add('Stop palete', 'STOP-PALETE', st.desc, st.codigo, nSt, null, st.peso, `2 por longarina de fundo (2 por rua × ${niveisArm.length} nível(is))`);
      add('Stop palete', 'INT1132', prodOf(cat, 'INT1132').desc, 'INT1132', nSt, null, null, '1 por stop (já incluído no PA042118)');
    }
    // VISTA_SUPERIOR.dxf: longarina superior (DI_LONG_VIST_SUP) em todas as linhas de coluna — é nela que as diagonais de topo são fixadas — confirmado pelo Gean
    addLgTB80('LGTOPO', 'Longarina de topo', R * colPorLateral, `1 por rua em cada linha de coluna (${colPorLateral} por rua), no topo`);
    if (nLgTB80) for (const id of ['INT0648', 'INT0650']) add('Longarinas', id, prodOf(cat, id).desc, id, 2 * nLgTB80, null, null, `2 por longarina de topo (já incluídos no PK)`);


    // ---- pesos/regras ainda em validação (Gean, validacao/VALIDACAO_PESOS.md): itens listados, mas sem peso ou com peso provisório
    pend.push('Pesos em validação: travessa união fora dos modelos sai com peso estimado; longarinas de topo fora dos modelos cadastrados saem por componentes; longarina de fundo fora dos modelos com peso estimado. Fixadores (INT/IND) entram só pelo valor, sem peso.');
    pend.push('Longarina de túnel: regra de barras de até 3000 mm com tala sobre o braço a confirmar (a planilha F379 usa barra inteira + complemento, sem tala).');
    const peDireito = Number(inp.peDireito) || 0;
    if (peDireito && H > peDireito) erros.push(`Altura da estrutura (${H} mm) maior que o pé-direito informado (${peDireito} mm).`);
    else if (peDireito && peDireito - H < 300) alertas.push(`Folga entre o topo da estrutura e o pé-direito: ${peDireito - H} mm. Conferir sprinklers, luminárias e vigas do galpão.`);
    alertas.unshift(AVISO_ESTRUTURAL, NOTA_RESPONSABILIDADE); // decisão do Gean: aviso fixo em todo projeto (sem tabela de dimensionamento)
    if (col === 80) pend.push('COL 80: sapata (CO) e perfil U (SA) sem código cadastrado.');
    if (dup) pend.push(`${nomeCol}: regras provisórias — 2 montantes por posição (perfil, emenda e contraventamento lateral em dobro), 1 sapata ${idSap} por posição, braço específico da duplada (sem desenho, SA nem peso cadastrados: peso estimado com U de ${colW} mm), zig-zag no oblongo externo. Faltam: desenho do braço específico, código PK da caneleira 80 DUP, fixação montante–montante e se a duplada vale para todas as laterais.`);

    const pesoTotal = pecas.reduce((s, p) => s + (p.pesoTotal || 0), 0);
    return {
      entradas: { ...inp, coluna: col, dup, espessura: esp },
      dimensoes: { altura: H, alturaCalculada: Hcalc, largura, profundidade, laterais, colPorLateral, colunas, montantes: colunas * nM, colW, emendas },
      posicoes, paletesPorRua: P, ocupPalete, sobraProfundidade: sobra, pesoTotal, kgPorPosicao: posicoes ? pesoTotal / posicoes : null,
      planta: { eixos: eixosLat, faces, almaT, abreT, cw: CW_LAT, furoLg: { dentro: FURO_LG_DENTRO, fora: FURO_LG_FORA, x: FURO_LG_X }, profPalete: Number(inp.profPalete || 1000) },
      lateral: { niveis: niveisArm, lgU, juntasTunel, trilho: { comp: compTrilho, alt: TRILHO_ALT, frente: TRILHO_FRENTE }, ys, nH, nD, tubosPorVao: 2 * nH - 2 * nD, espacos, quadros, solteira },
      frontal: { peDireito: Number(inp.peDireito) || 0, cargaPalete: Number(inp.cargaPalete) || 0, zigzag: { ccZ, hx: HX, paineis: panZ }, lgFundo: { comp: compLgFundo, h: lgU.A }, escravo, passoNivel, niveis: niveisArm, modeloAlto, balBaixo, balAlto, perfilC, espU: ESP_U, uAlt: altU, alturaPalete: Number(inp.alturaPalete), larguraRua, frentePalete, folgaPalete: FOLGA_PALETE_COLUNA, laterais },
      pecas, alertas, erros, pendencias: pend,
    };
  }

  const Engine = { AVISO_ESTRUTURAL, NOTA_RESPONSABILIDADE, calcular, posicoesHorizontais, buscaSA, KG_M_TRAVESSA, SEM };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine; else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
