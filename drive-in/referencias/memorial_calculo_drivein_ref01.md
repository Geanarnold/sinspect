# Referência técnica 01 – Memorial de cálculo de Drive-In (consultoria externa, nov/2025)

Resumo **somente técnico** de um memorial de cálculo emitido por engenharia externa para uma estrutura Drive-In fabricada pela Metalúrgica Amapá. Sem dados de cliente, obra ou responsável técnico (o documento original fica com a engenharia, fora do repositório).

**Finalidade (Gean, 14/10/2026):** somente dados para análise numa futura validação de cálculo. Não altera regras, padrões nem alertas do PaletCad.

## Normas e método
- FEM 10.2.07, ABNT NBR 17191, ABNT NBR 14762 e AISI (LRFD).
- Software: STRAP (modelo unifilar, cargas, deslocamentos) + CROSSEC (resistência das seções).
- Combinações (ELU): peso próprio × 1,30; carga do palete × 1,40; imperfeições do peso próprio × 1,40; imperfeições da carga × 1,40 (estas duas só na coluna).
- Flecha de braço e viga túnel: L/200. Balanço do braço calculado com **230 mm + 50 mm** (acréscimo previsto em norma).

## Configuração analisada (pior caso do projeto)
| Item | Valor |
|---|---|
| Níveis | chão + 3 níveis de armazenagem |
| Paletes na profundidade | 16 |
| Carga por palete | 1.400 kg, uniformemente distribuída sobre as vigas túnel |
| Carga por rua | 67.200 kg |
| Módulo (comprimento × profundidade × altura) | 1.350 × 22.000 × 7.700 mm |
| Chumbadores | 4 por coluna (8 por montante) no texto da metodologia; 2 por coluna no item 4.1 (ver inconsistências) |

## Perfis verificados (aço Civil 300)
| Peça | Perfil | Chapa |
|---|---|---|
| Coluna | 122 × 67,8 mm, 12 dobras, sliter 298,5 mm | 1,8 mm |
| Braço | C 94 × 40 × 15 | **2,25 mm** |
| Viga túnel | U 100 × 38 | **2,0 mm** |

## Resultados (taxa de utilização = solicitação ÷ resistência)
| Peça | Verificação determinante | Valores principais | Utilização |
|---|---|---|---|
| Coluna | Flexo-compressão (H1.2-1) | Pu = 4.368 kgf; φPn = 0,85 × 6.740; (kL/r)y = 119; Fy = 342,6 MPa; A = 5,47 cm² | **77%** (axial isolado 76%; distorcional 38%) |
| Braço | Distorcional M2 (F4.1) | Mu = 306,8 kgf·cm; Mn = 369,1; cortante V3 33%; flecha 7% | **92%** (combinada 87%) |
| Viga túnel (vão crítico 1.375 mm) | Flexo-compressão (H1.2-1) | Mux = 113,5 / Mnx 253,2; Muy = 16,4 / Mny 38,4; flecha 12% | **94%** |
| Travessas, amarração superior, longarinas de topo | — | esforços baixos | ≤ 10% |
| Reação máxima no piso (já majorada) | — | — | **4.366 kg por coluna** |

## Pontos para a futura validação de cálculo
- Braço verificado em #2,25 (92%) para 1.400 kg/palete; viga túnel em #2,0 (94%, vão 1.375 mm); coluna 122 #1,8 com 77%.
- Reação máxima no piso de 4,4 t por coluna (majorada).

## Inconsistências do documento original (anotar ao reutilizar)
- Chumbadores: 4 por coluna na metodologia × 2 por coluna no item 4.1.
- Legendas das figuras não batem com os perfis (ex.: "Coluna 130#12", "Braço 95x50#12", "Viga 100x50#15") — erro de legenda; valem as cotas das figuras e o texto.
- Item 4.3 cita "resistência dos braços" ao tratar da viga túnel (texto copiado).
