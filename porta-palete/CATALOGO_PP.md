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
- **Chapa da travessa diagonal** (Gean, 17/10/2026): padrão **#1,40** (como no desenho); opções **0,85 / 1,20 / 1,40 / 1,80 mm** escolhidas pelo operador. Vale para **horizontal e diagonal**, no **PP e no DI**; sliter mantém **80 mm**; o **SA se mantém** e a chapa sai na descrição da lista de peças (Gean). Aplicado no DI em 17/10/2026 (campo "Chapa das travessas", etapa Lateral; peso = 80 × chapa × 7,85 kg/m·mm). Zig-zag de topo e de fundo: chapa própria, mesmas opções (campo "Chapa do zig-zag", padrão #1,40), SA mantido e chapa na descrição (Gean, 17/10/2026).
- Três modulações à escolha do operador:
  | Modulação | Horizontais (do piso) |
  |---|---|
  | **Padrão** | 100, depois de **900 em 900** |
  | **Zig-zag 600** | 100, depois de **600 em 600** em toda a altura |
  | **Misto** | 100, as **3 primeiras a 600 em 600**, depois **900 em 900** (é a regra atual do Drive-In) |
- Topo (Gean, 17/10/2026; vale para PP e Drive-In): se sobrarem **mais de 250 mm** de coluna acima da última horizontal da modulação, entra mais uma horizontal a **100 mm do topo**, **sem diagonal** no último vão.
- Conferido no desenho 0004.0001.01.022 REV.00 (PP LATERAL ALTURAS, quadros de 999 mm, modulação padrão 900, 2.000 a 8.500 mm de 50 em 50): 6.500/6.550/6.600/6.650 sem horizontal extra (sobra 100–250 mm); 6.700, 6.750 … 6.950 com horizontal extra no topo e o último vão sem diagonal (sobra 300–550 mm) → limite de 250 mm confirmado.
- Aplicada no motor (DI e base do PP) em 17/10/2026: a horizontal de topo **não leva travessa união** na coluna solteira (orçamento Zanotti: 400 uniões = 10 por lateral). Zanotti após a regra: app 58.767 kg × orçamento 58.724 kg (+0,07%).


## 5. Travamentos (horizontal, superior, contraventamento posterior)
Pendente – adiado (Gean, 17/10/2026): seguir antes para as longarinas; os travamentos dependem da configuração final (altura, módulos, fileira dupla).

## 6. Longarinas
Em andamento – dados extraídos dos desenhos; falta tabela de capacidade (carga por par × vão) e a lista de comprimentos padrão.

### 6.1 Longarina simples (des. 0004.0001.02.001 REV.70) – conjunto CO = 2 perfis + 2 garras
| Modelo | Comprimento | Carga (par) | Código CO | Peso CO (kg) | Perfil (2×) | kg/perfil | Garras |
|---|---|---|---|---|---|---|---|
| TB 80 | 2,30 m | 1.250 kg | CO040012 | 9,249 | SA040012 | 4,398 | SA040008 (3 encaixes) 0,226/0,227 |
| TB 90 | 2,30 m | 2.000 kg | CO040011 | 10,441 | SA040010 | 4,829 | SA040006 (5 encaixes) 0,391 |
| TB 100 | 2,30 m | 2.400 kg | CO040010 | 10,777 | SA040040 | 4,997 | SA040006 |
| TB 110 | 2,30 m | 2.700 kg | CO040015 | 11,197 | SA040048 | 5,207 | SA040006 |
| TB 130 | 2,30 m | 3.400 kg | CO040003 | 10,041 | sem SA (–) | 4,629 | SA040006 |
| TB 150 #1,50 | 1,20 m | 7.200 kg | CO040626 | 8,778 | SA040107 | 9,490 (?) | SA040006 |
| TB 170 | 4,00 m | 3.600 kg | CO040205 | 17,305 | SA041030 | – | SA040006 |

