// Testes do Porta-Palete (app/pp_engine.js + app/pp_desenho.js). Uso (a partir de drive-in/): node testes/pp_engine.js
'use strict';
const assert = require('assert'), path = require('path');
const APP = path.join(__dirname, '..', 'app');
global.window = {};
for (const f of ['catalogo.js', 'blocos.js', 'folha.js']) require(path.join(APP, f));
for (const [k, f] of [['Engine', 'engine.js'], ['DXF', 'dxf.js'], ['PPLongarina', 'pp_longarina.js'], ['PPEngine', 'pp_engine.js']]) global.window[k] = require(path.join(APP, f));
const D = require(path.join(APP, 'pp_desenho.js')), E = global.window.PPEngine, cat = global.window.CATALOGO;
let ok = 0;
const t = (nome, fn) => { fn(); ok++; console.log('OK  ', nome); };
const base = { coluna: '101', espessura: '2.0', frentePalete: 1000, profPalete: 1200, alturaPalete: 1200, cargaPalete: 1000, paletesNivel: 2, niveis: 4, modulos: 4, profQuadro: 1000 };
const qtd = (r, cod) => r.pecas.filter((p) => p.codigo === cod).reduce((s, p) => s + p.qtd, 0);

t('modulações das horizontais', () => {
  assert.deepStrictEqual(E.horizontais(5700, 'padrao').ys, [100, 1000, 1900, 2800, 3700, 4600, 5500]);
  assert.deepStrictEqual(E.horizontais(3000, 'zigzag').ys, [100, 700, 1300, 1900, 2500, 2900]);
  assert.deepStrictEqual(E.horizontais(5000, 'misto').ys.slice(0, 6), [100, 700, 1300, 1900, 2800, 3700]);
  const t1 = E.horizontais(6700, 'padrao'); assert.ok(t1.topo); const t2 = E.horizontais(6550, 'padrao'); assert.ok(!t2.topo); // des. 0004.0001.01.022
});
t('caso base: geometria, longarina e contagens', () => {
  const r = E.calcular(base, cat);
  assert.deepStrictEqual(r.erros, []);
  assert.strictEqual(r.longarina.L, 2300); assert.strictEqual(r.longarina.perfil, '90#1,5');
  assert.deepStrictEqual(r.niveis, [1400, 2800, 4200, 5600]); assert.strictEqual(r.dimensoes.altura, 5850); // último nível + 250
  assert.strictEqual(r.posicoes, 4 * 2 * 5); assert.strictEqual(r.colunas, 10);
  assert.strictEqual(qtd(r, 'CO040011'), 2 * 4 * 4); assert.strictEqual(qtd(r, 'INT1556'), 2 * 2 * 4 * 4);
  assert.strictEqual(qtd(r, 'CO040212'), 10); assert.strictEqual(qtd(r, 'SA041046'), 20); assert.strictEqual(qtd(r, 'INT0654'), 20);
});
t('fileira dupla dobra quadros e longarinas', () => {
  const r = E.calcular({ ...base, fileiras: 2 }, cat);
  assert.strictEqual(r.colunas, 20); assert.strictEqual(qtd(r, 'CO040011'), 64); assert.strictEqual(r.dimensoes.profundidade, 2300); // 2 × 1000 + 300 (padrão entre fileiras)
});
t('perfil trocado que não suporta → atenção na lista', () => {
  const r = E.calcular({ ...base, perfilLongarina: '80#1,5' }, cat), l = r.pecas.find((p) => p.grupo === 'Longarinas');
  assert.ok(l.atencao && l.desc.startsWith('⚠')); assert.ok(r.alertas.some((a) => a.includes('CONSULTAR ENGENHARIA')));
});
t('profundidade do quadro fora da regra → erro', () => {
  assert.ok(E.calcular({ ...base, profQuadro: 1225 }, cat).erros.length);
  assert.ok(E.calcular({ ...base, profQuadro: 550 }, cat).erros.length);
});
t('DXF e PDF-modelo sem NaN, com folha', () => {
  const r = E.calcular({ ...base, fileiras: 2 }, cat);
  const dd = { cliente: 'C', cidade: 'X', uf: 'MG', rt: '', desenhista: 'T', processo: 'P', revisao: 'REV-00', data: '01/01/2026', folha: '1/1', rev: { num: '00', por: 'T', data: '01/01/2026', alteracao: 'EMISSÃO' }, capTotal: '1', paletes: [], descricao: {} };
  const txt = D.dxf(r, 'A', dd);
  assert.ok(!/NaN|undefined|Infinity/.test(txt));
  const nomes = [...txt.matchAll(/\n0\nBLOCK\n8\n0\n2\n([^\n]+)/g)].map((m) => m[1]);
  assert.ok(nomes.length && nomes.every((n) => n.length <= 31));
  assert.ok(D.modelo(r, 'A', dd).items.some((it) => it.nome === 'FOLHA_A0_SUPRA'));
});
console.log(`\n${ok} testes OK`);
