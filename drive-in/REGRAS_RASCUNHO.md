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

---

## 9. Dados de produto (decisão de arquitetura)

- Todos os dados de produto (aço, espessura, dimensões, peso usado, quantidade por conjunto, custo) ficam na aba **Produtos** de `catalogo/CATALOGO.xlsx`. O app lê dela; nenhum valor de produto é fixo no código, porque eles podem mudar.
- Sapatas: peso da **planilha** (1,25 / 1,30 / 1,35 / 1,65 kg), por decisão do responsável técnico. Base em 4,75 mm e perfil U em 2,65 mm, sempre Civil 300.
- Placa niveladora: COL 80 e 101 usam a mesma peça (SA041463, 155x155, 1,4 mm, 0,223 kg); COL 122 usa outra (SA041649, 155x160, 1,4 mm, 0,231 kg).
- Dados errados da planilha antiga são desconsiderados (não entram como regra).

---

## 10. Definições confirmadas e lembretes

- **Altura da estrutura:** medida da **parte inferior da sapata até o final do contraventamento superior**. A placa niveladora (2 × 1,4 mm, entre sapata e piso) é **desprezada** na altura.
- Sapata completa por coluna: 1 base + 1 perfil U + 2 placas niveladoras + 4 chumbadores (INT0654) + 4 parafusos (INT0648) + 4 porcas (INT0650) + 8 arruelas (INT0812).

### LEMBRETES (avisar o responsável técnico ao iniciar o código do app)
1. **COL 80:** sapata (CO) e perfil U (SA) ainda **sem código**. Decisão: seguem sem código por enquanto.
2. Altura da coluna sem SA cadastrado (COL 80 de 7550 a 8450 mm; COL 101 de 8550 a 9850 mm; demais alturas em amarelo na aba Colunas): o app deve exibir "SEM CÓDIGO".
3. Peças da estrutura ainda não levantadas: travessa, diagonais, braços, LG-UE, viga túnel, protetores.

---

## 11. Lateral (pórtico): travessas e diagonais (regras CONFIRMADAS)

Fonte: desenho 0004.0001.01.055 "PP LATERAL CABA 2,50 x 1,00 80 C ABA" (usado só para entender a geometria; não é cadastrado). Os valores das cotas A, B e C não vêm no PDF; só os rótulos.

- **Cota A:** largura da lateral (de fora a fora das colunas). `[CONFIRMAR]` se A = "espaçamento entre colunas" (D10 da planilha antiga).
- **Cota B:** centro a centro da furação da travessa horizontal. `B = A − 109,1 mm`.
- **Travessa horizontal, comprimento total:** `B + 30,5 mm` (= `A − 78,6 mm`).
- **Cota C:** centro a centro da diagonal. É a hipotenusa do triângulo formado por `B` (horizontal) e `V` (distância vertical, centro a centro, entre duas travessas horizontais): `C = √(B² + V²)`.
- **Diagonal, comprimento total:** `C + 30,5 mm`.
- **Cadastro (SA):** para cada travessa e diagonal calculada, procurar na tabela de SA do **mesmo modelo de montante (80/101/122, pelo nome)** o item de **cota mais aproximada**. Se não houver, marcar "SEM CÓDIGO" e informar a medida.

Comparação com a planilha antiga (A = 820, V = 900): travessa 741,4 mm (antes 736); diagonal 1177,4 mm (antes 1175,4).

`[CONFIRMAR]`: tolerância de aproximação para aceitar um SA existente; regra de posição vertical das travessas (valores de V); desenho/tabela de travessa e diagonal (aço, espessura, desenvolvimento).

