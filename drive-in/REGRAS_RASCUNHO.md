# Regras de cálculo – Drive-In / Drive-Thru (RASCUNHO extraído da planilha)

Fonte: `SUPRA260407 – DIN MICA DISTRIBUIDORA – BLOCO A – REV.A.xlsm`, abas `DR-IN` e `DV THRU`.
Status: **extraído das fórmulas, NÃO validado por engenharia.** Cada item marcado `[CONFIRMAR]` precisa de decisão do responsável técnico antes de virar código.

Notação: `D6` etc. = célula de entrada da aba. Constantes de aço: 7,86e-6 kg/mm³ (algumas fórmulas usam 7,85e-6 — ver Inconsistências).

---

## 1. Entradas

| Célula | Entrada | DR-IN (ex.) | DV THRU (ex.) | Observação |
|---|---|---|---|---|
| D3 | Palete padrão PBR? | Sim | Sim | Se "Não" → resultado "Engenharia" (sem preço) |
| D4 | Tipo de coluna | AMPP122#2,25 | AMPP122#2,0 | Lista de 16 perfis (`catalogo/colunas.csv`) |
| D5 | Coluna solteira | **fórmula**: `ISEVEN(D6)` → SIM | idem | É saída disfarçada de entrada |
| D6 | Nº de espaçamentos (profundidade) | 5 | 7 | |
| D7 | Paletes por rua | 4 | 7 | |
| D8 | Níveis (chão + níveis) | 5 | 4 | |
| D9 | Nº de ruas | 1 | 10 | |
| D10 | Espaçamento entre colunas (mm) | 820 | 1325 | Vem de outro "formulário de dimensionamento" |
| D11 | Altura dos montantes (mm) | **fórmula** (DR-IN) | **fixo 6600** (DV) | Ver §2 |
| D12 | Largura da rua = 1400? | Sim | Sim | Se "Não" → "Engenharia" |
| D13 | Carga total do palete (kg) | 1000 | 1200 | Escolhe braço (≤1200 ou ≤1500) |
| D14 | Altura total do palete (mm) | 1600 | 1450 | |
| D15 | Altura 1º nível/chão (mm) | 2000 | 1550 | > 2005 → "Engenharia" |
| D16 | Qtde de conjuntos | 1 (fixo) | `D9+1` | DR-IN é digitado |
| D17 | Montantes por conjunto | `ROUNDUP(D6/2)` se D6 ímpar; senão `D6/2` | idem | |

## 2. Dimensões e posições (saída)

- **Altura do montante** (DR-IN): `D11 = D15 + (D8-2)*(D14+200) + 1400`. No DV THRU está digitado 6600; a mesma fórmula daria 6250. `[CONFIRMAR]`
- **Altura da estrutura** H6 = D11.
- **Largura** I6 = `D9*1400 + (D9+1)*L6` (L6 = largura da coluna: 80/101/122/160).
- **Profundidade** J6 = `D10*D6 + 100`. `[CONFIRMAR]` (+100 mm)
- **Posições de palete** = `D8*D9*D7`. DR-IN: 5×1×4 = 20. DV THRU: 4×10×7 = 280.
- **kg/posição** = peso total (com 8%) / posições.
- Limites que forçam "Engenharia": altura > 8500 mm, 1º nível > 2005 mm, palete não padrão, rua ≠ 1400.

⚠️ **Contradição**: D6 (espaçamentos) e D7 (paletes por rua) são entradas independentes e não são reconciliadas. DR-IN: 5 espaçamentos para 4 paletes; DV THRU: 7 e 7. Quem define profundidade é D6; quem define posições é D7. `[CONFIRMAR]` relação correta (ex.: espaçamentos = paletes + 1?).

## 3. Lista de peças (linhas 21–48)

`n` = D6 espaçamentos, `P` = D7 paletes/rua, `N` = D8 níveis, `R` = D9 ruas, `C` = D16 conjuntos, `M` = D17 montantes/conjunto, `S` = D5 (coluna solteira SIM/NÃO), `L` = largura da coluna, `E` = D10 espaçamento, `H` = D11 altura.

Convenção de peso unitário de perfil conformado: `(mm de chapa desenvolvida) × espessura × comprimento(mm) × 7,86e-6`.

