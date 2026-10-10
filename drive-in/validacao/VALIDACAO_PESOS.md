# Estudo de validação de pesos — App × Planilha F 379

Data: 10/10/2026. Participantes: Gean Arnold (engenharia) e Claude.
Status: **estudo em aberto**. Os pesos manuais abaixo **não estão no app** (retirados a pedido do Gean até refinar os dados).

Referência: planilha "F 379 - Planilha Levantamento de Peso DRIVE IN". As duas planilhas de validação (`validação_do_APP.xlsx` e `validação_do_APP2.xlsx`) **não ficam no repositório**: os valores usados estão transcritos aqui.
A planilha **não** é tomada como 100% correta; ela também tem erros (seção 4).

Reprodução: `node validacao/simular.js 1` ou `node validacao/simular.js 2` (a partir de `drive-in/`). O script usa o motor do app e soma os pesos manuais à parte.

---

## 1. Casos

| | Caso 1 | Caso 2 |
|---|---|---|
| Coluna | AMPP COL 122 #1,8 | AMPP COL 122 #2,25 |
| Palete | PBR 1200 (frente) × 1000 × 2000, 1600 kg | 1700 (frente) × 1200 × 1350, 600 kg |
| Ruas / largura da rua | 12 / 1400 | 63 / 1900 |
| Espaçamentos × passo | 4 × 1025 | 14 × 788 |
| Paletes por rua | 4 | 9 |
| Níveis (chão + níveis) | 3 | 7 |
| 1º nível | 2300 (app: 2301,75) | 1450 (app: 1451,75) |
| Altura dos montantes | 6900 | 10900 (coluna 8500 + 2400 com emenda) |
| Laterais (conjuntos) | 13 | 64 |
| Posições | 144 | 3.969 |
| Braço no app | C 94×40×15 #1,8, balanço 180/230, U 180 | idem |
| Longarina de túnel no app | U 100×38 #1,8 | idem |

## 2. Pesos manuais em estudo (Gean) — fora do app

| Peça | Valor informado | Observação |
|---|---|---|
| Travessa união | 2,06 kg/un | é a união 1,02 COL 122 (CO040543, 2,059). No caso 2 (passo 788) a planilha usa 1,591 kg |
| Topo DI_TOPO (2 modelos) | kg/m da travessa diagonal (0,879) × passo | aproximação |
| Sapata COL 122 | 1,294 kg/un | `[CONFIRMAR]` se é o conjunto (cadastro: 1,35) ou o Perfil U SA041652 |
| Stop palete | 2,5 kg/un | |
| Caneleira | 1,506 kg/un | planilha usa 2,5 |
| Guia palete ("Protetor coluna" na planilha) | 35,02 kg por montante | valor de uma guia de 3175 mm (11,03 kg/m). No caso 2 a planilha usa 10.344 mm e 109,34 kg (10,57 kg/m) |
| Fixadores | +2% sobre o total (antes 8%) | o app já conta os fixadores um a um; ou soma o peso real, ou aplica %, nunca os dois |

## 3. Comparação

### Caso 1 — planilha × app (pesos do cadastro)

| Item | Planilha (kg) | App (kg) | Diferença |
|---|---|---|---|
| Colunas | 1.900,4 | 1.891,7 | −8,7 |
| Travessas horizontais | 218,1 | 194,7 | −23,4 |
| Diagonais da lateral | 243,4 | 227,5 | −15,9 |
| Tubo complemento | — | 1,4 | +1,4 |
| Sapata + placa | 117,0 | 117,8 | +0,8 |
| Travessa união | 240,9 | 0 | −240,9 |
| Diagonais superiores | 83,5 | 67,9 | −15,6 |
| Amarração de fundo | 77,6 | 78,8 | +1,2 |
| LG-UE de topo | 206,5 | 192,9 | −13,6 |
| LG-UE de fundo | 124,7 | 77,2 | −47,5 |
| Viga túnel + complemento | 491,4 | 479,4 | −12,0 |
| Tala da longarina de túnel | — | 64,3 | +64,3 |
| Braços | 337,5 | 283,7 | −53,8 |
| Guia palete | 455,3 | 0 | −455,3 |
| Caneleira | 32,5 | 32,5 | 0 |
| Stop palete | 120,0 | 0 | −120,0 |
| **Total** | **4.648,9** | **3.709,7** | **−939,2 (−20,2%)** |

Com os pesos manuais da seção 2: app **4.556,4 kg** × planilha 4.648,9 → **−92,5 kg (−2,0%)**. Com 8%: 4.920,9 × 5.020,8.

### Caso 2 — planilha × app + pesos manuais