### 11.1 Confirmações posteriores (travessa e diagonal)
- **A = largura total da lateral** (nome das peças em metros: "TRAVESSA HORIZONTAL 1,00" = lateral de 1000 mm).
- Tabela de SA: coluna A = centro a centro; coluna B = comprimento total (B = A + 30,5). Validado: A = largura − 109,1.
- **Tolerância ±3 mm** para aceitar um SA existente. Busca pelo **comprimento**, em todos os itens cadastrados (as diagonais de V = 600 só existem cadastradas como "ESP").
- **V entre horizontais:** padrão = primeiras 3 horizontais a 600 mm, a partir da 3ª a 900 mm. Pode ser alterado por projeto. `[CONFIRMAR]` se "3 primeiras" são 3 vãos (como na planilha antiga: 4 horizontais) ou 3 horizontais (2 vãos) e a altura da 1ª horizontal.
- Validação da regra C = √(B²+V²) contra o cadastro: nas 19 diagonais padrão, V implícito ≈ 900 mm (898,8 a 903,4; um caso em 907,5); a diagonal "1,00 ESP 1,08 MT" confere com V = 600.
- Peças soltas no BOM, nível SA. Item sem código no BOM: **"SAXXXX"**.
- Material de travessa e diagonal: ACO0602 SLITER FF 1,40 x 80 GI (kg/m teórico = 80 x 1,4 x 7,85e-6 x 1000 = 0,8792). O peso da tabela do SolidWorks **não é usado**.

### 11.2 Decisões de travessa/diagonal e padrão de códigos
- **Posição vertical das travessas horizontais (regra da planilha antiga, confirmada):** a 1ª horizontal a **100 mm** do pé da coluna; as 3 primeiras distâncias de **600 mm** (até 1900 mm); depois, de **900 mm** em 900 mm (padrão, alterável por projeto).
  - Nº de horizontais = `ROUNDUP(1 + (1900−100)/600 + (H−1900)/900)`.
  - Nº de diagonais = `ROUNDUP((1900−100)/600 + (H−1900)/900 − 1)` (um vão a menos que as horizontais: o vão de topo não leva diagonal).
  - H = altura da coluna (do pé da sapata ao contraventamento superior, placa desprezada).
- **Excluídos da busca de SA** (cadastro suspeito): horizontais `SA041091`, `SA041029` e `SA041443`. As 4 diagonais com V entre 903 e 907 mm ficam na busca (sinalizadas "CONFERIR"; o filtro de ±3 mm só as aceita se o comprimento calculado bater).
- **Códigos do ERP:** `PK000000`, `PA000000`, `CO000000`, `SA000000`. Sem cadastro no BOM: `SA04XXXX`, `COXXXXXX`, `PAXXXXXX` ou `PKXXXXXX` (isso significa que o item ainda não existe). Isso substitui o "SAXXXX" citado antes.

### 11.3 Fixadores da travessa horizontal e tubo complemento
A travessa horizontal é a mesma para as 3 colunas; mudam só os fixadores e o tubo complemento (por modelo de coluna). Por travessa horizontal (1 fixação em cada ponta):

| Coluna | Parafuso (2) | Porca (2) | Tubo complemento |
|---|---|---|---|
| 80 | INT0993 (5/16" x 2.1/2" ZNC) | INT0650 | SA040047 |
| 101 | INT0958 (GR2 5/16" x 3.1/4" zinc.) | INT0650 | SA040018 |
| 122 | INT0973 (5/16" x 4" ZNC) | INT0650 | SA040046 |

**Regra do nó (confirmada; vale para COL 80, 101 e 122):** em cada ponta da travessa horizontal, se chega uma diagonal **não** se usa tubo complemento. Logo, por travessa horizontal: `tubos = 2 − nº de diagonais que chegam a ela` (mín. 0): 0 tubos (chegam 2 diagonais), 1 tubo (chega 1) ou 2 tubos (não chega nenhuma).
Cada diagonal chega a duas travessas (a de baixo e a de cima do vão). Com N diagonais nos vãos 1..N: a 1ª e a (N+1)ª horizontais recebem 1 diagonal; da 2ª à N-ésima recebem 2; as demais, 0. Total de tubos por lateral = `2 × nº de horizontais − 2 × nº de diagonais` (ex.: 12 horizontais e 10 diagonais → 4 tubos).
Pendente: peso, aço e dimensões do tubo complemento; fixadores das diagonais.