| Linha | Peça | Quantidade | Comprimento / Peso unitário |
|---|---|---|---|
| 21 | Coluna (trecho até 8500) | `C*M*2` (+`C` se S=SIM) | `min(H,8500)`; kg/m do catálogo × m |
| 22 | Coluna (emenda > 8500) | igual à linha 21 se H>8500, senão 0 | `H-8500` |
| 23 | Travessa | `T105*(C*M)` (×2 se L=160) | `E-84`; kg/m fixo **T82 = 0,8913 kg/m** (perfil 81×1,4) |
| 24 | Diagonal | `T110*(C*M)` (×2 se L=160) | `√(900² + (E-105)²)+26`; mesmo kg/m T82 |
| 25 | Sapata | = linha 21 | do catálogo (1,25 / 1,3 / 1,35 / 1,65 kg) |
| 26 | Placa niveladora | 2 × linha 25 | 0,225 kg |
| 27 | Tala de junção | = linha 22 | do catálogo |
| 28 | Travessa coluna solteira | S=SIM: `(T105-1)*C`; senão 0 | tabela por espaçamento (`catalogo/travessa_coluna_solteira.csv`); espaçamento fora da tabela = 0 |
| 29 | Diagonal superior 1 | DR-IN: `R*M + M`; DV: `R*M` | `√(E² + 1400²)`, kg/m T82 |
| 30 | Diagonal superior 2 | S=NÃO: `(M-1)*R`; SIM: `n/2*R`; DR-IN ainda `+2(M-1)-2` | `√(E² + 1400²)` |
| 31 | Diagonal amarração fundo 1º nível | `R` | `√(1400² + D15²)` |
| 32 | Diagonal amarração fundo 2º nível | `R*(N-1)` | `√(1400² + (D14+100-300)²)` |
| 33 | LG-UE/80 contrav. superior | S=NÃO: `2M*R`; SIM: `(2M+1)*R` | 1400 mm; peso por fórmula de chapa 160×(1400-12)×1,5 + 2×(89,9×220×2,65) |
| 34 | LG-UE/80 contrav. fundo | DR-IN: `R*N`; DV: `N*P` (×2 se S=SIM) | idem |
| 35 | Viga túnel | `R*(N-1)*2` | DR-IN: `D6*E`; DV: `E+P*E-1000`; seção 174×1,5 (DV: 176×2) |
| 36 | Viga complemento túnel fundo | = linha 35 | DR-IN: `E`; DV: fixo 1060 |
| 37 | Braço simples 180 | ver §4 | catálogo `bracos.csv` |
| 38 | Braço duplo 180 | ver §4 | |
| 39 | Braço simples 230 | ver §4 | |
| 40 | Braço duplo 230 | ver §4 | |
| 41 | Protetor de coluna | DR-IN: `R`; DV: `R+1` | `E41 = J6-1025`; peso por fórmula de chapa 4,76 mm |
| 42 | Protetor caneleira | = linha 41 | 2,5 kg |
| 43 | Stop pallet | DR-IN: 0; DV: `A36` (ou ×2) | 1–2,5 kg |
| 44–48 | Parafusos, arruelas, franceses, chumbador, porcas | fórmulas por múltiplos das peças | **peso = 0** (só contagem) |

- Quantidade de travessas: `T104 = 1 + (1900-100)/600 + (H-1900)/900`, `T105 = ROUNDUP(T104)`. Diagonais: `T109 = (1900-100)/600 + (H-1900)/900 - 1`, `T110 = ROUNDUP(T109)`. Ou seja: passo de 600 mm até 1900 mm de altura, depois 900 mm. `[CONFIRMAR]`
- Espaçamento das travessas: `T79 = IF(U79>=380,1,0)`, sobra do passo de 600 mm sobre H. Não é usada nas linhas visíveis. `[CONFIRMAR]`

## 4. Braços (linhas 37–40)

Perfil do braço: chapa 1,5 mm; comprimento de chapa `AQ = AE102*(180|230 + L + 2,65 + 2,65)`, com `AE102 = (94+40+40+15)*1,03 = 194,7 mm` (chapa desenvolvida). Peso = `(AQ*1,5*7,85e-6) + (2,65*41208*7,85e-6)` (cantoneira lateral fixa). Existe uma segunda tabela (colunas V:Z) com pesos digitados à mão que **não** é a que alimenta as linhas 37–40 no DR-IN (usa `AM:AS`), mas **é** a usada no DV THRU (`X:Z`). Ver Inconsistências.

Seleção: se `D13 ≤ 1200` → tabela vão 1200, senão se `≤ 1500` → tabela vão 1500; a coluna (L) escolhe a linha (80/101/122/160). Carga > 1500 kg → resultado `#N/A` (não trata).