| Item | Planilha (kg) | App + manuais (kg) | Diferença |
|---|---|---|---|
| Colunas | 55.424,2 | 55.169,4 | −254,8 |
| Emenda de coluna | 655,7 | 860,2 | +204,5 |
| Travessas horizontais | 3.935,6 | 3.632,5 | −303,1 |
| Diagonais da lateral | 5.538,4 | 5.211,2 | −327,2 |
| Tubo complemento | — | 24,2 | +24,2 |
| Sapata + placa | 1.728,0 | 1.685,7 | −42,3 |
| Travessa união | 1.323,7 | 1.713,9 | +390,2 |
| Topo DI_TOPO | — | 620,7 | +620,7 |
| Diagonais superiores | 1.300,2 | 1.505,7 | +205,5 |
| Amarração de fundo | 723,6 | 909,2 | +185,6 |
| LG-UE de topo | 4.144,2 | 3.941,6 | −202,6 |
| LG-UE de fundo | 1.944,0 | 1.576,6 | −367,4 |
| PP Distanciador Centro | 1.896,7 | — | −1.896,7 |
| Viga túnel + complemento | 17.438,3 | 20.317,5 | +2.879,2 |
| Tala da longarina de túnel | — | 4.052,2 | +4.052,2 |
| Braços | 10.115,1 | 13.498,0 | +3.382,9 |
| Guia palete | 6.997,5 | 2.241,3 | −4.756,2 |
| Caneleira | 160,0 | 96,4 | −63,6 |
| Stop palete | 1.890,0 | 1.890,0 | 0 |
| **Total** | **115.215,3** | **118.946,2** | **+3.730,9 (+3,2%)** |
| **+2% fixadores** | **117.519,6** | **121.325,1** | **+3.805,5** |

App só com pesos do cadastro (caso 2): 112.597,7 kg (+2%: 114.849,7).
App com chapa #1,5 no C e na longarina de túnel (como a planilha): 107.822 kg (braços 12.039; túnel 16.990).

Leitura: os totais ficam perto por **compensação**. No caso 2 o app tem ~10,5 t a mais em uns itens e ~13 t a menos em outros. Bater no total não valida.

## 4. Erros encontrados na planilha

1. **Caso 2: diagonais superiores e amarração de fundo calculadas com rua de 1400**, sendo a rua 1900 (√(788² + 1400²) = 1606,5; √(1400² + 1450²) = 2015,6).
2. **Caso 2: braços sem o 1º nível** (linhas de 180 com quantidade 0) e duplos com 14 colunas por lateral (868/nível) em vez de 15 (930). Planilha 4.490 braços × app 5.760.
3. **Caso 1: quantidades de braço trocadas** ("duplo 180" = 10, "simples 230" = 55; o certo é 10 simples + 55 duplos por nível).
4. **Horizontais: planilha conta 1 a mais por quadro** (caso 1: 10 × app 9; caso 2: 14 × app 13), mas usa 9/13 na união e as diagonais (8/12) só fecham com 9/13 horizontais. Vem do arredondamento para cima da fórmula antiga.
5. **Caso 2: altura 10.950 no cabeçalho** (H6), montantes de 10.900.
6. **Profundidade com +100 mm** (4200 e 11132) — pendência antiga do app (soma dos passos + coluna, sem os +100).
7. **Tala da longarina de túnel não existe na planilha.** A "Tala de Junção" da planilha (0,683 kg) é a **emenda da coluna** (qtd 0 no caso 1; 960 no caso 2).
8. **Topo DI_TOPO não existe na planilha**, apesar de estar no desenho da lateral.

## 5. Decisões pendentes (ordem de peso no caso 2)

1. **Longarina de túnel** (~7 t entre tala e chapa): barra inteira de 10,2 m + complemento (planilha) ou barras ≤ 3000 com tala sobre o braço (regra atual do app)? Chapa #1,5 ou #1,8?
2. **PP Distanciador Centro** (1,9 t; 848 mm, #2,65, 2,470 kg; 768 un = 64 × 12): peça que o app não tem. O que é, onde vai, regra de quantidade.
3. **Guia palete** (até 7 t): peso por metro (10,57 ou 11,03 kg/m?) e comprimento (planilha 10.344 × app 9.850 "até o fim do 8º palete").
4. **Braços**: espessura padrão do C (planilhas usaram 2,25 no caso 1 e 1,5 no caso 2; app 1,8) e confirmar quantidade (todos os níveis, 15 colunas por lateral).
5. **LG-UE de fundo no nível do chão?** Planilha conta (36 / 441), app não (24 / 378).
6. **União por passo**: peso de cada modelo (caso 2: 1,591 kg para passo 788) e a regra de comprimento (cadastro 1017,8 × A − 69,8 = 955,2 no passo 1025).
7. **Pesos unitários divergentes**: coluna (planilha 4,237 × cadastro 4,218 kg/m no #1,8; 5,297 × 5,272 no #2,25), LG-UE de topo 1400 (3,442 × 3,215), placa niveladora (0,225 × 0,231), travessa (planilha 0,891 × app 0,879 kg/m; comprimento A − 84 × A − 78,6), emenda de coluna (planilha 1 × 0,683 por coluna; app 2 × 0,448).
8. **Longarinas de topo e fundo de 1900**: não cadastradas; app extrapola (4,171 kg) pela reta dos modelos 1350–1570. Planilha usa 4,385 (LG-UE #1,5).
9. **Fixadores**: 2% sobre o total ou peso real pela contagem do app.

## 6. Próximo passo sugerido

Responder 1 a 3 (são ~16 t das diferenças do caso 2), corrigir os erros 1–4 da planilha, e então lançar os pesos definitivos pelo cadastro (com senha → versão de catálogo registrada). Rodar `simular.js` de novo e atualizar este documento.

## 7. Alteração posterior (10/10/2026)
Suporte U passou a ter altura = A do C + 110 (Gean) e chapa padrão 2,65 editável. Com A = 94 o U fica com 204 mm (antes 180): braços do caso 1 sobem de 283,7 para 297,2 kg (app caso 1: 3.722,8 kg). As tabelas acima foram feitas com U 180.