### 11.4 Tubo complemento e fixação das diagonais (confirmado)
- Tubo complemento (desenho 0004.0001.03.010 REV.05), material TUB0134 tubo redondo Ø12,7 x 1,2 mm: COL 80 = 42 mm, 0,014 kg (SA040047); COL 101 = 62 mm, 0,021 kg (SA040018); COL 122 = 80 mm, 0,027 kg (SA040046). Peso do desenho.
- **Diagonais não recebem fixadores próprios:** são fixadas pelo mesmo parafuso da travessa horizontal.

---

## 12. Protótipo do configurador (`drive-in/app/`)
- `index.html` + `style.css` + `app.js` (interface, sem dependência externa) · `engine.js` (motor; roda no navegador e no Node) · `catalogo.js` (gerado do `CATALOGO.xlsx`).
- Abrir `index.html` no navegador. Para regenerar `catalogo.js` após editar o Excel: ver o script usado no commit (a automatizar).
- Implementado: colunas (SA por altura, kg/m), emenda, sapata completa, placa niveladora, travessas e diagonais (posições, SA ±3 mm), tubo complemento, parafusos das travessas; KPIs, lista de peças com códigos (provisório `SA04XXXX`), CSV, impressão, desenho esquemático (lateral, frontal, planta).
- Não implementado (pendências exibidas no app): braços, LG-UE, viga túnel, protetores, stop; posição da emenda por interferência; profundidade (passo vs largura total da lateral).

---

## 13. Leitura do projeto de referência `DRIVE_IN.dxf` (cortes A e B, vista lateral)

Fatos lidos do arquivo (não são decisões):
- Dois cortes, ambos com **altura B = 8800**, passo entre colunas **A1..A5 = 820** (eixo a eixo). Corte B: 5 passos (A = 4100, 6 colunas). Corte A: 6 passos (A = 4920, 7 colunas).
- A lateral é formada por **quadros de 2 colunas** (bloco "Montante Drive In", passo entre quadros 1640 = 2 × 820). Dentro do quadro: travessas horizontais + diagonais. **No vão entre quadros não há travessa nem diagonal**; só o elemento de topo.
- Corte A (6 passos, 7 colunas): 3 quadros + **1 coluna solteira** na ponta, ligada aos quadros por **"TRAVESSA UNIÃO"** em cada nível de horizontal (11 peças), **sem diagonal**. Isso confirma a regra da planilha: nº de passos par → coluna solteira; qtd de travessa união = horizontais − 1 (contando o topo).
- Horizontais (do pé da coluna): **100, 700, 1300, 1900, 2800, 3700, 4600, 5500, 6400, 7300, 8200** (11 peças por quadro). Cota C = 600 (1ª → 2ª horizontal). **Não há horizontal a 100 mm do topo**: a última fica no último passo de 900 que cabe (8200), e o vão 8200→8800 fecha com o elemento de topo.
- Topo: bloco **"Travessa Sup Drive In"** (layer Contraventamento) a 8800, uma peça por passo de 820, **inclusive nos vãos entre quadros** (blocos alternados: sobre o quadro / sobre o vão).
- Diagonais por quadro: 3 (vãos de 600) + 7 (vãos de 900) = **10**, todas no mesmo sentido (paralelas). Confirma `T110 = 10` da planilha. Vão de topo (8200→8800) sem diagonal.
- Coluna desenhada como **peça única de 8800** (sem emenda representada) com sapata e piso de concreto (bloco "Piso Concreto").
- Cotas com texto sobrescrito (A1..A5, A, B, C): o desenho é um gabarito cujas letras são preenchidas por tabela.
- Layers: `MONTANTE` (cor 170), `Contraventamento` (cor 9), `4 - TEXTO DE ESCALA E VISTA` (cor 2), `0`, `Defpoints`, `01 INUTILIZADO`.

