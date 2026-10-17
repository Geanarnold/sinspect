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
  // folgas operacionais (confirmadas pelo Gean, 17/10/2026): palete ↔ coluna e entre paletes 100 mm; palete ↔ longarina de cima 100 mm
  const FOLGA_LATERAL = 100, FOLGA_VERTICAL = 100, SOBRA_COLUNA = 250; // coluna passa 250 mm do último nível (Gean, 17/10/2026)
  const PROF_MIN = 600, PROF_MAX = 1200, PROF_PASSO = 50;
  // sapata PP (des. 0004.0001.02.013 REV.01) + 2 placas niveladoras (des. 0004.0001.03.057) + fixadores por sapata (Gean, 17/10/2026)
  const SAPATA = { 80: ['CO040211', 'PP SAPATA COLUNA 80 – PERFIL "U"', 0.83], 101: ['CO040212', 'PP SAPATA COLUNA 101 – PERFIL "U"', 0.85], 122: ['CO040213', 'PP SAPATA COLUNA 122 – PERFIL "U"', 0.99] };
  const PLACA = { 80: ['SA041046', 'PP PLACA NIVELADORA 80 101 – MOD PERFIL "U"', 0.19], 101: ['SA041046', 'PP PLACA NIVELADORA 80 101 – MOD PERFIL "U"', 0.19], 122: ['SA041045', 'PP PLACA NIVELADORA 122 – MOD PERFIL "U"', 0.223] };
  const FIX_SAPATA = [['INT0648', 2], ['INT0812', 4], ['INT0650', 2], ['INT0654', 2]];
  const PARAFUSO_TRAV = { 80: 'INT0993', 101: 'INT0958', 122: 'INT0973' };
  const TUBO = { 80: 'TUBO-80', 101: 'TUBO-101', 122: 'TUBO-122' };

  // F 382 rev.00 (20/02/2024) – capacidade da coluna (kgf) × distância entre níveis h, de 500 a 2600 mm (passo 100); até 12 m de altura
  const F382_H = []; for (let h = 500; h <= 2600; h += 100) F382_H.push(h);
  const linha = (v) => Object.fromEntries(F382_H.map((h, i) => [h, v[i]]));
  const F382 = {
    '80#1,8': linha([12586, 12102, 11509, 10789, 10105, 9886, 9731, 9540, 9321, 9120, 8865, 8618, 8317, 8044, 7734, 7469, 7187, 6858, 6576, 6220, 5910, 5636]),
    '80#2,0': linha([15659, 14984, 14109, 13096, 12111, 11820, 11637, 11309, 11044, 10780, 10479, 10090, 9704, 9302, 8947, 8536, 8199, 7825, 7332, 6949, 6585, 6220]),
    '101#1,8': linha([14829, 14829, 14829, 14829, 14683, 14556, 14419, 14136, 13890, 13780, 13388, 13169, 12713, 12531, 12130, 11765, 11382, 10962, 10625, 10342, 9822, 9467]),
    '101#2,0': linha([16890, 16890, 16890, 16890, 16452, 16270, 15978, 15686, 15559, 15276, 14975, 14592, 14200, 13844, 13580, 13042, 12732, 12139, 11774, 11418, 10882, 10470]),
    '101#2,25': linha([19370.9, 19370.9, 19370.9, 19370.9, 18449.8, 18240, 18112.3, 17784, 17437.4, 17291.5, 16780.8, 16525.4, 15914.4, 15675.5, 15212.2, 14619.4, 14263.7, 13734.7, 13297, 12795.4, 12193.4, 11837.8]),
    '101#2,65': linha([23009.8, 23009.8, 23009.8, 23009.8, 21906.2, 21660, 21468.5, 21076.3, 20702.4, 20301.1, 19772.2, 19389.1, 18887.5, 18395, 18021.1, 17315.2, 16726.1, 16105.9, 15595.2, 15002.4, 14291, 13871.5]),
    '122#1,8': linha([15267, 15267, 15267, 15267, 15267, 15267, 15267, 15230, 15230, 15230, 15230, 15230, 15230, 15230, 15230, 15230, 14866, 14647, 14291, 13862, 13589, 13096]),
    '122#2,0': linha([17492, 17492, 17492, 17492, 17492, 17492, 17492, 17456, 17456, 17456, 17456, 17456, 17456, 17456, 17401, 17054, 16653, 16243, 15832, 15504, 15066, 14656]),
    '122#2,25': linha([20283, 20283, 20283, 20283, 20283, 20283, 20283, 20246, 20246, 20246, 20246, 20246, 20246, 20046, 19517, 19128, 18678, 18422, 17948, 17383, 16890, 16434]),
    '122#2,65': linha([24907, 24907, 24907, 24907, 24907, 24907, 24907, 24925, 24925, 24925, 24679, 24442, 23976, 23533, 23183, 22676, 21961, 21624, 21204, 20593, 20000, 19280]),
  };
  // verificação da coluna: h = maior distância entre níveis (piso → 1º nível e entre níveis), tabela no h imediatamente maior (a favor da segurança);
  // carga na coluna: 1/4 da carga do par em cada nível de cada módulo vizinho (o palete do chão não carrega a coluna) – somada por quem chama
  function verificarColuna(col, esp, niveis, carga, H, P) {
    const id = `${col}#${String(Number(esp).toFixed(2)).replace(/0$/, '').replace('.', ',')}`, tab = F382[id];
    const vaos = niveis.map((y, k) => y - (k ? niveis[k - 1] : 0)), h = Math.max(...vaos);
    const hRef = F382_H.find((x) => x >= h);
    const cap = tab && hRef ? tab[hRef] : null;
    const r = { id, h, hRef: hRef || null, carga, capacidade: cap, uso: cap ? carga / cap : null, ok: cap != null && carga <= cap, motivo: '' };
    if (!tab) r.motivo = `COL ${col} #${String(esp).replace('.', ',')} não está na F 382.`;
    else if (!hRef) r.motivo = `Distância entre níveis de ${h} mm acima de 2600 mm (fora da F 382).`;
    else if (H > 12000) { r.ok = false; r.motivo = 'Altura acima de 12 m: fora da F 382.'; }
    r.travSuperior = H > 8000 && H / P >= 8; // F 382, determinação 1
    r.opcoes = Object.keys(F382).filter((k) => k.startsWith(col + '#')).map((k) => ({ id: k, capacidade: hRef ? F382[k][hRef] : null }));
    return r;
  }

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

  const N = (v, d) => (v === '' || v == null || Number.isNaN(Number(v)) ? d : Number(v));
  // alturas digitadas pelo operador ("1000; 2400 3800" ou lista): números positivos, em ordem
  const lerAlturas = (v) => (Array.isArray(v) ? v : String(v || '').split(/[;,\s]+/)).map(Number).filter((x) => x > 0);

  // ---- um corte = fileira(s) de módulos lado a lado; cada módulo tem palete, carga, níveis e longarina próprios (Gean, 17/10/2026)
  // corte: { nome, qtd, coluna, espessura, profPalete, profQuadro, modulacao, espTrav, fileiras, entreFileiras, peDireito, alturasColunas: [por linha de colunas],
  //          modulos: [{ paletesNivel, frentePalete, alturaPalete, cargaPalete, niveis, paleteChao, tunel, alturas, perfilLongarina, compLongarina }] }
  function calcularCorte(c, cat) {
    const erros = [], alertas = [], pecas = [];
    const add = (grupo, id, desc, codigo, qtd, compr, pesoUnit, obs, atencao) => {
      const ex = pecas.find((p) => p.grupo === grupo && p.id === id && p.desc === desc && p.compr === (compr || null));
      if (ex) { ex.qtd += qtd; ex.pesoTotal = ex.pesoUnit == null ? null : ex.qtd * ex.pesoUnit; if (obs && !ex.obs.includes(obs)) ex.obs += '; ' + obs; ex.atencao = ex.atencao || !!atencao; return; }
      pecas.push({ grupo, id, desc, codigo: codigo || '', qtd, compr: compr || null, pesoUnit: pesoUnit == null ? null : pesoUnit, pesoTotal: pesoUnit == null ? null : qtd * pesoUnit, obs: obs || '', atencao: !!atencao });
    };
    const col = parseInt(c.coluna, 10) || 80, esp = ESP_COLUNA.includes(String(c.espessura)) ? String(c.espessura) : '2.0';
    const profPal = N(c.profPalete, 1200), P = N(c.profQuadro, 1000), fileiras = Number(c.fileiras) === 2 ? 2 : 1, entreFileiras = N(c.entreFileiras, 300);
    const modulacao = ['padrao', 'zigzag', 'misto'].includes(c.modulacao) ? c.modulacao : 'padrao';
    const espTrav = ESP_TRAV_OPCOES.includes(Number(c.espTrav)) ? Number(c.espTrav) : 1.4, pd = N(c.peDireito, 0);
    if (P < PROF_MIN || P > PROF_MAX || P % PROF_PASSO) erros.push(`Profundidade do quadro ${P} mm fora da regra: ${PROF_MIN} a ${PROF_MAX} mm, de ${PROF_PASSO} em ${PROF_PASSO}.`);
    if (!(profPal > 0)) erros.push('Informe a profundidade do palete.');
    if (profPal - P > 400) alertas.push(`Palete ${profPal} mm avança ${profPal - P} mm além do quadro de ${P} mm (mais de 200 mm de cada lado): conferir apoio.`);
    if (profPal > 0 && profPal < P) alertas.push(`Palete (${profPal} mm) menor que a profundidade do quadro (${P} mm): o palete não apoia nas duas longarinas com folga – conferir.`);
    const lista = (c.modulos || []).length ? c.modulos : [{}];

    // ---- módulos: longarina (F 237) e níveis de cada um
    const mods = lista.map((m, i) => {
      const nm = `Módulo ${i + 1}`, tunel = !!m.tunel;
      const frente = N(m.frentePalete, 1000), hp = N(m.alturaPalete, 1200), carga = N(m.cargaPalete, 1000), nPal = Math.max(1, Math.round(N(m.paletesNivel, 2)));
      const chao = !tunel && m.paleteChao !== false && m.paleteChao !== 'nao';
      if (!(frente > 0 && hp > 0)) erros.push(`${nm}: informe frente e altura do palete.`);
      const Lcalc = ceil50(nPal * frente + (nPal + 1) * FOLGA_LATERAL), L = m.compLongarina ? Number(m.compLongarina) : Lcalc, cargaPar = nPal * carga;
      const lg = LG.montar(L, cargaPar, m.perfilLongarina || null);
      if (lg.erro) erros.push(`${nm}: ${lg.erro}`);
      (lg.alertas || []).forEach((a) => alertas.push(`${nm}: ${a}`));
      if (m.compLongarina && L < Lcalc) alertas.push(`${nm}: longarina de ${L} mm menor que a necessária para ${nPal} palete(s) de ${frente} mm com folgas de 100 mm (${Lcalc} mm).`);
      const perfil = lg.erro ? null : LG.PERFIS.find((p) => p.id === lg.perfil), TB = perfil ? perfil.h : 80;
      const passo = ceil50(hp + FOLGA_VERTICAL + TB);
      let niveis = lerAlturas(m.alturas), digitado = niveis.length > 0;
      if (!digitado) {
        if (tunel) erros.push(`${nm} (túnel): informe as alturas dos níveis na caixa do módulo.`);
        const nNiv = Math.max(1, Math.round(N(m.niveis, 3))), alt1 = chao ? passo : ceil50(TB + 150);
        niveis = []; for (let k = 0; k < nNiv; k++) niveis.push(alt1 + k * passo);
      } else {
        niveis.sort((a, b) => a - b);
        niveis.forEach((y, k) => {
          if (y % 50) alertas.push(`${nm}: nível ${y} mm fora da furação de 50 mm da coluna.`);
          const base = k ? niveis[k - 1] : chao ? 0 : null, minimo = hp + FOLGA_VERTICAL + TB;
          if (base != null && y - base < minimo) alertas.push(`${nm}: ${k ? `entre ${base} e ${y}` : `do piso a ${y}`} mm não cabe o palete de ${hp} mm + 100 de folga + longarina TB ${TB} (mínimo ${minimo} mm).`);
        });
      }
      // túnel (Gean, 17/10/2026): sem peças especiais – longarina maior (comprimento do vão do túnel) e 1º nível mais alto, ambos informados no módulo
      if (pd > 0 && niveis.length && niveis[niveis.length - 1] + hp + FOLGA_VERTICAL > pd) alertas.push(`${nm}: último palete (topo a ${niveis[niveis.length - 1] + hp} mm + folga) passa do pé-direito de ${pd} mm.`);
      return { i, nome: nm, tunel, frente, hp, carga, nPal, chao, L, Lcalc, cargaPar, lg, perfil: perfil ? perfil.id : null, TB, garraH: perfil && perfil.garra === LG.GARRA3 ? 150 : 250,
        capacidade: lg.capacidade, auto: lg.auto, atencao: !!lg.atencao, niveis, passo, digitado, posicoes: nPal * (niveis.length + (chao ? 1 : 0)) * fileiras };
    });
    const nMod = mods.length;

    // ---- colunas: cada linha de colunas j (0…nMod) termina 250 mm acima da última longarina dos módulos vizinhos (Gean).
    // O operador pode editar a altura de cada linha (botão na tela), mas só para SUBIR: valor menor que o calculado é ignorado
    const topoMod = (m) => (m && m.niveis.length ? m.niveis[m.niveis.length - 1] : 0);
    const Hcalc = [], Hs = [], editadas = Array.isArray(c.alturasColunas) ? c.alturasColunas : [];
    for (let j = 0; j <= nMod; j++) {
      const hc = ceil50(Math.max(topoMod(mods[j - 1]), topoMod(mods[j])) + SOBRA_COLUNA), ed = N(editadas[j], 0);
      Hcalc.push(hc);
      if (ed && ed < hc) alertas.push(`Coluna ${j + 1}: altura editada ${ed} mm menor que a calculada (${hc} mm = última longarina + ${SOBRA_COLUNA}). A coluna só pode subir; mantida em ${hc} mm.`);
      Hs.push(ed > hc ? ceil50(ed) : hc);
    }
    Hs.forEach((H, j) => { if (H > 2 * MAX_PECA) erros.push(`Coluna ${j + 1}: altura ${H} mm acima do máximo de ${2 * MAX_PECA} mm.`); });
    if (Math.max(...Hs) > 12000) alertas.push('Altura acima de 12 m: fora da tabela F 382 dos montantes.');
    const kgm = ((cat.colunas || {})[String(col)] || {})[esp];
    if (kgm == null) alertas.push(`Perfil COL ${col} #${esp} não encontrado no catálogo.`);
    const saCol = (h) => ((cat.colunas_sa || {})[String(col)] || {})[String(h)] || SEM.SA;
    const emendaComp = (cat.composicao || []).filter((x) => x.pai === 'EMENDA');
    for (const H of Hs) {
      const q = 2 * fileiras, trechos = H > MAX_PECA ? [MAX_PECA, H - MAX_PECA] : [H];
      trechos.forEach((h, i) => { const sa = saCol(h); add('Colunas', `COL-${col}-${h}`, `AMPP COL ${col} C/ABA #${esp.replace('.', ',')} mm – ${h} mm${trechos.length > 1 ? (i ? ' (superior)' : ' (inferior)') : ''}`, sa, q, h, kgm != null ? kgm * h / 1000 : null, sa === SEM.SA ? 'altura sem SA cadastrado' : ''); });
      if (H > MAX_PECA) for (const e of emendaComp) { const p = prod(cat, e.item); add('Emenda de coluna', e.item, p.desc, p.codigo, e.qtd * q, null, p.peso); }
    }
    const quadros = fileiras * (nMod + 1), colunas = 2 * quadros;

    // ---- sapatas PP + placas + fixadores
    const [sCod, sDesc, sPeso] = SAPATA[col], [pCod, pDesc, pPeso] = PLACA[col];
    add('Sapatas', sCod, sDesc, sCod, colunas, null, sPeso, 'des. 0004.0001.02.013 REV.01');
    add('Sapatas', pCod, pDesc, pCod, 2 * colunas, null, pPeso, '2 por sapata; peso da chapa cheia');
    for (const [id, q] of FIX_SAPATA) add('Fixadores das sapatas', id, prod(cat, id).desc, id, q * colunas, null, null, `${q} por sapata`);

    // ---- quadros: horizontais e diagonais pela altura de cada linha de colunas (regra do DI: total = P − 78,6; c/c = P − 109,1)
    const kgmTrav = 80 * espTrav * DENS * 1000, ch = ` #${espTrav.toFixed(2).replace('.', ',')}`;
    const ccH = P - 109.1, totH = P - 78.6, itH = buscaSA(cat.travessas, totH), tb = prod(cat, TUBO[col]), par = prod(cat, PARAFUSO_TRAV[col]);
    const quadroInfo = Hs.map((H) => { const { ys, topo } = horizontais(H, modulacao); return { H, ys, topo, nD: ys.length - 1 - (topo ? 1 : 0) }; });
    for (const qd of quadroInfo) {
      const nH = qd.ys.length;
      add('Travessas', `TRAV-H-${P}`, `Travessa horizontal${ch} – quadro ${P} mm (total ${r1(totH)} mm, c/c ${r1(ccH)} mm)`, itH ? itH.sa : SEM.SA, nH * fileiras, r1(totH), kgmTrav * totH / 1000, itH ? itH.nome : 'sem SA no cadastro (±3 mm)');
      for (let i = 0; i < qd.nD; i++) {
        const V = qd.ys[i + 1] - qd.ys[i], cc = Math.hypot(ccH, V), tot = cc + 30.5, it = buscaSA(cat.diagonais, tot);
        add('Travessas', `TRAV-D-${P}-${V}`, `Travessa diagonal${ch} – quadro ${P}, vão ${V} mm (total ${r1(tot)} mm, c/c ${r1(cc)} mm)`, it ? it.sa : SEM.SA, fileiras, r1(tot), kgmTrav * tot / 1000, it ? it.nome : 'sem SA no cadastro (±3 mm)');
      }
      add('Travessas', TUBO[col], tb.desc, tb.codigo, (2 * nH - 2 * qd.nD) * fileiras, null, tb.peso, 'nós de travessa sem diagonal');
      add('Fixadores das travessas', PARAFUSO_TRAV[col], par.desc, par.codigo, 2 * nH * fileiras, null, null);
      add('Fixadores das travessas', 'INT0650', prod(cat, 'INT0650').desc, 'INT0650', 2 * nH * fileiras, null, null, 'diagonais usam o mesmo parafuso da horizontal');
    }

    // ---- longarinas: 2 por nível de cada módulo (frente e fundo) + 2 pinos por longarina
    for (const m of mods) {
      if (m.lg.erro) continue;
      const qL = 2 * m.niveis.length * fileiras, [li, pino] = m.lg.itens;
      add('Longarinas', `LONG-${li.codigo}-${m.L}-${m.perfil}`, li.desc, li.codigo, qL, m.L, li.pesoUnit, `${m.nome}${m.lg.trocado ? ' (perfil trocado pelo operador)' : ''}; F 237: ${m.capacidade != null ? m.capacidade + ' kg no par' : 'sem capacidade tabelada'}${li.cadastrado ? '' : '; sem CO cadastrado'}`, li.atencao);
      add('Fixadores das longarinas', pino.codigo, pino.desc, pino.codigo, pino.qtd * qL, null, null, '1 por garra (manual F 250)');
    }

    // ---- colunas pela F 382: cada coluna recebe 1/4 da carga do par de cada nível dos módulos vizinhos; h pelos níveis dos dois lados
    const verifs = Hs.map((H, j) => {
      const viz = [mods[j - 1], mods[j]].filter(Boolean), carga = viz.reduce((s, m) => s + m.niveis.length * m.cargaPar / 4, 0);
      const niv = [...new Set([].concat(...viz.map((m) => m.niveis)))].sort((a, b) => a - b);
      return { j, ...verificarColuna(col, esp, niv, carga, H, P) };
    });
    const pior = verifs.reduce((a, v) => (!a || (v.uso || 0) > (a.uso || 0) || (a.ok && !v.ok && !v.motivo) ? v : a), null);
    for (const v of verifs) {
      if (v.motivo) alertas.push(`Coluna ${v.j + 1} sem verificação: ${v.motivo} Conferir com a engenharia.`);
      else if (!v.ok) alertas.push(`COLUNA NÃO ATENDE (F 382) – coluna ${v.j + 1}: COL ${col} #${esp.replace('.', ',')} suporta ${Math.round(v.capacidade)} kgf com h = ${v.hRef} mm; carga ${Math.round(v.carga)} kg. Trocar coluna/espessura ou CONSULTAR ENGENHARIA.`);
    }
    if (verifs.some((v) => v.travSuperior)) alertas.push('Acima de 8 m com altura/profundidade ≥ 8: F 382 pede travamento superior a cada 3 montantes (etapa 5).');
    if (fileiras === 2) alertas.push('Fileira dupla: espaçadores entre quadros e travamentos (etapa 5) ainda não entram na lista.');

    const ORDEM = ['Colunas', 'Emenda de coluna', 'Sapatas', 'Fixadores das sapatas', 'Travessas', 'Fixadores das travessas', 'Longarinas', 'Fixadores das longarinas'];
    pecas.sort((a, b) => ORDEM.indexOf(a.grupo) - ORDEM.indexOf(b.grupo));
    const comprimento = mods.reduce((s, m) => s + m.L, 0) + (nMod + 1) * col, profundidade = fileiras * P + (fileiras - 1) * entreFileiras;
    return {
      tipo: 'PP', nome: String(c.nome || '').trim(), qtd: Math.max(1, Math.round(N(c.qtd, 1))), erros, alertas, pecas,
      entradas: { col, esp, profPal, P, fileiras, entreFileiras, modulacao, espTrav, peDireito: pd, modulos: nMod },
      modulos: mods, colunasH: Hs, colunasHcalc: Hcalc, emendaY: MAX_PECA, quadros: quadroInfo, verifColunas: verifs, verifColuna: pior,
      dimensoes: { comprimento, profundidade, altura: Math.max(...Hs) },
      posicoes: mods.reduce((s, m) => s + m.posicoes, 0), nQuadros: quadros, colunas,
      pesoTotal: pecas.reduce((s, p) => s + (p.pesoTotal || 0), 0),
    };
  }

  // compatibilidade: corte com todos os módulos iguais (entrada "plana" da 1ª versão)
  function calcular(inp, cat) {
    const m = { paletesNivel: inp.paletesNivel, frentePalete: inp.frentePalete, alturaPalete: inp.alturaPalete, cargaPalete: inp.cargaPalete, niveis: inp.niveis, paleteChao: inp.paleteChao,
      perfilLongarina: inp.perfilLongarina, compLongarina: inp.compLongarina, alturas: inp.alturas };
    const n = Math.max(1, Math.round(N(inp.modulos, 4)));
    return calcularCorte({ ...inp, modulos: Array.from({ length: n }, () => ({ ...m })) }, cat);
  }

  const PPEngine = { calcular, calcularCorte, lerAlturas, horizontais, verificarColuna, F382, AVISO_ESTRUTURAL: DI ? DI.AVISO_ESTRUTURAL : '', NOTA_RESPONSABILIDADE: DI ? DI.NOTA_RESPONSABILIDADE : '' };
  if (typeof module !== 'undefined' && module.exports) module.exports = PPEngine; else root.PPEngine = PPEngine;
})(typeof window !== 'undefined' ? window : globalThis);
