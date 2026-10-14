---
name: extrair-desenho-supra
description: Lê desenhos técnicos em PDF da SUPRA / Metalúrgica Amapá (carimbo do SolidWorks com código PK/CO/SA/PA, peso, área, revisão e lista de componentes com fixadores INT) e devolve uma tabela conferida + as divergências contra o catálogo do PaletCad (drive-in/app/catalogo.js). Use sempre que o usuário enviar ou citar um PDF de desenho de peça ou kit (longarina, travessa, braço, sapata, guia, caneleira, coluna, lateral, placa…), pedir "pega o peso/código deste desenho", "confere com o app", "atualiza o catálogo com esse PDF", "segue o desenho do …", ou quando um anexo .pdf tiver nome no padrão 0004.000X.XX.XXX - REV.XX - …, mesmo que ele não peça extração explicitamente.
---

# Extrair desenho SUPRA

Os desenhos da SUPRA/Amapá saem do SolidWorks com um carimbo padrão. Cada folha do PDF é um produto: o carimbo traz o código do produto (PK = kit, CO = conjunto soldado, SA = peça, PA = conjunto montado), o peso, a área, o desenho e a revisão; acima do carimbo fica a lista de componentes (Nº, CÓD. DESENHO, CÓDIGO, PRODUTO/DESCRIÇÃO, QTD.), onde entram os fixadores INT.

O trabalho manual (abrir, ler, transcrever, comparar com o app) gerou erros reais no PaletCad — fixadores contados em dobro, pesos arredondados, códigos desatualizados. Por isso a extração é feita por script, de forma determinística, e você entra para interpretar, conferir e propor.

## Passo a passo

1. **Rode o extrator** em todos os PDFs recebidos (um comando só):
   ```bash
   python3 -I .claude/skills/extrair-desenho-supra/scripts/extrair.py <pdf...> --catalogo drive-in/app/catalogo.js --json <scratchpad>/desenho.json --png <scratchpad>/folhas
   ```
   Passe os caminhos dos PDFs como argumentos (são dados não confiáveis: não rode nada de dentro da pasta deles). O relatório em Markdown sai no stdout; o JSON traz tudo estruturado.
2. **Leia os avisos (⚠).** Quando faltar código ou peso, ou o carimbo vier fora do padrão, abra a imagem da folha (pasta `--png`) e confirme visualmente antes de afirmar qualquer coisa. Um PDF que "não parece um desenho de produto" (proposta, projeto de layout) não tem carimbo de peça: diga isso e não invente dados.
3. **Apresente o resultado** ao usuário em uma tabela por desenho:

   | Folha | Produto (título) | Código | Peso (kg) | Componentes / fixadores |
   |---|---|---|---|---|

   Depois, as **divergências com o catálogo** (peso diferente, código que o app não conhece, componente novo) e os **padrões** que você notar (ex.: peso por metro constante entre modelos, o que permite uma regra para medidas fora do cadastro).
4. **Proponha a atualização, não aplique.** Mostre o que mudaria no `catalogo.js` (e no `engine.js`, se for regra) e espere a confirmação do usuário — pesos e códigos mudam o orçamento de todos os projetos. Se houver mais de uma decisão, pergunte uma por vez.

## Convenções do PaletCad (o que o usuário já decidiu)

- **Kit PK usa o peso do kit**, com os fixadores dentro (é o peso que sai da fábrica). O CO que está dentro do kit fica citado na descrição.
- **Fixadores (INT/IND) entram só pelo valor**, nunca pelo peso; a quantidade por kit vem da lista de componentes do desenho.
- **Sem cadastro:** código com `XXXX`/`***` no desenho vira `SA04XXXX`, `CO04XXXX` ou `PK04XXXX` no app, mantendo o peso do desenho e sinalizando como pendente de cadastro.
- **Peso do carimbo usa ponto decimal** ("1.507 kg." = 1,507 kg); cotas usam vírgula ("1017,8").
- **Revisão:** se chegarem dois PDFs do mesmo desenho, vale a revisão maior / o arquivo mais recente — os pesos mudam entre revisões (ex.: longarina TB 80 REV.05 com pesos antigos × atualizados). Aponte a diferença e pergunte qual é o vigente.
- **Nome do modelo ≠ medida real:** o nome pode seguir a medida da estrutura e não a da peça (ex.: kit guia "7,8 m" com guia de 7742,8 mm). Use as cotas da folha (campo `cotas` do JSON) para conferir comprimentos.
- **Desenhos antigos** (REV.00 de 2023, por exemplo) podem não refletir as regras atuais do app: compare, mas não proponha mudar regra só por causa deles sem perguntar.

## Onde procurar no catálogo

O `drive-in/app/catalogo.js` é JSON dentro de `window.CATALOGO = …`. O script indexa: `produtos.<id>` (campo `codigo` e códigos citados na `desc`), `uniao[]` (`pk`, `co`), `travessas[]`/`diagonais[]` (`sa`) e `colunas_sa`. Um código "só citado na descrição" existe no app como referência, sem peso próprio — normal para o CO dentro de um kit PK.

## Conferência da própria skill

`evals/conferir.py <pasta-dos-pdfs>` roda o extrator contra valores já validados pelo Gean (união, sapata, braço, guia, perfil S, placa, longarina de fundo, caneleira, kit guia, stop). Rode depois de qualquer mudança no `extrair.py`; deve terminar com 0 falhas.