Correções a aplicar no app a partir disso: (1) lateral = quadros de 2 colunas + coluna solteira quando passos par; vão entre quadros sem travessa/diagonal; (2) retirar a horizontal "a 100 mm do topo"; (3) elemento de topo por passo (todos os passos); (4) travessa união nos níveis da coluna solteira, sem diagonal.

### 13.1 Decisões aplicadas no app após o DXF
- Lateral = quadros de 2 colunas nos passos ímpares (1º, 3º, 5º…); nº **par** de espaços → **coluna solteira** no último passo, ligada por **travessa união** em cada nível de horizontal, sem diagonal ("união tripla").
- Espaços de profundidade informados pelo operador (1 a 30). Caixa "medidas diferentes": se marcada, informa A1..An; senão todos iguais. Cotas no desenho: A1..An, A (soma), B (altura), C (1ª→2ª horizontal).
- Última horizontal no último passo de 900 que cabe; vão até o topo fecha com o **elemento de topo**, 1 por passo (SA a definir). Diagonais todas no mesmo sentido.
- Profundidade = Σ passos + 1 coluna (sem o +100). `[CONFIRMAR]`
- Altura continua variável (fórmula + múltiplo de 50 + manual).
- Adiado pelo responsável técnico: vista lateral de vigas/longarinas, posição da emenda, demais elementos (contraventamento, viga túnel, protetor, sapata em detalhe).

### 13.2 Travessa união (coluna solteira) — desenho 0004.0001.02.011 REV.08
- Conjunto **CO** soldado: 1 "PP TRAVESSA x,xx MONTANTE TRIPLO COL n" + 1 "PP PERFIL TRAVAMENTO POSTERIOR COL n" (perfil que abraça a coluna: largura 84,6 / 106,6 / 126,6 para COL 80 / 101 / 122). Específica por coluna.
- Variantes cadastradas (aba "Travessa união"): COL 80: 0,70 (CO040458), 1,05 (CO040165), 1,08 (CO040425); COL 101: 0,76 (CO040755), 1,02 (CO040432), 1,03 (CO040356); COL 122: 1,02 (CO040543). Peso do desenho.
- Cotas lidas: 0,70 → 664,7 / 696,5; 0,76 → 760 / 791,8; 1,02 → 986 / 1017,8 (interna / total; diferença fixa 31,8). **A relação entre o nome (0,70 / 0,76 / 1,02), as cotas e o passo A da coluna solteira não é consistente e precisa ser definida** `[CONFIRMAR]`.
- Fixadores: 6× INT0648 + 6× INT0650 (só na folha 0,70 COL 80) `[CONFIRMAR para as demais]`.

### 13.3 Travessa união — regra confirmada
- Uma união por nível de travessa horizontal (acompanha as horizontais), sem diagonal.
- **Comprimento total = A1 − 69,8 mm** (A1 = passo da coluna solteira). Ex.: 820 → 750,2; 1025 → 955,2. Busca do CO no cadastro a ±3 mm; sem cadastro → `COXXXXXX`.
- **A coluna solteira fica sempre à esquerda** na vista lateral (1º passo = A1).
- Exportação DXF da vista lateral implementada (`app/dxf.js`): layers MONTANTE / Contraventamento / COTAS / texto, cotas A1..An, A, B, C e tabela de valores. Perfis reais (furos, blocos do gabarito) não são reproduzidos.

