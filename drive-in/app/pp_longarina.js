// Porta-palete – longarina tubo simples: capacidade, escolha do perfil, peso e código.
// Fonte da capacidade: F 237 rev.006 (21/10/2024) – carga admissível no PAR de longarinas (kg), aço COS CIVIL 300,
// flecha < L/200 (NBR 17150 / NBR 15524 / NBR 14762). Ver porta-palete/CATALOGO_PP.md, seções 6.x.
// Funciona no navegador (window.PPLongarina) e no Node (module.exports). Ainda não ligado à tela.
(function (root) {
  'use strict';
  const COMP = []; for (let c = 1100; c <= 3500; c += 100) COMP.push(c);
  const L_MIN = 800, L_MAX = 5000, PASSO = 50, TAB_MIN = 1100, TAB_MAX = 3500;
  const linha = (inicio, caps) => { const o = {}; caps.forEach((v, i) => { o[inicio + i * 100] = v; }); return o; };

  // garras: 3 dentes só para TB 80 #1,5 (SA040008); demais 5 encaixes (SA040006). Peso por garra (desenho 0004.0001.02.001).
  const GARRA3 = { sa: 'SA040008', desc: 'PP GARRA LONGARINA 3 ENCAIXES', kg: 0.2265 };
  const GARRA5 = { sa: 'SA040006', desc: 'PP GARRA LONGARINA 5 ENCAIXES', kg: 0.391 };
  const PINO = { codigo: 'INT1556', desc: 'GRAMPO LONGARINA PORTA PALETE (PINO TRAVA)', porGarra: 1 };

  // em ordem de peso (kg/m) – a escolha automática pega o primeiro que atende
  const PERFIS = [
    { id: '80#1,5', h: 80, esp: 1.5, kgm: 3.77, garra: GARRA3, cap: linha(1100, [3400, 3200, 2900, 2700, 2550, 2400, 2250, 2050, 1800, 1650, 1500, 1350, 1250, 1150, 1050, 950, 900, 800, 750, 700, 650, 600, 550, 550, 500]) },
    { id: '90#1,5', h: 90, esp: 1.5, kgm: 4.15, garra: GARRA5, cap: linha(1100, [4400, 4000, 3750, 3500, 3300, 3100, 2900, 2800, 2600, 2500, 2350, 2150, 2000, 1800, 1650, 1500, 1400, 1300, 1200, 1150, 1050, 1000, 900, 850, 800]) },
    { id: '100#1,5', h: 100, esp: 1.5, kgm: 4.33, garra: GARRA5, cap: linha(1300, [4200, 3900, 3700, 3450, 3250, 3100, 2950, 2800, 2650, 2550, 2400, 2200, 2000, 1850, 1700, 1600, 1500, 1400, 1300, 1200, 1150, 1050, 1000]) },
    { id: '110#1,5', h: 110, esp: 1.5, kgm: 4.48, garra: GARRA5, cap: linha(1400, [4250, 3950, 3750, 3550, 3400, 3200, 3050, 2900, 2750, 2700, 2550, 2400, 2150, 2000, 1850, 1700, 1600, 1500, 1400, 1300, 1250, 1150]) },
    { id: '130#1,5', h: 130, esp: 1.5, kgm: 4.95, garra: GARRA5, cap: linha(1500, [4950, 4650, 4400, 4200, 4000, 3800, 3650, 3500, 3400, 3200, 3100, 2950, 2850, 2800, 2600, 2450, 2300, 2150, 2000, 1900, 1750]) },
    { id: '150#1,5', h: 150, esp: 1.5, kgm: 5.56, garra: GARRA5, cap: linha(2000, [4800, 4600, 4400, 4300, 4100, 4000, 3800, 3650, 3500, 3450, 3300, 3200, 3100, 3000, 3000, 2800]) },
    { id: '150#1,8', h: 150, esp: 1.8, kgm: 6.67, garra: GARRA5, cap: linha(2600, [4650, 4500, 4300, 4200, 4000, 3900, 3800, 3700, 3600, 3350]) },
    { id: '150#2,0', h: 150, esp: 2.0, kgm: 7.42, garra: GARRA5, cap: linha(3100, [4400, 4250, 4150, 4000, 3750]) },
  ];

  // conjuntos CO cadastrados (desenho 0004.0001.02.001 REV.70) – perfil|comprimento → código
  const CO = { '80#1,5|2300': 'CO040012', '90#1,5|2300': 'CO040011', '100#1,5|2300': 'CO040010', '110#1,5|2300': 'CO040015', '130#1,5|2300': 'CO040003' };

  const perfil = (id) => PERFIS.find((p) => p.id === id) || null;
  const br = (v, d) => v.toFixed(d).replace('.', ',');
  const milhar = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // capacidade do par para o comprimento L: entre comprimentos tabelados usa o tabelado imediatamente MAIOR (a favor da segurança);
  // fora de 1100–3500 ou antes do início da linha do perfil → null (sem capacidade tabelada)
  function capacidade(p, L) {
    if (!p || L < TAB_MIN || L > TAB_MAX) return null;
    const ref = COMP.find((c) => c >= L);
    return p.cap[ref] != null ? p.cap[ref] : null;
  }

  function validarComprimento(L) {
    if (!Number.isFinite(L)) return 'Comprimento da longarina inválido.';
    if (L < L_MIN || L > L_MAX) return `Comprimento da longarina fora da faixa ${L_MIN}–${L_MAX} mm.`;
    if (L % PASSO) return `Comprimento da longarina deve ser múltiplo de ${PASSO} mm.`;
    return null;
  }

  // escolha automática: perfil mais leve com capacidade ≥ carga do par
  function escolher(L, cargaPar) {
    return PERFIS.find((p) => { const c = capacidade(p, L); return c != null && c >= cargaPar; }) || null;
  }

  // monta a longarina (perfil escolhido pelo app ou trocado pelo operador) com alertas e itens da lista de peças
  function montar(L, cargaPar, perfilId) {
    const erro = validarComprimento(L);
    if (erro) return { erro };
    const auto = escolher(L, cargaPar);
    const p = perfilId ? perfil(perfilId) : auto;
    if (perfilId && !p) return { erro: `Perfil de longarina desconhecido: ${perfilId}.` };
    const alertas = [];
    let usado = p;
    if (!usado) { // nenhum perfil atende: segue com o mais robusto que tenha capacidade nesse comprimento, marcado
      usado = [...PERFIS].reverse().find((x) => capacidade(x, L) != null) || PERFIS[0]; // fora da tabela: o mais leve, para o operador trocar
      alertas.push(capacidade(usado, L) == null
        ? 'SEM CAPACIDADE TABELADA – CONSULTAR ENGENHARIA (F 237 cobre 1100–3500 mm).'
        : `Nenhuma longarina da F 237 suporta ${milhar(cargaPar)} kg no par com ${L} mm – CONSULTAR ENGENHARIA.`);
    }
    const cap = capacidade(usado, L);
    if (p && cap == null) alertas.push('SEM CAPACIDADE TABELADA – CONSULTAR ENGENHARIA (F 237 cobre 1100–3500 mm).');
    else if (p && cap < cargaPar) alertas.push(`Longarina TB ${p.h} #${br(p.esp, 2)} suporta ${milhar(cap)} kg no par – carga informada ${milhar(cargaPar)} kg. CONSULTAR ENGENHARIA.`);
    const atencao = alertas.length > 0;
    const codigo = CO[`${usado.id}|${L}`] || 'CO04XXXX';
    const chapa = usado.h === 150 ? ` #${br(usado.esp, 2)}` : '';
    const desc = `PP LONG ${br(L / 1000, 2)} MT ${cap != null ? milhar(cap) + ' KG' : 'SEM CAP.'} TB ${usado.h}${chapa}`;
    const peso = usado.kgm * L / 1000 + 2 * usado.garra.kg;
    return {
      perfil: usado.id, auto: auto ? auto.id : null, trocado: !!perfilId && (!auto || perfilId !== auto.id),
      capacidade: cap, atencao, alertas,
      itens: [
        { codigo, desc: (atencao ? '⚠ ' : '') + desc, qtd: 1, pesoUnit: Math.round(peso * 1000) / 1000, cadastrado: codigo !== 'CO04XXXX', atencao },
        { codigo: PINO.codigo, desc: PINO.desc, qtd: 2 * PINO.porGarra, pesoUnit: 0 },
      ],
    };
  }

  const PPLongarina = { PERFIS, CO, GARRA3, GARRA5, PINO, L_MIN, L_MAX, PASSO, capacidade, escolher, montar, validarComprimento };
  if (typeof module !== 'undefined' && module.exports) module.exports = PPLongarina; else root.PPLongarina = PPLongarina;
})(typeof window !== 'undefined' ? window : this);
