// Testes do Porta-Palete (app/pp_engine.js + app/pp_desenho.js). Uso (a partir de drive-in/): node testes/pp_engine.js
'use strict';
const assert = require('assert'), path = require('path');
const APP = path.join(__dirname, '..', 'app');
global.window = {};
for (const f of ['catalogo.js', 'blocos.js', 'blocos_pp.js', 'folha.js']) require(path.join(APP, f));
for (const [k, f] of [['Engine', 'engine.js'], ['DXF', 'dxf.js'], ['PPLongarina', 'pp_longarina.js'], ['PPEngine', 'pp_engine.js']]) global.window[k] = require(path.join(APP, f));
const D = require(path.join(APP, 'pp_desenho.js')), E = global.window.PPEngine, cat = global.window.CATALOGO;
let ok = 0;
const t = (nome, fn) => { fn(); ok++; console.log('OK  ', nome); };
const MOD = { paletesNivel: 2, frentePalete: 1000, alturaPalete: 1200, cargaPalete: 1000, niveis: 4 };
const corte = (extra = {}, mods = [MOD, MOD, MOD, MOD]) => ({ nome: 'A', qtd: 1, coluna: '101', espessura: '2.0', profPalete: 1200, profQuadro: 1000, ...extra, modulos: mods.map((m) => ({ ...m })) });
const qtd = (r, cod) => r.pecas.filter((p) => p.codigo === cod).reduce((s, p) => s + p.qtd, 0);
const dd = { cliente: 'C', cidade: 'X', uf: 'MG', rt: '', desenhista: 'T', processo: 'P', revisao: 'REV-00', data: '01/01/2026', folha: '1/1', rev: { num: '00', por: 'T', data: '01/01/2026', alteracao: 'EMISSÃO' }, capTotal: '1', paletes: [], descricao: {} };

