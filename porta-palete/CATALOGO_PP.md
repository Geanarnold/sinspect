# Porta-Palete – levantamento do catálogo (base → topo)

Registro das peças e regras do porta-palete, na ordem de montagem. Cada item vem de desenho SUPRA/Amapá (lido com a skill `extrair-desenho-supra`) ou de decisão do Gean. Ainda não há código no app: este documento é a base para o motor do PP.

Reaproveitado do Drive-In (Gean, 17/10/2026): colunas 80/101/122 (modelos, espessuras, SA por altura), tala de junção (emenda), travessas horizontais e diagonais e seus fixadores. A forma de amarração das travessas no PP terá variações (a definir).

## 1. Placas niveladoras (des. 0004.0001.03.057 REV.01, chapa ACO0066 #1,40)
| Código | Descrição | Coluna | Dimensão | Peso usado | Origem do peso |
|---|---|---|---|---|---|
| SA041046 | PP PLACA NIVELADORA 80 101 – MOD PERFIL "U" | 80 e 101 | 119 × 145 × 1,40 | **0,190 kg** | chapa cheia (desenho: 0,17 kg) – Gean |
| SA041045 | PP PLACA NIVELADORA 122 – MOD PERFIL "U" | 122 | 140 × 145 × 1,40 | **0,223 kg** | chapa cheia (peso em branco no desenho) – Gean |

**2 placas niveladoras por sapata** (Gean, 17/10/2026): 80/101 → 2 × SA041046; 122 → 2 × SA041045.

## 2. Sapatas (des. 0004.0001.02.013 REV.01) – base #4,75 (ACO0557, des. 0004.0001.03.052) + perfil U #2,65 (des. 0004.0001.03.051)
| Código | Descrição | Base | Perfil U | Peso |
|---|---|---|---|---|
| CO040211 | PP SAPATA COLUNA 80 – PERFIL "U" | SA041043 (0,63 kg) | SA041040 | 0,83 kg |
| CO040212 | PP SAPATA COLUNA 101 – PERFIL "U" | SA041043 (0,63 kg) | SA041041 | 0,85 kg |
| CO040213 | PP SAPATA COLUNA 122 – PERFIL "U" | SA041044 (0,75 kg) | SA041042 | 0,99 kg |
| ~~CO040262~~ | PP SAPATA COLUNA 90 – ESP DMA (especial de cliente) | SA041043 | SA041142 | 0,75 kg – **fora do app** (Gean) |

Base com 2 furos de chumbador; perfil U com furos oblongos para a coluna.

**Fixadores por sapata (COL 80, 101 e 122 – Gean, 17/10/2026):**
| Qtd | Código | Descrição |
|---|---|---|
| 2 | INT0648 | PARAFUSO 5/16" x 3/4" UNC ZNB (sapata → coluna) |
| 4 | INT0812 | ARRUELA LISA 5/16" 8,5 x 20 x 1,2 ZINC BRC |
| 2 | INT0650 | PORCA SEXTAVADA 5/16" ZINCADA |
| 2 | INT0654 | CHUMBADOR PBA 3/8" x 3.1/2" |

**Base fechada (etapas 1 e 2).** Conjunto por coluna: 1 sapata + 2 placas niveladoras + os fixadores acima.

Blocos de desenho recebidos (vista frontal, sapata montada com fixadores, layer 0, R2000): `blocos_dxf/PP_SAPATA_CO040211_COL80_FRONTAL.dxf`, `..._CO040212_COL101_...`, `..._CO040213_COL122_...` (base 119 mm nas COL 80/101, 140 mm na COL 122).

## Protetor de coluna em U (des. 0004.0001.03.053 REV.03, chapa ACO0017 #2,65) – para a etapa de protetores
| Código | Descrição | Peso |
|---|---|---|
| SA041072 | PP PERFIL "U" PROTETOR COLUNA | 1,384 kg |
| SA041150 | PP PERFIL "U" PROTETOR COLUNA – 400 mm PL | 1,817 kg |
| SA041080 | PP PERFIL "U" PROTETOR COLUNA – 450 mm PL | 1,990 kg |
| SA041100 | PP PERFIL "U" PROTETOR COLUNA – 600 mm PL | 2,691 kg |

## 3. Colunas e tala de junção
Iguais às do Drive-In (COL 80/101/122, espessuras, SA por altura, peça máx. 8.500 mm, emenda) – Gean, 17/10/2026.

## 4. Quadro (lateral) – amarração
**Profundidade do quadro (Gean, 17/10/2026):** de 600 a 1.200 mm, de 50 em 50 mm (600, 650, …, 1.200), escolhida pelo operador; o ideal é o padrão, mas o cliente pode pedir outra medida dentro da faixa. Medida **face externa a face externa das colunas** (mesma convenção do A do Drive-In).

Travessa horizontal pela regra do DI (comprimento total = profundidade − 78,6 mm, SA cadastrado ±3 mm): com SA para 600, 700, 750, 800, 850, 900, 950, 1.000, 1.050 e 1.200; **sem SA para 650, 1.100 e 1.150** (sairiam SA04XXXX, peso pelo kg/m). A confirmar se a regra de comprimento do DI vale para o quadro do PP.

**Travessas do quadro (Gean, 17/10/2026):**
- Comprimento: mesma regra do DI (horizontal = profundidade − 78,6 mm; diagonal pelo c/c).
- 1ª horizontal a **100 mm** do piso.
- Diagonal em **Z** (uma por vão, alternando o sentido).
- Três modulações à escolha do operador:
  | Modulação | Horizontais (do piso) |
  |---|---|
  | **Padrão** | 100, depois de **900 em 900** |
  | **Zig-zag 600** | 100, depois de **600 em 600** em toda a altura |
  | **Misto** | 100, as **3 primeiras a 600 em 600**, depois **900 em 900** (é a regra atual do Drive-In) |
- Topo (Gean, 17/10/2026; vale para PP e Drive-In): se sobrarem **mais de 250 mm** de coluna acima da última horizontal da modulação, entra mais uma horizontal a **100 mm do topo**, **sem diagonal** no último vão.
- Conferido no desenho 0004.0001.01.022 REV.00 (PP LATERAL ALTURAS, quadros de 999 mm, modulação padrão 900, 2.000 a 8.500 mm de 50 em 50): 6.500/6.550/6.600/6.650 sem horizontal extra (sobra 100–250 mm); 6.700, 6.750 … 6.950 com horizontal extra no topo e o último vão sem diagonal (sobra 300–550 mm) → limite de 250 mm confirmado.

