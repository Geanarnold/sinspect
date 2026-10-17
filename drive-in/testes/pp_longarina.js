// Testes da longarina porta-palete (app/pp_longarina.js). Uso (a partir de drive-in/): node testes/pp_longarina.js
'use strict';
const assert = require('assert');
const LG = require('../app/pp_longarina.js');
let ok = 0;
const t = (nome, fn) => { fn(); ok++; console.log('OK  ', nome); };

t('capacidade bate com os CO de 2,30 m', () => {
  for (const [id, cap] of [['80#1,5', 1250], ['90#1,5', 2000], ['100#1,5', 2400], ['110#1,5', 2700], ['130#1,5', 3400]])
    assert.strictEqual(LG.capacidade(LG.PERFIS.find((p) => p.id === id), 2300), cap);
});
t('comprimento intermediário usa o tabelado maior', () => {
  const p = LG.PERFIS[0];
  assert.strictEqual(LG.capacidade(p, 2350), 1150); // = 2400
  assert.strictEqual(LG.capacidade(p, 1150), 3200); // = 1200
});
t('fora da tabela: sem capacidade', () => {
  assert.strictEqual(LG.capacidade(LG.PERFIS[0], 1050), null);
  assert.strictEqual(LG.capacidade(LG.PERFIS[0], 3550), null);
  assert.strictEqual(LG.capacidade(LG.PERFIS[2], 1200), null); // célula vazia na F 237 (TB 100 começa em 1300) → sem capacidade
});
t('escolha automática pega o mais leve que atende', () => {
  assert.strictEqual(LG.escolher(2300, 1250).id, '80#1,5');
  assert.strictEqual(LG.escolher(2300, 1251).id, '90#1,5');
  assert.strictEqual(LG.escolher(2700, 2000).id, '110#1,5');
});
t('CO cadastrado, nome e peso', () => {
  const r = LG.montar(2300, 1200);
  assert.strictEqual(r.itens[0].codigo, 'CO040012');
  assert.strictEqual(r.itens[0].desc, 'PP LONG 2,30 MT 1.250 KG TB 80');
  assert.strictEqual(r.itens[0].pesoUnit, 9.124); // 3,77 × 2,30 + 2 × 0,2265
  assert.deepStrictEqual([r.itens[1].codigo, r.itens[1].qtd], ['INT1556', 2]);
  assert.strictEqual(r.atencao, false);
});
t('sem CO cadastrado → CO04XXXX com peso calculado', () => {
  const r = LG.montar(2450, 1000);
  assert.strictEqual(r.itens[0].codigo, 'CO04XXXX');
  assert.strictEqual(r.itens[0].desc, 'PP LONG 2,45 MT 1.050 KG TB 80');
  assert.ok(Math.abs(r.itens[0].pesoUnit - (3.77 * 2.45 + 0.453)) < 0.001); // 9,690
});
t('TB 130 usa o kg/m da tabela (desenho 18% mais leve)', () => {
  assert.strictEqual(LG.montar(2300, 3400).itens[0].pesoUnit, Math.round((4.95 * 2.3 + 0.782) * 1000) / 1000);
});
t('operador troca para perfil que não suporta → alerta e marcação', () => {
  const r = LG.montar(2300, 2000, '80#1,5');
  assert.strictEqual(r.auto, '90#1,5');
  assert.ok(r.trocado && r.atencao && r.alertas[0].includes('CONSULTAR ENGENHARIA'));
  assert.ok(r.itens[0].desc.startsWith('⚠ '));
});
t('operador troca para perfil mais forte → sem alerta', () => {
  const r = LG.montar(2300, 1000, '110#1,5');
  assert.ok(r.trocado && !r.atencao);
});
t('fora de 1100–3500: desenha e pesa, sem capacidade', () => {
  const r = LG.montar(900, 500);
  assert.ok(r.atencao && r.alertas[0].startsWith('SEM CAPACIDADE TABELADA'));
  assert.strictEqual(r.itens[0].desc, '⚠ PP LONG 0,90 MT SEM CAP. TB 80');
});
t('carga acima de todas → alerta', () => {
  const r = LG.montar(3500, 5000);
  assert.ok(r.atencao && r.alertas[0].includes('Nenhuma longarina'));
});
t('validação de comprimento', () => {
  assert.ok(LG.montar(750, 100).erro);
  assert.ok(LG.montar(2325, 100).erro);
  assert.ok(LG.montar(5050, 100).erro);
});
console.log(`\n${ok} testes OK`);