t('modulações das horizontais', () => {
  assert.deepStrictEqual(E.horizontais(5700, 'padrao').ys, [100, 1000, 1900, 2800, 3700, 4600, 5500]);
  assert.deepStrictEqual(E.horizontais(3000, 'zigzag').ys, [100, 700, 1300, 1900, 2500, 2900]);
  assert.deepStrictEqual(E.horizontais(5000, 'misto').ys.slice(0, 6), [100, 700, 1300, 1900, 2800, 3700]);
  assert.ok(E.horizontais(6700, 'padrao').topo); assert.ok(!E.horizontais(6550, 'padrao').topo); // des. 0004.0001.01.022
});
t('módulos iguais: geometria, longarina e contagens', () => {
  const r = E.calcularCorte(corte(), cat), m = r.modulos[0];
  assert.deepStrictEqual(r.erros, []);
  assert.strictEqual(m.L, 2300); assert.strictEqual(m.perfil, '90#1,5');
  assert.deepStrictEqual(m.niveis, [1400, 2800, 4200, 5600]); assert.deepStrictEqual(r.colunasH, [5850, 5850, 5850, 5850, 5850]); // último nível + 250
  assert.strictEqual(r.posicoes, 4 * 2 * 5); assert.strictEqual(r.colunas, 10);
  assert.strictEqual(qtd(r, 'CO040011'), 2 * 4 * 4); assert.strictEqual(qtd(r, 'INT1556'), 2 * 2 * 4 * 4);
  assert.strictEqual(qtd(r, 'CO040212'), 10); assert.strictEqual(qtd(r, 'SA041046'), 20); assert.strictEqual(qtd(r, 'INT0654'), 20);
});
t('módulos diferentes: alturas digitadas, carga, túnel e coluna pelo vizinho mais alto', () => {
  const mods = [{ ...MOD, niveis: 2 }, { ...MOD, alturas: '1400 2800 4200', cargaPalete: 1300 }, { ...MOD, tunel: true, alturas: '2800; 4200', cargaPalete: 600 }];
  const r = E.calcularCorte(corte({}, mods), cat);
  assert.deepStrictEqual(r.erros, []);
  assert.deepStrictEqual(r.modulos.map((m) => m.perfil), ['90#1,5', '110#1,5', '80#1,5']); // 2000 / 2600 / 1200 kg no par
  assert.deepStrictEqual(r.colunasH, [3050, 4450, 4450, 4450]);
  assert.strictEqual(r.modulos[2].chao, false); assert.strictEqual(r.posicoes, 2 * 3 + 2 * 4 + 2 * 2);
  assert.ok(!r.alertas.some((a) => a.includes('túnel'))); // túnel sem peças especiais (Gean)
  assert.ok(E.calcularCorte(corte({}, [{ ...MOD, tunel: true }]), cat).erros.some((e) => e.includes('túnel'))); // túnel sem alturas
});
t('caixas de nível: vazio = calculado a partir do de baixo; N1 empurra os de cima', () => {
  const r = E.calcularCorte(corte({}, [{ ...MOD, niveis: 4, alturas: ['1000', '', '', '5000'] }, { ...MOD, niveis: 3, alturas: ['', '2000', ''] }, { ...MOD, tunel: true, niveis: 2, alturas: ['', ''] }]), cat);
  assert.deepStrictEqual(r.modulos[0].niveis, [1000, 2400, 3800, 5000]); assert.deepStrictEqual(r.modulos[0].digitado, [true, false, false, true]);
  assert.deepStrictEqual(r.modulos[1].niveis, [1400, 2000, 3400]);
  assert.ok(r.alertas.some((a) => a.startsWith('Módulo 1: do piso ao N1 (1000)'))); assert.ok(r.alertas.some((a) => a.startsWith('Módulo 2: entre N1 (1400) e N2 (2000)')));
  assert.ok(r.erros.some((e) => e.startsWith('Módulo 3 (túnel): informe a altura do 1º nível')));
  assert.ok(E.calcularCorte(corte({}, [{ ...MOD, niveis: 2, alturas: ['3000', '2000'] }]), cat).erros.some((e) => e.includes('N2 (2000 mm) tem de ser maior')));
});
t('altura de coluna editada só sobe', () => {
  const r = E.calcularCorte(corte({ alturasColunas: [6000, 5000, '', 0, 7020] }), cat);
  assert.deepStrictEqual(r.colunasH, [6000, 5850, 5850, 5850, 7050]);
  assert.ok(r.alertas.some((a) => a.startsWith('Coluna 2: altura editada 5000')));
});
t('fileira dupla dobra quadros e longarinas', () => {
  const r = E.calcularCorte(corte({ fileiras: 2 }), cat);
  assert.strictEqual(r.colunas, 20); assert.strictEqual(qtd(r, 'CO040011'), 64); assert.strictEqual(r.dimensoes.profundidade, 2300);
});
t('perfil trocado que não suporta → atenção na lista', () => {
  const r = E.calcularCorte(corte({}, [{ ...MOD, perfilLongarina: '80#1,5' }, MOD]), cat), l = r.pecas.find((p) => p.grupo === 'Longarinas' && p.atencao);
  assert.ok(l && l.desc.startsWith('⚠')); assert.ok(r.alertas.some((a) => a.startsWith('Módulo 1') && a.includes('CONSULTAR ENGENHARIA')));
});
t('profundidade do quadro fora da regra → erro', () => {
  assert.ok(E.calcularCorte(corte({ profQuadro: 1225 }), cat).erros.length);
  assert.ok(E.calcularCorte(corte({ profQuadro: 550 }), cat).erros.length);
});
t('verificação da coluna pela F 382', () => {
  const v = E.verificarColuna(80, '2.0', [1400, 2800, 4200], 3000, 4450, 1000);
  assert.strictEqual(v.hRef, 1400); assert.strictEqual(v.capacidade, 10780); assert.ok(v.ok);
  assert.strictEqual(E.verificarColuna(101, '2.25', [1150], 500, 2000, 1000).hRef, 1200); // h intermediário usa o tabelado maior
  assert.ok(!E.verificarColuna(80, '2.0', [1400, 2800, 4200], 15000, 4450, 1000).ok);
  assert.ok(E.verificarColuna(80, '2.0', [2800], 500, 3050, 1000).motivo.includes('2600'));
  assert.ok(E.verificarColuna(80, '2.65', [1400], 500, 1650, 1000).motivo); // COL 80 #2,65 fora da F 382
  // coluna interna: 1/4 do par por nível de cada vizinho → 8 níveis × 2600 × 2/4 = 10.400 kg > 8.865 kgf (h 1500)
  const r = E.calcularCorte({ ...corte({ coluna: '80', espessura: '1.8' }, [{ ...MOD, niveis: 8, cargaPalete: 1300, perfilLongarina: '130#1,5' }, { ...MOD, niveis: 8, cargaPalete: 1300, perfilLongarina: '130#1,5' }]) }, cat);
  assert.strictEqual(r.verifColunas[1].carga, 10400); assert.strictEqual(r.verifColunas[0].carga, 5200);
  assert.ok(r.alertas.some((a) => a.startsWith('COLUNA NÃO ATENDE (F 382) – coluna 2')));
});
t('DXF de vários cortes sem NaN, nomes de bloco ≤ 31, tala de junção acima de 8500', () => {
  const alto = E.calcularCorte(corte({ nome: 'B', coluna: '122', espessura: '2.65' }, [{ ...MOD, niveis: 7 }, MOD]), cat);
  assert.ok(alto.colunasH[0] > 8500 && qtd(alto, 'SA040045') > 0);
  const lista = [E.calcularCorte(corte({ fileiras: 2 }), cat), alto];
  const txt = D.dxfProjeto(lista, [dd, dd]);
  assert.ok(!/NaN|undefined|Infinity/.test(txt));
  const nomes = [...txt.matchAll(/\n0\nBLOCK\n8\n0\n2\n([^\n]+)/g)].map((m) => m[1]);
  assert.ok(nomes.length && nomes.every((n) => n.length <= 31) && nomes.some((n) => n.startsWith('PP_TALA_JUNCAO')));
  assert.strictEqual(D.projeto(lista, [dd, dd]).items.filter((it) => it.nome === 'FOLHA_A0_SUPRA').length, 2);
  const mods = [{ ...MOD, niveis: 2 }, MOD, { ...MOD, niveis: 3 }], rr = E.calcularCorte(corte({}, mods), cat); // quadros 3050 / 5850 / 4450
  assert.strictEqual(D.modelo(rr, 'A').textos.filter((x) => /^VISTA LATERAL CORTE A - QUADRO/.test(x.s)).length, new Set(rr.colunasH).size);
});
t('projeto SUPRA: tipos de módulo + planta (fileiras) definem quantidades e peças', () => {
  const p = { quadro: { coluna: '101', espessura: '2.0', profPalete: 1200, profQuadro: 1000, entreFileiras: 300 },
    tipos: [{ nome: 'A', modulo: MOD }, { nome: 'B', modulo: { ...MOD, cargaPalete: 1500 } }, { nome: 'TUNEL', modulo: { ...MOD, tunel: true, niveis: 2, alturas: ['2800', ''], compLongarina: 3000 } }],
    fileiras: [{ nome: 'F1', seq: [{ tipo: 'A', qtd: 5 }], corredor: 3000 }, { nome: 'F2', dupla: true, seq: [{ tipo: 'A', qtd: 3 }, { tipo: 'TUNEL', qtd: 1 }, { tipo: 'B', qtd: 2 }] }] };
  const P = E.calcularProjeto(p, cat);
  assert.deepStrictEqual(P.erros, []);
  assert.deepStrictEqual(P.tipos.map((t) => [t.nome, t.qtdModulos]), [['A', 11], ['B', 4], ['TUNEL', 2]]);
  assert.strictEqual(qtd(P, 'CO040212'), 6 * 2 + 7 * 2 * 2); // sapatas: quadros compartilhados entre módulos vizinhos
  assert.strictEqual(qtd(P, 'CO040011'), (5 + 3 * 2) * 2 * 4); // longarinas do tipo A: 2 por nível
  assert.ok(E.calcularProjeto({ ...p, fileiras: [{ nome: 'F9', seq: [{ tipo: 'Z', qtd: 2 }] }] }, cat).erros.some((e) => e.includes('"Z" não cadastrado')));
  const dd2 = [dd, { ...dd, folha: '2/2' }], txt = D.dxfPP(P, dd2);
  assert.ok(!/NaN|undefined|Infinity/.test(txt));
  assert.strictEqual(D.projetoPP(P, dd2).items.filter((it) => it.nome === 'FOLHA_A0_SUPRA').length, 2);
  assert.ok(D.planta(P).textos.some((x) => x.s === 'TUNEL 01'));
});
// nada pode sair da área útil da folha A0 (dentro da borda e à esquerda do carimbo) – Gean, 17/10/2026
t('folha A0: geometria e textos dentro da área útil (projeto pequeno e grande)', () => {
  const Fo = global.window.FOLHA, [bx0, by0, , by1] = Fo.borda, dd2 = [dd, { ...dd, folha: '2/2' }];
  const casos = [
    { quadro: { coluna: '80' }, tipos: [{ nome: 'A', modulo: MOD }], fileiras: [{ nome: 'F1', seq: [{ tipo: 'A', qtd: 4 }] }] },
    { quadro: { coluna: '122', espessura: '2.65' }, tipos: [{ nome: 'A', modulo: { ...MOD, niveis: 7 } }, { nome: 'B', modulo: { ...MOD, niveis: 5, paletesNivel: 3 } }, { nome: 'C', modulo: { ...MOD, niveis: 6, frentePalete: 1200 } },
      { nome: 'TUNEL', modulo: { ...MOD, tunel: true, niveis: 4, alturas: ['4000'], compLongarina: 3400 } }, { nome: 'D', modulo: { ...MOD, niveis: 3 } }],
    fileiras: Array.from({ length: 8 }, (_, i) => ({ nome: 'F' + (i + 1), dupla: i % 3 !== 0, seq: [{ tipo: 'A', qtd: 17 }, { tipo: 'TUNEL', qtd: 1 }, { tipo: 'B', qtd: 19 }, { tipo: 'C', qtd: 3 }], corredor: 3000 })) },
  ];
  for (const p of casos) {
    const m = D.projetoPP(E.calcularProjeto(p, cat), dd2), pts = [];
    for (const q of m.prims.concat(m.linhas)) for (const v of q.p || [q.c]) pts.push(v);
    for (const fo of m.items.filter((it) => it.nome === 'FOLHA_A0_SUPRA')) {
      const S = fo.esc, x0 = fo.x + bx0 * S, xc = fo.x + Fo.carimbo_x * S, y0 = fo.y + by0 * S, y1 = fo.y + by1 * S, naFolha = (x) => x >= x0 - 1 && x <= fo.x + Fo.borda[2] * S + 1;
      for (const [x, y] of pts) if (naFolha(x)) assert.ok(x >= x0 && x <= xc && y >= y0 && y <= y1, `ponto fora da área útil: ${Math.round(x)}, ${Math.round(y)}`);
      for (const tx of m.textos) {
        if (!naFolha(tx.x) || String(tx.l).startsWith('FOLHA') || tx.rot) continue;
        const w = String(tx.s).length * tx.h * 0.85, xa = tx.just === 1 ? tx.x - w / 2 : tx.just === 2 ? tx.x - w : tx.x;
        assert.ok(xa >= x0 && xa + w <= xc && tx.y >= y0 && tx.y + tx.h <= y1, `texto fora da área útil: ${tx.s}`);
      }
    }
  }
});
console.log(`\n${ok} testes OK`);