### 6.2 Longarina com cadeirinha (des. 0004.0001.02.002 REV.36) – 2 perfis + perfil "CAD" + 2 garras
| Modelo | Código CO | Peso CO (kg) | Perfil (2×) | Perfil CAD / apoio |
|---|---|---|---|---|
| CAD MDP 2,00 m 1.600 kg TB 80 | CO040210 | 9,840 | SA040226 (3,822) | SA041038 (1,742) |
| CAD MDP 2,10 m 2.400 kg TB 90 | CO040138 | 16,019 | SA040010 (4,829) | SA040022 (2,011) |
| CAD PL MET 2,30 m 2.400 kg TB 100 | CO040086 | 12,787 | SA040040 (4,997) | SA040022 (2,011) |
| CAD PL MET 2,30 m 2.700 kg TB 110 | CO040043 | 13,193 | SA040048 (5,207) | SA040022 (2,011) |
| CAD PL MET 2,30 m 3.400 kg TB 130 | CO040007 | 12,051 | SA040011 | SA040022 |
| CAD PL MET 3,40 m 3.000 kg TB 150 | CO040284 | 22,744 | SA040210 | SA040855 |
| CAD PL MET 2,30 m 4.300 kg TB 150-E | CO040732 | 18,173 | SA040238 | SA040022 |
| CAD PL MET 1,20 m 4.800 kg TB 150-E | CO040731 | 9,815 | SA041805 | SA040030 |

### 6.3 Regras definidas (Gean, 17/10/2026)
- Comprimento livre de **800 a 5000 mm, passo 50 mm**; cada comprimento tem sua capacidade (tabela carga × vão por TB – a receber).
- Comprimento sem CO cadastrado → código **CO04XXXX** (pendente de cadastro), peso calculado pela regra abaixo.
- Nome = comprimento + capacidade + altura: `PP LONG 2,30 MT 1.250 KG TB 80`.
- Sai como conjunto **CO**; acrescentar pino de segurança **INT1556 GRAMPO LONGARINA PORTA PALETE** (quantidade por longarina a confirmar).

### 6.4 Geometria (blocos DXF frontais TB 80 e TB 110, em `blocos_dxf/`)
- Comprimento nominal = externo das garras (2299,3 ≈ 2300); perfil = nominal − 9 mm (2291).
- Altura do perfil desenhada = TB − 3,5 (TB 80 → 76,5; TB 110 → 106,5); garra de 3 encaixes = 150 mm de altura, de 5 encaixes = 250 mm (passo 50).
- Peso por metro do perfil (peso SA ÷ 2,291 m): TB 80 1,920 · TB 90 2,108 · TB 100 2,181 · TB 110 2,273 · TB 130 2,020 kg/m.
- Regra proposta para comprimento sem CO: peso = 2 × kg/m × (L − 9 mm) + 2 garras.

