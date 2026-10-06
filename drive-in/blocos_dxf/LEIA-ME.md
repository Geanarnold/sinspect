# Biblioteca de blocos DI_* (fonte oficial)

Um DXF por bloco; o nome do arquivo é o nome do bloco. O app **não** lê estes arquivos direto: eles são convertidos em `app/blocos.js` por

    python3 extrair_blocos.py blocos_dxf

Fluxo para alterar um bloco: editar o DXF aqui → rodar o script → conferir a vista no app → commit dos dois (DXF + blocos.js). Nunca editar `app/blocos.js` à mão.

| Bloco | Uso no app | Ponto de inserção / regra |
|---|---|---|
| DI_COLUNA | vista lateral | eixo da coluna; esticada até a altura, furação replicada a cada 50 mm |
| DI_SAPATA | vista lateral | base da sapata no piso (y = 0) |
| DI_PISO | lateral e frontal | trecho de 1000 mm, topo do piso em y = 0 |
| DI_TRAVESSA_H | lateral | origem no 1º furo; esticada para c/c = A − 109,1 |
| DI_TRAVESSA_D | lateral | rotacionada e esticada entre os furos |
| DI_UNIAO | lateral (coluna solteira) | 1º furo na coluna solteira; esticada conforme A1 − 69,8 |
| DI_TOPO | lateral | esticado conforme o espaço (modelo base 820) |
| DI_COLUNA_FRONTAL_80/101/122 | frontal | eixo em x = 0; sapata abaixo da origem; furos oblongos a 25 mm do topo, passo 50 |
| DI_LGTOPO | frontal | furo de fixação: 8,46 mm acima do 3º furo de cima, 2,23 mm além do centro do oblongo; esticada pelo meio (vão de furos 1931,73 p/ rua 1900 na COL 101) |
| DI_EMENDA_LONG | lateral | tala de junção da longarina de túnel (PK041366), origem no centro da tala (junta) e meio da altura de 94 |
| DI_BRACO_S180/S230_COL80_ESQ | frontal | só o ESQ; o DIR é espelhado no app. Furo inferior a 15 mm da base |

Faltam: braços simples COL 101/122, braços duplos (D180/D230) de todas as colunas, DI_LG_FUNDO, DI_CONTRAV_ZIGZAG.

Observações:
- DI_UNIAO.dxf foi recortado de `referencias_dxf/VISTA_LATERAL_COM_UNIAO.dxf` (versão mais recente: furos 15 / 641,66).
- DI_COLUNA_FRONTAL_122.dxf veio como geometria solta; foi convertida em bloco e deslocada (+65,15; −1,40) para ficar igual às colunas 80/101.
- DI_SECAO_COL80.dxf e DI_SECAO_COL122.dxf foram recortados de COLUNAS.dxf (blocos COL_80 e COL_122): centro da seção em x = 0, face externa da alma em y = 0, abertura para +y. Falta a COL 101.
- Os arquivos DI_BRACO_*_DIR enviados não foram mantidos (o DIR é espelhado; o S230_DIR veio com o bloco S180 por engano).

`../referencias_dxf/` guarda os desenhos de referência (DRIVE_IN, posições de sapata, vista lateral com união, posição dos braços, vista frontal com LGTOPO). Servem para conferir o app, não são lidos por ele.