### 13.4 Blocos DI_* recebidos (DXF gerado com os desenhos reais)
- Recebidos: DI_COLUNA (1000 mm, furos Ø9 a cada 50 a partir de 54,75, fileira a 17,9 mm do eixo; eixo do bloco em x = 15, compensado no app), DI_TRAVESSA_H (furos c/c 714,5), DI_TRAVESSA_D (furos c/c 714,5 a 45°), DI_SAPATA (155 mm, chumbadores 80 mm abaixo da base), DI_PISO (trecho de 1000), DI_TOPO (775 mm, suposto para passo 820 `[CONFIRMAR]`), DI_UNIAO (modelo 1,02: furos em 15 e 971, chapa posterior em 1007,5). Coluna solteira = mesma coluna.
- `extrair_blocos.py` → `app/blocos.js` (primitivas flattenadas). `dxf.js` monta: coluna por altura (módulo de 50 replicado), travessa/diagonal esticadas pela distância entre furos, união ancorada nos furos das duas colunas, topo esticado por passo, sapata e piso.
- Travessas alinhadas aos furos: nível y → furo mais próximo (y + 4,75). Diagonal: furo inferior da coluna esquerda → furo superior da direita.
- Pendência: no desenho a união é ancorada nos furos (chapa posterior na coluna do quadro); a regra de comprimento para o BOM (A − 69,8) dá outro valor. `[CONFIRMAR]` qual cota é A − 69,8.
- **DI_TOPO (confirmado):** acompanha o comprimento do passo; há **dois modelos**: um para o passo da montante (dentro do quadro) e outro para o passo entre duas montantes. O app lista os dois separadamente por passo (SA e peso a informar). Passo da coluna solteira: tratado como "entre montantes" `[CONFIRMAR]`.

## 14. Cadastro de produtos no app
- Página "Cadastro de produtos" (`app/cadastro.js`): edita Produtos, Colunas (SA por altura e kg/m), Travessas, Diagonais, Travessa união e Composição. Salva no navegador (localStorage) e o configurador recalcula na hora. Exporta CSV por tabela e o catálogo inteiro em JSON; importa JSON; "Restaurar padrão" volta ao catálogo gerado do `CATALOGO.xlsx`.
- Atenção: o kg/m usado no cálculo das colunas é o da aba "Colunas: kg/m por espessura"; as linhas COL-* da aba Produtos são só referência.
- Fase com login/banco (Supabase): o mesmo cadastro passa a ser compartilhado entre usuários.

### 13.5 Medidas A1..An externas (face a face) — decisão do responsável técnico
- O operador informa medidas **externas**, não eixo a eixo. Conferido com o DRIVE_IN.dxf (posições das colunas batem ao 0,1 mm):
  - **quadro:** face externa da 1ª coluna até face externa da 2ª (eixo a eixo = A − 69,8);
  - **vão entre quadros:** vão livre entre faces (eixo a eixo = A + 69,8);
  - **coluna solteira:** face esquerda da solteira até face esquerda da 1ª coluna do quadro (eixo a eixo = A); vão livre = A − 69,8 = comprimento da união.
- **Profundidade = Σ A1..An** (sem coluna extra, sem +100). Ex.: 5 × 820 = 4100; 6 × 820 = 4920.
- 69,8 = largura da coluna na vista lateral (DI_COLUNA).
- Pendente: o bloco DI_TRAVESSA_H tem furos c/c 714,5 para A = 820 (= A − 105,5), e a regra/cadastro usa A − 109,1 (= 710,9). Diferença de 3,6 mm `[CONFIRMAR]`.

### 13.6 Decisões (02/10)
- Travessa horizontal: vale a **regra A − 109,1** (c/c dos furos) para lista e desenho; no desenho a travessa fica centrada no quadro.
- DI_TOPO: o 820 foi só o modelo; o bloco é esticado conforme cada espaço (quadro e entre quadros).
- Laterais = ruas + 1: **confirmado**.
- **Paletes por rua = ⌊ profundidade da estrutura ÷ (profundidade do palete + 25) ⌋**: o último palete termina dentro (≤) da profundidade. Ex.: palete 1000 → 1025; 900 → 925. O operador informa a profundidade do palete; paletes por rua deixou de ser entrada.
- Parafusos específicos da união e braços: depois.
- **Alertas de palete:** vermelho (erro) quando nº de paletes × (palete + 25) > profundidade, sem tolerância; amarelo quando sobra estrutura > 50 mm, informando a sobra. Campo opcional "Paletes por rua" para o operador conferir uma quantidade; em branco, o app usa o máximo que cabe.
- SA dos itens: tratado depois, na vista superior.

