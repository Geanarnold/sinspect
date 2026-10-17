# Porta-Palete – levantamento do catálogo (base → topo)

Registro das peças e regras do porta-palete, na ordem de montagem. Cada item vem de desenho SUPRA/Amapá (lido com a skill `extrair-desenho-supra`) ou de decisão do Gean. Ainda não há código no app: este documento é a base para o motor do PP.

Reaproveitado do Drive-In (Gean, 17/10/2026): colunas 80/101/122 (modelos, espessuras, SA por altura), tala de junção (emenda), travessas horizontais e diagonais e seus fixadores. A forma de amarração das travessas no PP terá variações (a definir).

## 1. Placas niveladoras (des. 0004.0001.03.057 REV.01, chapa ACO0066 #1,40)
| Código | Descrição | Coluna | Dimensão | Peso usado | Origem do peso |
|---|---|---|---|---|---|
| SA041046 | PP PLACA NIVELADORA 80 101 – MOD PERFIL "U" | 80 e 101 | 119 × 145 × 1,40 | **0,190 kg** | chapa cheia (desenho: 0,17 kg) – Gean |
| SA041045 | PP PLACA NIVELADORA 122 – MOD PERFIL "U" | 122 | 140 × 145 × 1,40 | **0,223 kg** | chapa cheia (peso em branco no desenho) – Gean |

Pendente: quantidade de placas por sapata.

## 2. Sapatas (des. 0004.0001.02.013 REV.01) – base #4,75 (ACO0557, des. 0004.0001.03.052) + perfil U #2,65 (des. 0004.0001.03.051)
| Código | Descrição | Base | Perfil U | Peso |
|---|---|---|---|---|
| CO040211 | PP SAPATA COLUNA 80 – PERFIL "U" | SA041043 (0,63 kg) | SA041040 | 0,83 kg |
| CO040212 | PP SAPATA COLUNA 101 – PERFIL "U" | SA041043 (0,63 kg) | SA041041 | 0,85 kg |
| CO040213 | PP SAPATA COLUNA 122 – PERFIL "U" | SA041044 (0,75 kg) | SA041042 | 0,99 kg |
| CO040262 | PP SAPATA COLUNA 90 – ESP DMA (especial) | SA041043 | SA041142 | 0,75 kg |

Base com 2 furos de chumbador; perfil U com furos oblongos para a coluna.

**Fixadores por sapata (COL 80, 101 e 122 – Gean, 17/10/2026):**
| Qtd | Código | Descrição |
|---|---|---|
| 2 | INT0648 | PARAFUSO 5/16" x 3/4" UNC ZNB (sapata → coluna) |
| 4 | INT0812 | ARRUELA LISA 5/16" 8,5 x 20 x 1,2 ZINC BRC |
| 2 | INT0650 | PORCA SEXTAVADA 5/16" ZINCADA |
| 2 | INT0654 | CHUMBADOR PBA 3/8" x 3.1/2" |

Pendente: placas niveladoras por sapata; se a sapata DMA entra no app.

Blocos de desenho recebidos (vista frontal, sapata montada com fixadores, layer 0, R2000): `blocos_dxf/PP_SAPATA_CO040211_COL80_FRONTAL.dxf`, `..._CO040212_COL101_...`, `..._CO040213_COL122_...` (base 119 mm nas COL 80/101, 140 mm na COL 122).

## Protetor de coluna em U (des. 0004.0001.03.053 REV.03, chapa ACO0017 #2,65) – para a etapa de protetores
| Código | Descrição | Peso |
|---|---|---|
| SA041072 | PP PERFIL "U" PROTETOR COLUNA | 1,384 kg |
| SA041150 | PP PERFIL "U" PROTETOR COLUNA – 400 mm PL | 1,817 kg |
| SA041080 | PP PERFIL "U" PROTETOR COLUNA – 450 mm PL | 1,990 kg |
| SA041100 | PP PERFIL "U" PROTETOR COLUNA – 600 mm PL | 2,691 kg |
