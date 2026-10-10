# Bateria de testes do Configurador Drive-In

Roda o cálculo e o DXF de 6 projetos de referência e compara com o resultado gravado (gabarito). Serve para que nenhuma alteração no app mude um resultado **sem ninguém perceber**.

```
cd drive-in
node testes/rodar.js              # compara tudo com o gabarito
node testes/rodar.js c02          # só um caso
node testes/rodar.js --atualizar  # grava o resultado atual como gabarito (só depois de conferir a mudança)
```

**O que é conferido em cada caso**
- **Cálculo:** dimensões, níveis, posições, erros e avisos, e a lista de peças completa (código, quantidade, comprimento e peso unitário).
- **DXF:**
  - o arquivo é gerado sem exceção e sem valores inválidos (NaN);
  - os nomes de bloco têm no máximo 31 caracteres;
  - o resumo bate com o gabarito: folhas, escalas e blocos por tipo;
  - a auditoria do ezdxf não acusa erros. Ela só roda se o Python com ezdxf estiver instalado.

**Casos:** ver `casos.js`. Os 6 casos cobrem:
- COL 80, 80 duplada, 101 e 122;
- com e sem coluna solteira;
- com emenda de coluna;
- palete escravo no chão;
- espaços diferentes na lateral;
- muitas ruas (vista parcial);
- rua de 1900.

**Atenção:** o gabarito inicial (10/10/2026) foi gravado a partir do próprio app e **ainda não foi validado pela engenharia**. Os pesos e códigos estão em estudo (`validacao/VALIDACAO_PESOS.md`). Quando um caso for conferido pelo Gean, troque `validado: false` para `true` em `casos.js`.

**Regra de trabalho:** antes de publicar qualquer versão, rode `node testes/rodar.js`.
- **"Todos os casos iguais":** pode publicar.
- **"MUDOU":** a lista mostra exatamente o que mudou. Se a mudança era a pretendida, rode `--atualizar`. Se não era, é um erro, e precisa ser corrigido antes de publicar.
