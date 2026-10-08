// Motor de cálculo do configurador Drive-In.
// Regras: ver ../REGRAS_RASCUNHO.md. Dados: catalogo.json (gerado de CATALOGO.xlsx).
// Funciona no navegador (window.Engine) e no Node (module.exports).
(function (root) {
  'use strict';

  const KG_M_TRAVESSA = 80 * 1.4 * 7.85e-6 * 1000; // sliter 80 x 1,40 (ACO0602), sliter fechado
  const AVISO_ESTRUTURAL = 'COLUNA SEM VALIDAÇÃO ESTRUTURAL — conferir com a engenharia antes de enviar ao cliente.';
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
    // o apoio real depende da furação (furos a 25 mm do topo, passo 50; furo inferior do braço 15 mm acima da base do U de 180):
    // topo do C = base do U + (180 − A)/2 + A → o 1º nível sobe até a próxima posição possível
    const resto = ((10 + (180 - alturaBracoC) / 2 + alturaBracoC) % 50 + 50) % 50;
    const snapFuro = (y) => { const k = Math.ceil((y - resto - 1e-6) / 50); return +(k * 50 + resto).toFixed(2); };
    const alt1Req = inp.alt1Nivel ? Number(inp.alt1Nivel) : ceil50((escravo ? 2 : 1) * hp + 100 + alturaBracoC);
    const alt1 = snapFuro(alt1Req);
    if (alt1 !== alt1Req) alertas.push(`1º nível ${alt1Req} mm ajustado para ${alt1} mm (furação de 50 mm da coluna).`);
    inp = { ...inp, alt1Nivel: alt1 };
    const LGTOPO_ALT = 154.65;
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
      const a = passoSolteira, totU = r1(a - 69.8);
      const itU = (cat.uniao || []).filter((u) => u.col === col).find((u) => Math.abs(u.total - totU) <= TOL_SA);
      add('Coluna solteira', 'UNIAO', `Travessa união COL ${col} – passo ${a} mm (total ${totU} mm)`, itU ? itU.co : SEM.CO, nH * laterais * nM, totU, itU ? itU.peso : null, itU ? itU.nome : 'sem CO cadastrado para este comprimento (±3 mm); peso não estimado');
      const q = nH * laterais * nM;
      add('Coluna solteira', 'INT0648', prodOf(cat, 'INT0648').desc, 'INT0648', 6 * q, null, null, '6 por união (a confirmar para todas as variantes)');
      add('Coluna solteira', 'INT0650', prodOf(cat, 'INT0650').desc, 'INT0650', 6 * q, null, null, '6 por união (a confirmar)');
    }
    // elemento de topo: dois modelos, um para o passo dentro do quadro e outro para o passo entre quadros (inclui o passo da solteira [CONFIRMAR])
    const porPassoTopo = (lista, rotulo, id) => {
      const c = {}; for (const a of lista) c[a] = (c[a] || 0) + 1;
      for (const [a, q] of Object.entries(c)) add('Topo', `${id}-${a}`, `Topo (DI_TOPO) ${rotulo} – passo ${a} mm`, SEM.SA, q * laterais * nM, Number(a), null, 'SA e peso a confirmar');
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
    const niveisArm = []; for (let k = 0; k < N - 1; k++) niveisArm.push(Number(inp.alt1Nivel) + k * passoNivel);
    // braço paramétrico (modelo 0004.0003.01.008): suporte em U (chapa 2,65, altura 180) abraçando a coluna + perfil C informado pelo operador
    // balanço medido da face externa do U até a ponta do C; 1º nível usa o balanço "baixo" (180), 2º em diante o "alto" (230) — treinamento slide 17
    const balBaixo = Number(inp.balancoBaixo) || 180, balAlto = Number(inp.balancoAlto || inp.bracoAcima) || 230;
    const modeloAlto = String(balAlto);
    const perfilC = { A: alturaBracoC, B: Number(inp.cB) || 15, C: Number(inp.cC) || 40, D: Number(inp.cD) || 1.8 };
    const ESP_U = 2.65, ALT_BRACO = 180, ABA_U = 42.65;
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
    let totBracos = 0;
    const cTxt = `C ${perfilC.A}x${perfilC.C}x${perfilC.B}x${perfilC.D}`;
    for (const [m, q] of Object.entries(contBraco)) {
      totBracos += q;
      const [tipo, bal] = m.split('|'), b = Number(bal);
      add('Braços', `BRACO-${tipo}${bal}-${col}${dup ? 'D' : ''}`, `Braço ${dup ? 'específico ' : ''}${tipo === 'S' ? 'simples' : 'duplo'} balanço ${bal} – ${nomeCol} – ${cTxt} (comp. C ${compC(tipo, b).toFixed(1)})`, SEM.SA, q, compC(tipo, b), +pesoBracoCalc(tipo, b).toFixed(3),
        dup ? 'braço específico da coluna duplada (sem desenho/SA): peso ESTIMADO com U de 160 abraçando as 2 montantes + perfil C' : 'peso calculado pela geometria (U 2,65 + perfil C), sem descontar furos; SA a definir');
    }
    // apoio do palete sobre o braço: o palete fica a 100 mm da face da coluna; o braço avança 2,65 (U) + balanço
    const APOIO_MIN = 80; // apoio mínimo do palete sobre o braço, por lado (definido pelo Gean)
    const apoioBaixo = ESP_U + balBaixo - FOLGA_PALETE_COLUNA, apoioAlto = ESP_U + balAlto - FOLGA_PALETE_COLUNA;
    for (const [nome, ap, usa] of [['1º nível', apoioBaixo, niveisArm.length > 0], ['2º nível em diante', apoioAlto, niveisArm.length > 1]]) {
      if (!usa) continue;
      if (ap < APOIO_MIN) erros.push(`Braço ${nome}: apoio do palete ${ap.toFixed(1)} mm por lado, abaixo do mínimo de ${APOIO_MIN} mm. Aumente o balanço (mínimo ${Math.ceil(APOIO_MIN + FOLGA_PALETE_COLUNA - ESP_U)} mm).`);
    }
    if (totBracos) {
      add('Fixadores dos braços', 'INT0648', prodOf(cat, 'INT0648').desc, 'INT0648', 8 * totBracos, null, null, '8 por braço');
      add('Fixadores dos braços', 'INT0650', prodOf(cat, 'INT0650').desc, 'INT0650', 8 * totBracos, null, null, '8 por braço');
      add('Fixadores dos braços', 'INT0812', prodOf(cat, 'INT0812').desc, 'INT0812', 16 * totBracos, null, null, '16 por braço');
    }
    // caneleira (protetor 700 mm) na coluna de frente de cada lateral; longarina superior (DI_LGTOPO) no topo de cada rua
    add('Protetores', 'CANELEIRA', 'Caneleira (protetor de coluna) 700 mm', SEM.SA, laterais, 700, 2.5, 'peso da planilha antiga (a confirmar); 1 por lateral, na frente [CONFIRMAR]');
    // trilho guia: 1 de cada lado da rua, da frente até o final do penúltimo palete na profundidade
    // trilho guia (Drawing1.dxf, vistas laterais A–D): perfil de 75 mm no piso, passa 50 mm à frente da estrutura e vai até o fim do penúltimo palete
    const TRILHO_ALT = 75, TRILHO_FRENTE = 50;
    const compTrilho = P > 1 ? (P - 1) * ocupPalete + TRILHO_FRENTE : 0;
    // longarina de túnel (Drawing1.dxf): perfil U na mesma faixa do C do braço (topo = apoio do palete), contínua em toda a profundidade,
    // uma em cada linha de braço → 2 por rua por nível de braço
    const lgU = { A: Number(inp.uA) || 100, B: Number(inp.uB) || 38, e: Number(inp.uE) || 1.8 };
    const kgmLgU = (lgU.A + 2 * lgU.B - 2 * lgU.e) * lgU.e * DENS * 1000;
    // barras de no máximo 3000 mm; a emenda cai sempre sobre um suporte de braço (eixo de coluna na vista lateral), cada barra a maior possível
    const LG_TUNEL_MAX = 3000, CW_LAT = 69.8;
    const faces = [0]; espacos.forEach((a, i) => { const quadroI = solteira ? i % 2 === 1 : i % 2 === 0; faces.push(faces[i] + (solteira && i === 0 ? a : quadroI ? a - CW_LAT : a + CW_LAT)); });
    const eixosLat = faces.map((v) => v + CW_LAT / 2);
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
      else add('Longarinas', idItem, `${nome} TB 80 – ${larguraRua} mm (fora dos modelos cadastrados)`, SEM.PK, qtd, larguraRua, +(0.527 + 0.001918 * larguraRua).toFixed(3), `${obs}; peso estimado pela reta dos modelos 1350/1400/1480/1570`);
    };
    // ---- travamento em zig-zag (treinamento slides 9 e 11): mesmo perfil das travessas da lateral (sliter 80 × 1,40), em todas as ruas
    // fixação na furação frontal da coluna (oblongos a ±hx do eixo): c/c horizontal = rua + coluna − 2·hx; total = c/c + 30,5 (regra das travessas)
    const hx1 = { 80: 21.9, 101: 32.4, 122: 43.05 }[col] || col / 2 - 18;
    const HX = dup ? col / 2 + hx1 : hx1; // duplada: oblongo externo da montante voltada para a rua (eixo da montante a ±col/2 do centro) [CONFIRMAR]
    const ccZ = larguraRua + colW - 2 * HX;
    // FUNDO (plano do fundo, vista frontal): SEM horizontais (no lugar delas entra a longarina de fundo); uma diagonal por painel, alternada,
    // do ponto 50 mm acima da sapata / do suporte do braço até 50 mm abaixo do próximo suporte do braço / da longarina de topo (Gean)
    const offApoioZ = (180 - perfilC.A) / 2 + perfilC.A, SAPATA_TOPO = 104.76, LGTOPO_BASE = H - 154.65;
    const basesU = niveisArm.map((y) => y - offApoioZ);
    const panZ = []; let ySup = SAPATA_TOPO + 50;
    for (const yb of basesU) { panZ.push([ySup, yb - 50]); ySup = yb + 180 + 50; }
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
    if (niveisArm.length) addLgTB80('LG-FUNDO', 'Longarina de fundo', R * niveisArm.length, `1 por rua × ${niveisArm.length} nível(is)`);
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
    if (compTrilho > 0) add('Trilho guia', 'TRILHO-GUIA', `Trilho guia – até o fim do ${P - 1}º palete`, SEM.SA, laterais, compTrilho, null, '1 por lateral, centrado na linha de colunas (VISTA_SUPERIOR.dxf); perfil e peso a definir');
    // stop palete (Gean, bloco DI_LGFUNDO): 2 por longarina de fundo → 2 por rua em cada nível de braço
    const pesoStop = Number(inp.pesoStop) || null;
    if (niveisArm.length) add('Stop palete', 'STOP-PALETE', 'Stop palete (sobre a longarina de fundo)', SEM.SA, 2 * R * niveisArm.length, null, pesoStop, `2 por longarina de fundo (2 por rua × ${niveisArm.length} nível(is))${pesoStop ? '' : '; peso unitário não informado'}`);
    // VISTA_SUPERIOR.dxf: longarina superior (DI_LONG_VIST_SUP) em todas as linhas de coluna — é nela que as diagonais de topo são fixadas — confirmado pelo Gean
    addLgTB80('LGTOPO', 'Longarina de topo', R * colPorLateral, `1 por rua em cada linha de coluna (${colPorLateral} por rua), no topo`);
    if (nLgTB80) for (const id of ['INT0648', 'INT0650']) add('Longarinas', id, prodOf(cat, id).desc, id, 2 * nLgTB80, null, null, `2 por longarina de topo/fundo (já incluídos no PK)`);


    // ---- ainda não levantado
    pend.push('Contraventamentos LG-UE superior e de fundo, viga túnel e complemento, diagonais superiores e de amarração de fundo, protetores de coluna e caneleira, stop de palete: ainda não levantados. Não entram no peso.');
    const peDireito = Number(inp.peDireito) || 0;
    if (peDireito && H > peDireito) erros.push(`Altura da estrutura (${H} mm) maior que o pé-direito informado (${peDireito} mm).`);
    else if (peDireito && peDireito - H < 300) alertas.push(`Folga entre o topo da estrutura e o pé-direito: ${peDireito - H} mm. Conferir sprinklers, luminárias e vigas do galpão.`);
    alertas.unshift(AVISO_ESTRUTURAL); // decisão do Gean: aviso fixo em todo projeto (sem tabela de dimensionamento)
    if (col === 80) pend.push('COL 80: sapata (CO) e perfil U (SA) sem código cadastrado.');
    if (dup) pend.push(`${nomeCol}: regras provisórias — 2 montantes por posição (perfil, emenda e contraventamento lateral em dobro), 1 sapata ${idSap} por posição, braço específico da duplada (sem desenho, SA nem peso cadastrados: peso estimado com U de ${colW} mm), zig-zag no oblongo externo. Faltam: desenho do braço específico, caneleira, fixação montante–montante e se a duplada vale para todas as laterais.`);

    const pesoTotal = pecas.reduce((s, p) => s + (p.pesoTotal || 0), 0);
    return {
      entradas: { ...inp, coluna: col, dup, espessura: esp },
      dimensoes: { altura: H, alturaCalculada: Hcalc, largura, profundidade, laterais, colPorLateral, colunas, montantes: colunas * nM, colW, emendas },
      posicoes, paletesPorRua: P, ocupPalete, sobraProfundidade: sobra, pesoTotal, kgPorPosicao: posicoes ? pesoTotal / posicoes : null,
      planta: { eixos: eixosLat, faces, almaT, abreT, cw: CW_LAT, furoLg: { dentro: FURO_LG_DENTRO, fora: FURO_LG_FORA, x: FURO_LG_X }, profPalete: Number(inp.profPalete || 1000) },
      lateral: { niveis: niveisArm, lgU, juntasTunel, trilho: { comp: compTrilho, alt: TRILHO_ALT, frente: TRILHO_FRENTE }, ys, nH, nD, tubosPorVao: 2 * nH - 2 * nD, espacos, quadros, solteira },
      frontal: { peDireito: Number(inp.peDireito) || 0, cargaPalete: Number(inp.cargaPalete) || 0, zigzag: { ccZ, hx: HX, paineis: panZ }, lgFundo: { comp: compLgFundo, h: lgU.A }, escravo, passoNivel, niveis: niveisArm, modeloAlto, balBaixo, balAlto, perfilC, espU: ESP_U, alturaPalete: Number(inp.alturaPalete), larguraRua, frentePalete, folgaPalete: FOLGA_PALETE_COLUNA, laterais },
      pecas, alertas, erros, pendencias: pend,
    };
  }

  const Engine = { AVISO_ESTRUTURAL, calcular, posicoesHorizontais, buscaSA, KG_M_TRAVESSA, SEM };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine; else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
