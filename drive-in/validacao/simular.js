// Reproduz os casos do estudo de validação de pesos (VALIDACAO_PESOS.md) com o motor do app.
// Uso (a partir de drive-in/):  node validacao/simular.js 1   |   node validacao/simular.js 2
// Pesos manuais em estudo NÃO estão no app: são somados aqui, à parte (bloco MANUAIS).
global.window = {};
const path = require('path'), dir = path.join(__dirname, '..', 'app');
require(path.join(dir, 'catalogo.js'));
const E = require(path.join(dir, 'engine.js'));
const cat = Object.values(window).find((v) => v && v.colunas);
const BASE = { balancoBaixo: '180', balancoAlto: '230', cA: '94', cB: '15', cC: '40', cD: '1.8', uA: '100', uB: '38', uE: '1.8', uAlt: '180', escravo: false };
const CASOS = {
  1: { ...BASE, coluna: '122', espessura: '1.8', ruas: '12', profPalete: '1000', paletesInformados: '4', niveis: '3', espacamentos: 4, largura: '1025', frentePalete: '1200', cargaPalete: '1600', alturaPalete: '2000', alt1Nivel: '2300', alturaManual: '6900', espacos: Array(4).fill(1025) },
  2: { ...BASE, coluna: '122', espessura: '2.25', ruas: '63', profPalete: '1200', paletesInformados: '9', niveis: '7', espacamentos: 14, largura: '788', frentePalete: '1700', cargaPalete: '600', alturaPalete: '1350', alt1Nivel: '1450', alturaManual: '10900', espacos: Array(14).fill(788) },
};
// pesos manuais em estudo (Gean, 10/10/2026) — kg por peça; topo = kg/m da travessa diagonal × passo
const MANUAIS = { UNIAO: 2.06, STOP: 2.5, CANELEIRA: 1.506, SAPATA_122: 1.294, GUIA: 35.02, KGM_DIAG: 0.8792 };
const caso = process.argv[2] || '1', inp = CASOS[caso];
const r = E.calcular(inp, cat);
const g = {}; let tot = 0;
for (const p of r.pecas) { if (p.pesoTotal == null) continue; g[p.grupo] = (g[p.grupo] || 0) + p.pesoTotal; tot += p.pesoTotal; }
console.log(`Caso ${caso}: H ${r.dimensoes.altura}, largura ${r.dimensoes.largura}, profundidade ${r.dimensoes.profundidade}, níveis ${JSON.stringify(r.frontal.niveis)}`);
for (const [k, v] of Object.entries(g)) console.log(k.padEnd(36), v.toFixed(1));
console.log('APP (pesos do cadastro)'.padEnd(36), tot.toFixed(1));
const q = (re) => r.pecas.filter((p) => re.test(p.id || '') || re.test(p.desc)).reduce((s, p) => s + p.qtd, 0);
const passo = Number(inp.largura);
const extra = q(/^UNIAO$/) * MANUAIS.UNIAO + q(/^TOPO-/) * MANUAIS.KGM_DIAG * passo / 1000 + q(/^STOP-PALETE$/) * MANUAIS.STOP
  + q(/^CANELEIRA$/) * (MANUAIS.CANELEIRA - 2.5) + q(/^SAP-122$/) * (MANUAIS.SAPATA_122 - 1.35) + q(/^TRILHO-GUIA$/) * MANUAIS.GUIA;
console.log('APP + pesos manuais'.padEnd(36), (tot + extra).toFixed(1), ' (+2%:', ((tot + extra) * 1.02).toFixed(1) + ')');