### 6.5 Capacidade – F 237 rev.006 (21/10/2024) – longarina tubo, carga admissível no PAR (kg), aço COS CIVIL 300, flecha < L/200
Colunas = comprimento da longarina (mm). Conector de 3 dentes só para TB 80 #1,5.
| Tubo | kg/m | 1100 | 1200 | 1300 | 1400 | 1500 | 1600 | 1700 | 1800 | 1900 | 2000 | 2100 | 2200 | 2300 | 2400 | 2500 | 2600 | 2700 | 2800 | 2900 | 3000 | 3100 | 3200 | 3300 | 3400 | 3500 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 80#1,5 | 3.77 | 3400 | 3200 | 2900 | 2700 | 2550 | 2400 | 2250 | 2050 | 1800 | 1650 | 1500 | 1350 | 1250 | 1150 | 1050 | 950 | 900 | 800 | 750 | 700 | 650 | 600 | 550 | 550 | 500 |
| 90#1,5 | 4.15 | 4400 | 4000 | 3750 | 3500 | 3300 | 3100 | 2900 | 2800 | 2600 | 2500 | 2350 | 2150 | 2000 | 1800 | 1650 | 1500 | 1400 | 1300 | 1200 | 1150 | 1050 | 1000 | 900 | 850 | 800 |
| 100#1,5 | 4.33 | – | – | 4200 | 3900 | 3700 | 3450 | 3250 | 3100 | 2950 | 2800 | 2650 | 2550 | 2400 | 2200 | 2000 | 1850 | 1700 | 1600 | 1500 | 1400 | 1300 | 1200 | 1150 | 1050 | 1000 |
| 110#1,5 | 4.48 | – | – | – | 4250 | 3950 | 3750 | 3550 | 3400 | 3200 | 3050 | 2900 | 2750 | 2700 | 2550 | 2400 | 2150 | 2000 | 1850 | 1700 | 1600 | 1500 | 1400 | 1300 | 1250 | 1150 |
| 130#1,5 | 4.95 | – | – | – | – | 4950 | 4650 | 4400 | 4200 | 4000 | 3800 | 3650 | 3500 | 3400 | 3200 | 3100 | 2950 | 2850 | 2800 | 2600 | 2450 | 2300 | 2150 | 2000 | 1900 | 1750 |
| 150#1,5 | 5.56 | – | – | – | – | – | – | – | – | – | 4800 | 4600 | 4400 | 4300 | 4100 | 4000 | 3800 | 3650 | 3500 | 3450 | 3300 | 3200 | 3100 | 3000 | 3000 | 2800 |
| 150#1,8 | 6.67 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 4650 | 4500 | 4300 | 4200 | 4000 | 3900 | 3800 | 3700 | 3600 | 3350 |
| 150#2,0 | 7.42 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 4400 | 4250 | 4150 | 4000 | 3750 |

Peso da tabela = kg/m × comprimento (longarina inteira, 1 tubo = 2 perfis "C" do desenho). Confere com os CO dentro de ~2%, **exceto TB 130**: tabela 4,95 kg/m × desenho 4,04 kg/m (−18%).

### 6.6 Capacidade – F 246 rev.001 – longarina tubo com cadeirinha (par, kg) × distância interna entre montantes; letra = modelo de transversina (C = Metalon 30×50 #1,2; D = perfil longarina TB 80 #1,5), número = qtd por plano (profundidade 1000 mm)
| H | chapa | kg/m | 1200 | 1800 | 2300 | 2500 | 2800 | 3000 | 3400 |
|---|---|---|---|---|---|---|---|---|---|
| 80 | 1,50 | 4,65 | 3200 C-1 | 2050 C-3 | 1250 C-4 | 1050 C-4 | 800 C-4 | 700 C-4 | 550 C-4 |
| 90 | 1,50 | 5,03 | 4000 C-3 | 2800 C-4 | 2000 C-6 | 1650 C-6 | 1300 C-6 | 1150 C-5 | 850 C-4 |
| 100 | 1,50 | 5,21 | – | 3100 C-5 | 2400 C-7 | 2000 C-7 | 1600 C-7 | 1400 C-6 | 1050 C-5 |
| 110 | 1,50 | 5,36 | – | 3400 D-4 | 2700 D-3 | 2400 D-3 | 1850 D-3 | 1600 D-3 | 1250 C-5 |
| 130 | 1,50 | 5,83 | – | 4200 D-4 | 3400 D-4 | 3100 D-4 | 2800 D-4 | 2450 D-3 | 1900 D-4 |
| 150 | 1,50 | 6,44 | – | – | 4300 D-5 | 4000 D-5 | 3500 D-4 | 3300 D-4 | 3000 D-4 |
| 150 | 1,80 | 7,55 | – | – | – | – | 4300 D-5 | 4000 D-5 | 3600 D-4 |
| 150 | 2,00 | 8,30 | – | – | – | – | – | – | 4000 D-5 |
Conector com 3 garras até 2700 kg; 4 garras até 4300 kg.

