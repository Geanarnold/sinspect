// Motor de cálculo do Porta-Palete (seletivo). Regras e fontes: porta-palete/CATALOGO_PP.md.
// Reaproveita do Drive-In (Gean, 17/10/2026): colunas, emenda, travessas/diagonais (SA ±3 mm), tubos e parafusos do quadro.
// Funciona no navegador (window.PPEngine) e no Node (module.exports).
(function (root) {
  'use strict';
  const LG = root.PPLongarina || (typeof require === 'function' ? require('./pp_longarina.js') : null);
  const DI = root.Engine || (typeof require === 'function' ? require('./engine.js') : null);

  const SEM = { SA: 'SA04XXXX', CO: 'CO04XXXX' };
  const MAX_PECA = 8500, DENS = 7.85e-6;
  const ESP_TRAV_OPCOES = [0.85, 1.2, 1.4, 1.8];
  const ESP_COLUNA = ['1.8', '2.0', '2.25', '2.65']; // F 382
  // folgas operacionais (padrão do Drive-In; a confirmar para o PP): palete ↔ coluna e entre paletes 100 mm; palete ↔ longarina de cima 100 mm
  const FOLGA_LATERAL = 100, FOLGA_VERTICAL = 100, SOBRA_COLUNA = 100;
  const PROF_MIN = 600, PROF_MAX = 1200, PROF_PASSO = 50;
  // sapata PP (des. 0004.0001.02.013 REV.01) + 2 placas niveladoras (des. 0004.0001.03.057) + fixadores por sapata (Gean, 17/10/2026)
  const SAPATA = { 80: ['CO040211', 'PP SAPATA COLUNA 80 – PERFIL "U"', 0.83], 101: ['CO040212', 'PP SAPATA COLUNA 101 – PERFIL "U"', 0.85], 122: ['CO040213', 'PP SAPATA COLUNA 122 – PERFIL "U"', 0.99] };
  const PLACA = { 80: ['SA041046', 'PP PLACA NIVELADORA 80 101 – MOD PERFIL "U"', 0.19], 101: ['SA041046', 'PP PLACA NIVELADORA 80 101 – MOD PERFIL "U"', 0.19], 122: ['SA041045', 'PP PLACA NIVELADORA 122 – MOD PERFIL "U"', 0.223] };
  const FIX_SAPATA = [['INT0648', 2], ['INT0812', 4], ['INT0650', 2], ['INT0654', 2]];
  const PARAFUSO_TRAV = { 80: 'INT0993', 101: 'INT0958', 122: 'INT0973' };
  const TUBO = { 80: 'TUBO-80', 101: 'TUBO-101', 122: 'TUBO-122' };

  const ceil50 = (v) => Math.ceil(v / 50) * 50;
  const r1 = (v) => Math.round(v * 10) / 10;

  // horizontais do quadro (do pé da coluna): 1ª a 100; padrão 900 em 900; zig-zag 600 em 600; misto 3 × 600 e depois 900 (regra do DI).
  // Topo (PP e DI): sobrando mais de 250 mm acima da última, entra uma a 100 mm do topo, sem diagonal no último vão
  function horizontais(H, modulacao) {
    const ys = [100], cabe = (d) => ys[ys.length - 1] + d <= H - 100;
    if (modulacao === 'zigzag') while (cabe(600)) ys.push(ys[ys.length - 1] + 600);
    else {
      if (modulacao === 'misto') for (let i = 0; i < 3 && cabe(600); i++) ys.push(ys[ys.length - 1] + 600);
      while (cabe(900)) ys.push(ys[ys.length - 1] + 900);
    }
    let topo = false;
    if (H - ys[ys.length - 1] > 250) { ys.push(H - 100); topo = true; }
    return { ys, topo };
  }

  function prod(cat, id) {
    const p = (cat.produtos || {})[id] || Object.values(cat.produtos || {}).find((x) => x.codigo === id) || {};
    return { desc: p.desc || id, codigo: p.codigo || id, peso: p.peso == null ? null : p.peso };
  }
  function buscaSA(lista, total) {
    let best = null;
    for (const it of lista || []) { const d = Math.abs(it.total - total); if (d <= 3 && (!best || d < best.d)) best = { d, it }; }
    return best ? best.it : null;
  }

  function calcular(inp, cat) {
    const erros = [], alertas = [], pecas = [];
    const add = (grupo, id, desc, codigo, qtd, compr, pesoUnit, obs, atencao) => pecas.push({ grupo, id, desc, codigo: codigo || '', qtd, compr: compr || null, pesoUnit: pesoUnit == null ? null : pesoUnit, pesoTotal: pesoUnit == null ? null : qtd * pesoUnit, obs: obs || '', atencao: !!atencao });
    const num = (k, d) => (inp[k] === '' || inp[k] == null ? d : Number(inp[k]));

    const col = parseInt(inp.coluna, 10) || 80, esp = ESP_COLUNA.includes(String(inp.espessura)) ? String(inp.espessura) : '2.0';
    const frente = num('frentePalete', 1000), profPal = num('profPalete', 1200), hp = num('alturaPalete', 1200), carga = num('cargaPalete', 1000);
    const nPal = Math.max(1, Math.round(num('paletesNivel', 2))), nNiv = Math.max(1, Math.round(num('niveis', 3))), chao = inp.paleteChao !== false && inp.paleteChao !== 'nao';
    const modulos = Math.max(1, Math.round(num('modulos', 4))), fileiras = Number(inp.fileiras) === 2 ? 2 : 1, entreFileiras = num('entreFileiras', 200);
    const P = num('profQuadro', 1000), modulacao = ['padrao', 'zigzag', 'misto'].includes(inp.modulacao) ? inp.modulacao : 'padrao';
    const espTrav = ESP_TRAV_OPCOES.includes(Number(inp.espTrav)) ? Number(inp.espTrav) : 1.4;
    if (P < PROF_MIN || P > PROF_MAX || P % PROF_PASSO) erros.push(`Profundidade do quadro ${P} mm fora da regra: ${PROF_MIN} a ${PROF_MAX} mm, de ${PROF_PASSO} em ${PROF_PASSO}.`);
    if (!(frente > 0 && profPal > 0 && hp > 0)) erros.push('Informe frente, profundidade e altura do palete.');
    if (profPal - P > 400) alertas.push(`Palete ${profPal} mm avança ${profPal - P} mm além do quadro de ${P} mm (mais de 200 mm de cada lado): conferir apoio.`);
    if (profPal < P) alertas.push(`Palete (${profPal} mm) menor que a profundidade do quadro (${P} mm): o palete não apoia nas duas longarinas com folga – conferir.`);

    // ---- longarina: comprimento = paletes + folgas de 100 (entre paletes e até as colunas), múltiplo de 50 → é o vão livre entre colunas
    const Lcalc = ceil50(nPal * frente + (nPal + 1) * FOLGA_LATERAL);
    const L = inp.compLongarina ? Number(inp.compLongarina) : Lcalc;
    const cargaPar = nPal * carga;
    const lg = LG.montar(L, cargaPar, inp.perfilLongarina || null);
    if (lg.erro) erros.push(lg.erro);
    const perfil = lg.erro ? null : LG.PERFIS.find((p) => p.id === lg.perfil);
    const TB = perfil ? perfil.h : 80;
    if (lg.alertas) alertas.push(...lg.alertas);
    if (inp.compLongarina && Number(inp.compLongarina) < Lcalc) alertas.push(`Longarina de ${L} mm menor que a necessária para ${nPal} palete(s) de ${frente} mm com folgas de 100 mm (${Lcalc} mm).`);

    // ---- níveis: apoio = topo da longarina, medido do piso; passo = palete + folga + altura da longarina, múltiplo de 50 (furação)
    const passo = ceil50(hp + FOLGA_VERTICAL + TB);
    const alt1 = inp.alt1Nivel ? ceil50(Number(inp.alt1Nivel)) : chao ? passo : ceil50(TB + 150);
    const niveis = []; for (let k = 0; k < nNiv; k++) niveis.push(alt1 + k * passo);
    const Hcalc = ceil50(niveis[niveis.length - 1] + SOBRA_COLUNA);
    const H = inp.alturaManual ? ceil50(Number(inp.alturaManual)) : Hcalc;
    if (H < niveis[niveis.length - 1] + 50) erros.push(`Altura da coluna ${H} mm não comporta o último nível (${niveis[niveis.length - 1]} mm).`);
    const pd = num('peDireito', 0);
    if (pd > 0 && niveis[niveis.length - 1] + hp + FOLGA_VERTICAL > pd) alertas.push(`Último palete (topo a ${niveis[niveis.length - 1] + hp} mm + folga) passa do pé-direito de ${pd} mm.`);
    if (H > 2 * MAX_PECA) erros.push(`Altura ${H} mm acima do máximo de ${2 * MAX_PECA} mm.`);
    if (H > 12000) alertas.push('Altura acima de 12 m: fora da tabela F 382 dos montantes.');

    // ---- dimensões
    const quadros = fileiras * (modulos + 1), colunas = 2 * quadros;
    const comprimento = modulos * L + (modulos + 1) * col;
    const profundidade = fileiras * P + (fileiras - 1) * entreFileiras;
    const camadas = nNiv + (chao ? 1 : 0), posicoes = fileiras * modulos * nPal * camadas;

    // ---- colunas (iguais ao DI) + emenda
    const kgm = ((cat.colunas || {})[String(col)] || {})[esp];
    if (kgm == null) alertas.push(`Perfil COL ${col} #${esp} não encontrado no catálogo.`);
    const saCol = (h) => ((cat.colunas_sa || {})[String(col)] || {})[String(h)] || SEM.SA;
    const trechos = H > MAX_PECA ? [MAX_PECA, H - MAX_PECA] : [H];
    trechos.forEach((h, i) => { const sa = saCol(h); add('Colunas', `COL-${col}-${h}`, `AMPP COL ${col} C/ABA #${esp.replace('.', ',')} mm – ${h} mm${trechos.length > 1 ? (i ? ' (superior)' : ' (inferior)') : ''}`, sa, colunas, h, kgm != null ? kgm * h / 1000 : null, sa === SEM.SA ? 'altura sem SA cadastrado' : ''); });
    if (H > MAX_PECA) for (const c of (cat.composicao || []).filter((x) => x.pai === 'EMENDA')) { const p = prod(cat, c.item); add('Emenda de coluna', c.item, p.desc, p.codigo, c.qtd * colunas, null, p.peso); }

    // ---- sapatas PP + placas + fixadores
    const [sCod, sDesc, sPeso] = SAPATA[col], [pCod, pDesc, pPeso] = PLACA[col];
    add('Sapatas', sCod, sDesc, sCod, colunas, null, sPeso, 'des. 0004.0001.02.013 REV.01');
    add('Sapatas', pCod, pDesc, pCod, 2 * colunas, null, pPeso, '2 por sapata; peso da chapa cheia');
    for (const [id, q] of FIX_SAPATA) add('Fixadores das sapatas', id, prod(cat, id).desc, id, q * colunas, null, null, `${q} por sapata`);

    // ---- quadro: horizontais e diagonais (regra do DI: total = P − 78,6; c/c = P − 109,1)
    const { ys, topo } = horizontais(H, modulacao), nH = ys.length, nD = nH - 1 - (topo ? 1 : 0);
    const kgmTrav = 80 * espTrav * DENS * 1000, ch = ` #${espTrav.toFixed(2).replace('.', ',')}`;
    const ccH = P - 109.1, totH = P - 78.6, itH = buscaSA(cat.travessas, totH);
    add('Travessas', `TRAV-H-${P}`, `Travessa horizontal${ch} – quadro ${P} mm (total ${r1(totH)} mm, c/c ${r1(ccH)} mm)`, itH ? itH.sa : SEM.SA, nH * quadros, r1(totH), kgmTrav * totH / 1000, itH ? itH.nome : 'sem SA no cadastro (±3 mm)');
    const porV = {}; for (let i = 0; i < nD; i++) { const V = ys[i + 1] - ys[i]; porV[V] = (porV[V] || 0) + 1; }
    for (const [V, q] of Object.entries(porV)) {
      const cc = Math.hypot(ccH, Number(V)), tot = cc + 30.5, it = buscaSA(cat.diagonais, tot);
      add('Travessas', `TRAV-D-${P}-${V}`, `Travessa diagonal${ch} – quadro ${P}, vão ${V} mm (total ${r1(tot)} mm, c/c ${r1(cc)} mm)`, it ? it.sa : SEM.SA, q * quadros, r1(tot), kgmTrav * tot / 1000, it ? it.nome : 'sem SA no cadastro (±3 mm)');
    }
    const tb = prod(cat, TUBO[col]);
    add('Travessas', TUBO[col], tb.desc, tb.codigo, (2 * nH - 2 * nD) * quadros, null, tb.peso, 'nós de travessa sem diagonal');
    const nPar = 2 * nH * quadros, par = prod(cat, PARAFUSO_TRAV[col]);
    add('Fixadores das travessas', PARAFUSO_TRAV[col], par.desc, par.codigo, nPar, null, null);
    add('Fixadores das travessas', 'INT0650', prod(cat, 'INT0650').desc, 'INT0650', nPar, null, null, 'diagonais usam o mesmo parafuso da horizontal');

    // ---- longarinas: 2 por nível por módulo (frente e fundo) + 2 pinos por longarina
    if (!lg.erro) {
      const qL = 2 * nNiv * modulos * fileiras, [li, pino] = lg.itens;
      add('Longarinas', 'LONG', li.desc, li.codigo, qL, L, li.pesoUnit, `${lg.trocado ? 'perfil trocado pelo operador; ' : ''}capacidade F 237: ${lg.capacidade != null ? lg.capacidade + ' kg no par' : 'sem capacidade tabelada'}; peso = kg/m F 237 × comprimento + 2 garras${li.cadastrado ? '' : '; sem CO cadastrado'}`, li.atencao);
      add('Fixadores das longarinas', pino.codigo, pino.desc, pino.codigo, pino.qtd * qL, null, null, '1 por garra (manual F 250)');
    }

    if (fileiras === 2) alertas.push('Fileira dupla: espaçadores entre quadros e travamentos (etapa 5) ainda não entram na lista.');
    alertas.push('Coluna sem verificação pela F 382 (etapa 7): conferir com a engenharia.');

    return {
      tipo: 'PP', erros, alertas, pecas,
      entradas: { col, esp, frente, profPal, hp, carga, nPal, nNiv, chao, modulos, fileiras, entreFileiras, P, modulacao, espTrav, peDireito: pd },
      dimensoes: { comprimento, profundidade, altura: H },
      longarina: { L, Lcalc, perfil: perfil ? perfil.id : null, TB, garraH: perfil && perfil.garra === LG.GARRA3 ? 150 : 250, capacidade: lg.capacidade, cargaPar, atencao: !!lg.atencao, auto: lg.auto },
      niveis, passo, lateral: { ys, topo, nD }, posicoes, quadros, colunas,
      pesoTotal: pecas.reduce((s, p) => s + (p.pesoTotal || 0), 0),
    };
  }

  const PPEngine = { calcular, horizontais, AVISO_ESTRUTURAL: DI ? DI.AVISO_ESTRUTURAL : '', NOTA_RESPONSABILIDADE: DI ? DI.NOTA_RESPONSABILIDADE : '' };
  if (typeof module !== 'undefined' && module.exports) module.exports = PPEngine; else root.PPEngine = PPEngine;
})(typeof window !== 'undefined' ? window : globalThis);
