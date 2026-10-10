// Casos de referência da bateria de testes (testes/rodar.js).
// Cada caso = as mesmas entradas do formulário do app. O resultado aprovado de cada um fica em testes/gabarito/<id>.json.
// ATENÇÃO: o gabarito inicial foi gravado a partir do app em 10/10/2026 e AINDA NÃO FOI VALIDADO pela engenharia
// (pesos/códigos em estudo — ver validacao/VALIDACAO_PESOS.md). Ele serve para detectar QUALQUER mudança de resultado
// entre versões; quando o Gean validar um caso, marcar "validado" abaixo.
const BRACO = { balancoBaixo: '180', balancoAlto: '230', cA: '94', cB: '15', cC: '40', cD: '1.8', espU: '2.65', uA: '100', uB: '38', uE: '1.8' };
const esp = (n, a) => Array(n).fill(a);

module.exports = [
  { id: 'c01_col122_12ruas_pbr', descricao: 'Validação 1 (planilha F379): COL 122 #1,8, 12 ruas, 4 espaços de 1025 (solteira), 3 níveis, palete PBR 1200x1000x2000 1600 kg, altura 6900', validado: false,
    inp: { ...BRACO, coluna: '122', espessura: '1.8', ruas: '12', niveis: '3', espacamentos: 4, largura: '1025', espacos: esp(4, 1025), frentePalete: '1200', profPalete: '1000', alturaPalete: '2000', cargaPalete: '1600', alt1Nivel: '2300', alturaManual: '6900', paletesInformados: '4', escravo: false } },
  { id: 'c02_col122_63ruas_rua1900', descricao: 'Validação 2 (planilha F379 REV.01): COL 122 #2,25, 63 ruas, 14 espaços de 788, 7 níveis, palete 1700x1200x1350 600 kg, altura 10900 (emenda)', validado: false,
    inp: { ...BRACO, coluna: '122', espessura: '2.25', ruas: '63', niveis: '7', espacamentos: 14, largura: '788', espacos: esp(14, 788), frentePalete: '1700', profPalete: '1200', alturaPalete: '1350', cargaPalete: '600', alt1Nivel: '1450', alturaManual: '10900', paletesInformados: '9', escravo: false } },
  { id: 'c03_col80_3ruas_impar', descricao: 'COL 80 #1,8, 3 ruas, 3 espaços de 1025 (sem solteira), 4 níveis, PBR 1200x1000x1500 1000 kg, altura calculada', validado: false,
    inp: { ...BRACO, coluna: '80', espessura: '1.8', ruas: '3', niveis: '4', espacamentos: 3, largura: '1025', espacos: esp(3, 1025), frentePalete: '1200', profPalete: '1000', alturaPalete: '1500', cargaPalete: '1000', escravo: false } },
  { id: 'c04_col80D_duplada', descricao: 'COL 80 duplada #2,0, 6 ruas, 2 espaços de 1025 (solteira), 3 níveis, PBR 1200x1000x1600 1200 kg', validado: false,
    inp: { ...BRACO, coluna: '80D', espessura: '2.0', ruas: '6', niveis: '3', espacamentos: 2, largura: '1025', espacos: esp(2, 1025), frentePalete: '1200', profPalete: '1000', alturaPalete: '1600', cargaPalete: '1200', escravo: false } },
  { id: 'c05_col101_escravo', descricao: 'COL 101 #2,25, 8 ruas, 5 espaços de 1025, 4 níveis com palete escravo no chão, PBR 1200x1000x1300 900 kg', validado: false,
    inp: { ...BRACO, coluna: '101', espessura: '2.25', ruas: '8', niveis: '4', espacamentos: 5, largura: '1025', espacos: esp(5, 1025), frentePalete: '1200', profPalete: '1000', alturaPalete: '1300', cargaPalete: '900', escravo: true } },
  { id: 'c06_col101_espacos_diferentes', descricao: 'COL 101 #1,8, 5 ruas, espaços diferentes (1025/788/1025/788), 3 níveis, palete 1000x1200x1400 800 kg, C 2,25, balanço 200/230', validado: false,
    inp: { ...BRACO, cD: '2.25', balancoBaixo: '200', coluna: '101', espessura: '1.8', ruas: '5', niveis: '3', espacamentos: 4, largura: '1025', espacos: [1025, 788, 1025, 788], frentePalete: '1000', profPalete: '1200', alturaPalete: '1400', cargaPalete: '800', escravo: false } },
];