### 6.7 Montantes – F 382 rev.00 (20/02/2024) – capacidade da coluna (kgf) × distância entre níveis h (500–2600 mm), C80 #1,8/2,0, C101 #1,8/2,0/2,25/2,65, C122 #1,8/2,0/2,25/2,65 – para a etapa 7 (análise). Determinações: travamento superior a cada 3 montantes se H/L ≥ 8 acima de 8 m; 1 nível só → engate aparafusado; travessas a cada 900; até 12 m.

### 6.8 Manual F 250 – pino trava
Grampo longarina (pino trava) INT1556: 1 por garra (manual p.11). Etiqueta de carga "por par, uniformemente distribuída" nos dois primeiros níveis.

### 6.9 Regras do app – longarina simples (Gean, 17/10/2026) → `drive-in/app/pp_longarina.js` + `testes/pp_longarina.js`
1. Fora de 1100–3500 mm (ou célula vazia da F 237): desenha e pesa, capacidade "SEM CAPACIDADE TABELADA – CONSULTAR ENGENHARIA", sem bloquear.
2. Comprimento intermediário (passo 50): capacidade do comprimento tabelado imediatamente maior; peso pelo comprimento real; sem CO cadastrado → CO04XXXX.
3. App escolhe o perfil mais leve que atende a carga do par; operador pode trocar; se não suportar → alerta + marcação ⚠ na lista de peças.
4. Peso = kg/m F 237 × L + 2 garras; 2 pinos INT1556 (fixador – só valor).
5. Começar pela longarina simples; cadeirinha (F 246) depois.
6. Normas citadas: NBR 17150, NBR 15524, NBR 14762.

Inconsistências a confirmar com a engenharia (não aplicar sem resposta):
- TB 130: soma fecha, mas o perfil (4,629) é **mais leve** que o TB 110 (5,207) e o TB 100 (4,997) – conferir espessura; perfil sem código SA.
- TB 150 1,20 m: perfil 9,490 kg × 2 = 18,98 kg > peso do CO 8,778 kg – peso unitário da lista parece errado (ou é o peso do par/barra).
- CAD MDP TB 90: CO 16,019 kg vs soma dos componentes 12,451 kg (2×4,829 + 2,011 + 2×0,391) – diferença de 3,57 kg. (Demais modelos fecham a soma em ±0,02 kg.)
- TB 170 4,00 m: título diz 3.600 kg, perfil SA041030 descrito como "2,30 MT 2.400 KG TB 130 #18" – lista de componentes desatualizada.


## App – Porta-Palete v1 (17/10/2026)
Tela "Porta-Palete" (card da página inicial) → `drive-in/app/pp_engine.js` (cálculo e lista), `pp_desenho.js` (frontal, lateral, superior na folha A0; DXF e PDF), `pp_app.js` (tela). Testes: `node testes/pp_engine.js`, `node testes/pp_longarina.js`.

Regras confirmadas (Gean, 17/10/2026):
1. Comprimento da longarina = paletes × frente + 100 mm entre paletes e até as colunas, para cima em 50 mm (2 × 1000 → 2.300).
2. Passo entre níveis = altura do palete + 100 mm + altura da longarina (TB), para cima em 50 mm; 1º nível igual ao passo com palete no chão.
3. Altura da coluna = último nível (apoio) + 250 mm, para cima em 50 mm.
4. Folha e carimbo: seguir o modelo do Drive-In.
5. Fileira dupla: distância entre quadros digitada pelo operador, padrão 300 mm.

Premissas ainda abertas:
- 2 longarinas por nível por módulo; colunas = 2 por quadro, quadros = módulos + 1 por fileira.
- Desenho usa a coluna frontal e a sapata do Drive-In (blocos DI); sapata PP só na lista de peças.
- Fileira dupla sem espaçador e sem travamentos (etapa 5); coluna sem verificação F 382 (etapa 7).