Quantidades (DR-IN):
- Simples 180: `(M*2*2 se S=NÃO, senão (2M+1)*2) - 6`
- Duplo 180: `(2M*(C-2) se S=NÃO, senão (2M+1)*(C-2)) + 12`
- Simples 230: `2M*(N-2)*2 - 18` (S=NÃO) ou `(2M+1)*(N-2)*2 - 18`
- Duplo 230: `(2M)*(N-2)*(C-2) + 36` (S=NÃO) ou `(2M+1)*(N-2)*(C-2) + 36`

## 5. Totais

- `K49 = ΣK21:L48` (soma pesos de estrutura).
- `K50 = K49 * 1,08` (**só DR-IN**; DV THRU: `K50 = K49`).
- Preços (R$/kg) todos zerados; coluna de preço mostra "ENGENHARIA" nas condições do §2.

---

## 6. Inconsistências e erros encontrados na planilha

1. **Correções manuais "de encaixe" nas quantidades do DR-IN**: `-6`, `+12`, `-18`, `+36`, `-2` nas linhas 30 e 37–40. Não têm justificativa e não existem no DV THRU. Indicam que a fórmula foi ajustada para bater com um projeto específico. **O DR-IN não é uma regra geral; é um caso calibrado.** Isso é a maior armadilha para o app.
2. **AMPP80#1,8 mm** (`U49`) usa espessura 2,0 na fórmula (`246*2*…`), pesando igual ao AMPP80#2,0. Deveria ser 3,48 kg/m.
3. **8% de fixadores** aplicado no DR-IN e ausente no DV THRU (~648 kg a menos).
4. **Constante de aço** 7,86e-6 em umas fórmulas e 7,85e-6 em outras.
5. **D11 (altura)**: fórmula no DR-IN, valor digitado no DV THRU.
6. **D6 vs D7** sem reconciliação (ver §2).
7. **D5** rotulada como entrada é fórmula (`ISEVEN(D6)`).
8. **Braços do DV THRU** usam tabela manual diferente da do DR-IN (2,4 kg vs 1,97 kg para o mesmo B230S122).
9. **Protetor de coluna** do DV THRU: `E41 = J6-1025` = 8350 mm para coluna de 6600 mm.
10. **Tabela de travessa coluna solteira** só cobre espaçamentos 684–1125 mm; fora disso a peça vale 0 sem erro.
11. **Carga > 1500 kg** nos braços retorna `#N/A`; sem tratamento.
12. **`W49`** usa `+26` mm no comprimento da diagonal e `-84`/`-105` na travessa: constantes sem origem documentada.

## 7. Perguntas para o responsável técnico

1. O que são os ajustes `-6 / +12 / -18 / +36 / -2`? Devem virar regra geral ou são do projeto original?
2. Relação correta entre nº de espaçamentos (D6) e paletes por rua (D7).
3. De onde vêm as constantes: 84, 105, 26, 900, 1400, 1900, 600, 200, 300, 1025, 100?
4. A altura do montante deve ser sempre calculada (`D15 + (N-2)*(D14+200) + 1400`) ou pode ser informada?
5. O 8% de fixadores vale para Drive-Thru também?
6. Regra de conjuntos: `C = R+1` (Drive-Thru) vale para Drive-In com várias ruas, ou é sempre 1?
7. Quais limites de altura, níveis, carga e perfil devem gerar alerta/recusa (além dos 3 já existentes)?
8. Qual constante de aço adotar (7,85 ou 7,86)?

---

## 8. Emenda de coluna (regras CONFIRMADAS pelo responsável técnico)

1. Altura da coluna em múltiplos de 50 mm; **máximo 8500 mm por peça** (cabine de pintura).
2. **No máximo UMA emenda por estrutura** (2 peças). Proibido 3 ou mais trechos (ex.: 5000+2000+3000 ou 8000+8000+8000).
3. Emenda com **2 talas SA040045** (0,448 kg cada, 0,896 kg por emenda). A tala fica **metade na coluna de baixo e metade na de cima**.
4. Fixadores por emenda: 16× INT0648, 16× INT0650, 32× INT0812 (8/8/16 por tala; 4 parafusos por metade de tala). Fixadores **sem peso**; custo unitário em aba própria (a criar).
5. **Posição da emenda**: desviar de interferência com braços e longarinas, mantendo-a **o mais alta possível** (estabilidade).
6. O código **SA da coluna define só altura + modelo (80/101/122)**; a espessura é escolhida pelo usuário.
7. Código SA de cada peça deve constar no BOM.

Pendente `[CONFIRMAR]`: altura da zona de interferência dos braços/longarinas ao redor da emenda; tabela de SA por altura; se o acréscimo de 8% permanece no peso total.