## 15. Braços — blocos
- Recebidos DI_BRACO_S180_COL80_ESQ e _DIR. O DIR é o **espelho exato** do ESQ (furos em ±22,5 / 15 e 165, Ø20; base no eixo da coluna) → o app gera o lado direito espelhando; basta enviar o ESQ.
- Guardado em `app/blocos.js` como `DI_BRACO_S180_COL80` (lado esquerdo).
- Um bloco por coluna (80/101/122) por modelo: S180, D180, S230, D230 → 12 blocos.
- **Regras dos braços (paletes padronizados):** simples nas montantes das pontas, duplo nas demais (o app lê "pontas" como as laterais externas da estrutura: 1ª e última; internas = duplo `[CONFIRMAR]`). Nível ≤ 2500 mm → braço 180; acima de 2500 o operador escolhe 180 ou 230. 1 braço por coluna por nível de armazenagem (níveis acima do chão). Fixadores por braço: 8× INT0648 (5/16" × 3/4"), 8× INT0650, 16× INT0812. Peso provisório = tabela da planilha antiga; SA a definir.
- Paletes especiais: tratados depois, em módulo próprio.

## 16. Vista frontal — leitura do Drawing1.dxf (referência)
- 3 ruas, colunas de 122 (cota "Modelo de coluna" = 122), **largura da rua 1900** (vão livre) → a largura da rua passa a ser entrada do operador (1400 era só a da planilha antiga).
- **1º braço = altura do palete + 100 mm** (cota 1454,9 com palete 1350), editável pelo operador. Demais níveis: + (palete + 200) = 1550.
- Braço **simples nas colunas externas** (voltado para dentro), **duplo nas internas** (bloco "Suporte Braço Duplo", 590 mm) → confirma a leitura de "pontas".
- Em cada nível e rua: "Bloco Longarina Fundo Drive In" (verde), com batentes nas pontas; no chão e no topo, a mesma peça mais longa.
- Topo de cada rua: "Travessa Sup Drive In" (1847 mm).
- Caneleira (protetor 700 mm) na base de todas as colunas.
- Contraventamento em zigue-zague ("Bloco Contraventamento ZigZag") nas ruas 2 e 3.
- Palete desenhado (bloco PALLET com atributos P4 / 600 kg) apoiado nos braços.
- **Colunas frontais recebidas** (DI_COLUNA_FRONTAL_80/101/122, com sapata): furação de 50 em 50 mm, replicada pelo app na altura do projeto (`colunaFrontal` em `dxf.js`). O arquivo da 122 veio com a geometria solta no model space (sem bloco nomeado) e a 101 com os furos num array interno; ambos foram normalizados (centro da sapata em x = 0, base em y = 0).
- Longarina superior (DI_LGTOPO): comprimento = largura da rua; ponto base no 3º furo de cima para baixo da coluna.

## 17. Vista frontal no app (1ª versão)
- Colunas frontais com sapata, caneleira 700 mm em todas as colunas, braços nos níveis (simples nas externas espelhado para dentro; duplo nas internas quando o bloco existir), longarina superior por rua no 3º furo de cima, piso, cotas (ruas, L, B, 1º braço, passo). Braço posicionado pelos furos (furos da coluna a 29,76 + 50k; furo inferior do braço a 15 mm da base).
- DXF exportado com as duas vistas lado a lado (lateral + frontal). Textos com acento gravados no padrão \U+XXXX do AutoCAD.
- BOM: caneleira (1 por lateral, 2,5 kg provisório) e longarina superior (1 por rua) `[CONFIRMAR quantidades]`.
- Blocos faltantes aparecem escritos no desenho (ex.: braços duplos, braços das colunas 101/122).
