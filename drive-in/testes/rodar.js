// Bateria de testes do Configurador Drive-In.
// Uso (a partir de drive-in/):
//   node testes/rodar.js              → roda todos os casos e compara com o gabarito (sai com erro se algo mudou)
//   node testes/rodar.js --atualizar  → grava o resultado atual como novo gabarito (só depois de conferir a mudança!)
//   node testes/rodar.js c02          → roda só os casos cujo id contém "c02"
// O que é conferido em cada caso:
//   1. cálculo (engine.js): dimensões, níveis, posições, erros/alertas e a lista de peças completa (código, qtd, compr., peso)
//   2. desenho (dxf.js): o DXF do projeto é gerado sem exceção, sem NaN/undefined, nomes de bloco ≤ 31 caracteres,
//      e o resumo (folhas, escalas, quantidade de blocos por tipo) bate com o gabarito
'use strict';
const fs = require('fs'), path = require('path');
const APP = path.join(__dirname, '..', 'app'), GAB = path.join(__dirname, 'gabarito');
global.window = {};
for (const f of ['catalogo.js', 'blocos.js', 'folha.js']) require(path.join(APP, f));
const Engine = require(path.join(APP, 'engine.js')); global.window.Engine = Engine;
const DXF = require(path.join(APP, 'dxf.js'));
const cat = Object.values(global.window).find((v) => v && v.colunas);
const CASOS = require('./casos.js');

const args = process.argv.slice(2), atualizar = args.includes('--atualizar'), filtro = args.find((a) => !a.startsWith('--'));
const r2 = (v) => (v == null ? null : Math.round(v * 1000) / 1000);

// campos da folha (o app monta isso em dadosFolha(); aqui um equivalente fixo, sem data, para o resultado não mudar com o dia)
const folhaDados = (lp) => (corte, i, n) => {
  const x = lp[i], F = x.r.frontal;
  return { cliente: 'CLIENTE TESTE', cidade: 'CIDADE', uf: 'MG', representante: '', rt: 'RT', desenhista: 'TESTE', processo: 'TESTE', revisao: 'REV-00', data: '01/01/2026', folha: `${i + 1}/${n}`,
    rev: { num: '00', por: 'TESTE', data: '01/01/2026', alteracao: 'EMISSÃO INICIAL' }, capTotal: `${x.r.posicoes} PALLETS`,
    paletes: [{ modelo: 'P01', larg: F.frentePalete, prof: x.r.planta.profPalete, alt: F.alturaPalete, peso: F.cargaPalete }],
    descricao: { bloco: `BLOCO ${corte}`, dims: '', empilhamento: '', carga: '', porRua: '', ruas: '', total: '' } };
};

function resumoDxf(txt) {
  const L = txt.split('\n'), ins = {}, textos = [], problemas = [];
  if (/NaN|undefined|Infinity/.test(txt)) problemas.push('DXF contém NaN/undefined/Infinity');
  for (let k = 0; k < L.length - 1; k++) {
    if (L[k] === '0' && L[k + 1] === 'INSERT') { let j = k + 2; while (j < L.length && L[j] !== '2') j += 2; const nome = L[j + 1] || ''; const tipo = nome.replace(/_.*/, '') === 'DI' ? nome.split('_').slice(0, 2).join('_') : nome; ins[tipo] = (ins[tipo] || 0) + 1; }
    if (L[k] === '2' && L[k - 1] === '0' && L[k - 2] !== undefined && L[k + 1] && L[k - 3] === 'BLOCK') { /* nome do bloco */ }
    if (L[k] === '0' && L[k + 1] === 'BLOCK') { let j = k + 2; while (j < L.length && L[j] !== '2') j += 2; const nome = L[j + 1] || ''; if (nome.length > 31) problemas.push(`bloco com nome > 31: ${nome}`); }
    if (L[k] === '1' && L[k - 1] !== undefined && /ESC\. 1\/|VISTA PARCIAL|RASCUNHO/.test(L[k + 1] || '')) textos.push(L[k + 1]);
  }
  return { tamanhoKB: Math.round(txt.length / 1024 / 10) * 10, inserts: Object.fromEntries(Object.entries(ins).sort()), textos: [...new Set(textos)].sort(), problemas };
}

// auditoria do DXF com o ezdxf (Python), se estiver instalado: abre o arquivo como o AutoCAD abriria e lista erros de estrutura
const { spawnSync } = require('child_process'), os = require('os');
let temEzdxf = null;
function auditoria(txt) {
  if (temEzdxf === null) temEzdxf = spawnSync('python3', ['-I', '-c', 'import ezdxf'], { encoding: 'utf8' }).status === 0;
  if (!temEzdxf) return null;
  const arq = path.join(os.tmpdir(), `drivein_teste_${process.pid}.dxf`); fs.writeFileSync(arq, txt);
  const r = spawnSync('python3', ['-I', '-c', 'import ezdxf,sys\nd=ezdxf.readfile(sys.argv[1]);a=d.audit()\nprint(len(a.errors))', arq], { encoding: 'utf8' });
  fs.unlinkSync(arq);
  if (r.status !== 0) return 'ezdxf não conseguiu abrir o DXF: ' + (r.stderr || '').trim().split('\n').pop();
  return Number(r.stdout.trim()) ? `auditoria ezdxf: ${r.stdout.trim()} erro(s)` : null;
}

function rodarCaso(c) {
  const r = Engine.calcular(c.inp, cat);
  const fixos = [Engine.AVISO_ESTRUTURAL, Engine.NOTA_RESPONSABILIDADE];
  const pesoTotal = r.pecas.reduce((s, p) => s + (p.pesoTotal || 0), 0);
  const out = {
    id: c.id, descricao: c.descricao, validado: !!c.validado,
    dimensoes: { largura: r2(r.dimensoes.largura), profundidade: r2(r.dimensoes.profundidade), altura: r.dimensoes.altura },
    niveis: r.frontal.niveis, posicoes: r.posicoes, paletesPorRua: r.paletesPorRua, pesoTotalKg: r2(pesoTotal),
    erros: r.erros, alertas: r.alertas.filter((a) => !fixos.includes(a)),
    pecas: r.pecas.map((p) => ({ grupo: p.grupo, codigo: p.codigo || '', desc: p.desc, qtd: p.qtd, compr: p.compr ?? null, pesoUnit: r2(p.pesoUnit) })),
  };
  let dxf;
  try {
    const txt = DXF.dxfProjeto([{ r, corte: 'A', qtd: 1 }], folhaDados([{ r, qtd: 1 }]));
    dxf = resumoDxf(txt);
    const a = auditoria(txt); if (a) dxf.problemas.push(a);
  } catch (e) { dxf = { problemas: ['exceção ao gerar o DXF: ' + e.message] }; }
  out.dxf = dxf;
  return out;
}

// comparação campo a campo, com mensagens legíveis
function diferencas(a, b, cam = '') {
  const d = [];
  if (JSON.stringify(a) === JSON.stringify(b)) return d;
  if (cam === 'pecas') {
    const k = (p) => `${p.grupo} | ${p.desc}`, ma = new Map(a.map((p) => [k(p), p])), mb = new Map(b.map((p) => [k(p), p]));
    for (const [kk, p] of ma) if (!mb.has(kk)) d.push(`peça removida: ${kk} (qtd ${p.qtd})`);
    for (const [kk, p] of mb) if (!ma.has(kk)) d.push(`peça nova: ${kk} (qtd ${p.qtd}, ${p.pesoUnit ?? '-'} kg)`);
    for (const [kk, p] of ma) { const q = mb.get(kk); if (q) for (const f of ['codigo', 'qtd', 'compr', 'pesoUnit']) if (JSON.stringify(p[f]) !== JSON.stringify(q[f])) d.push(`${kk}: ${f} ${p[f]} → ${q[f]}`); }
    return d;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
    for (const f of new Set([...Object.keys(a), ...Object.keys(b)])) d.push(...diferencas(a[f], b[f], cam ? `${cam}.${f}` : f));
    return d;
  }
  return [`${cam}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
}

let falhas = 0;
for (const c of CASOS.filter((x) => !filtro || x.id.includes(filtro))) {
  const atual = rodarCaso(c), arq = path.join(GAB, c.id + '.json');
  const prob = [...(atual.dxf.problemas || []), ...atual.erros.map((e) => 'erro de cálculo: ' + e)];
  if (atualizar) { fs.writeFileSync(arq, JSON.stringify(atual, null, 1) + '\n'); console.log(`gravado  ${c.id}${prob.length ? '  ⚠ ' + prob.join('; ') : ''}`); continue; }
  if (!fs.existsSync(arq)) { console.log(`SEM GABARITO  ${c.id}  (rode com --atualizar)`); falhas++; continue; }
  const gab = JSON.parse(fs.readFileSync(arq, 'utf8')), d = diferencas(gab, atual);
  if (!d.length && !prob.length) { console.log(`ok       ${c.id}   ${atual.posicoes} posições · ${atual.pesoTotalKg} kg`); continue; }
  falhas++;
  console.log(`MUDOU    ${c.id}`);
  for (const x of prob) console.log('   ⚠ ' + x);
  for (const x of d.slice(0, 40)) console.log('   - ' + x);
  if (d.length > 40) console.log(`   … mais ${d.length - 40} diferença(s)`);
}
if (!atualizar) { console.log(falhas ? `\n${falhas} caso(s) com diferença. Se a mudança foi intencional, confira e rode com --atualizar.` : '\nTodos os casos iguais ao gabarito.'); process.exit(falhas ? 1 : 0); }
