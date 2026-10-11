# Hospedagem do Configurador Drive-In no Cloudflare (Pages + Access)

Alternativa ao Azure (`HOSPEDAGEM_AZURE.md`): sem custo até 50 usuários e sem precisar registrar app no Entra ID.

- **Pages** publica a pasta `drive-in/app` direto do GitHub. Cada push no branch de produção publica sozinho.
- **Access (Zero Trust, plano Free)** exige login antes de abrir qualquer página. O usuário recebe um código no e-mail corporativo e só entram e-mails do domínio da empresa.
- `drive-in/app/_headers` aplica os cabeçalhos de segurança.

## Configuração do Pages
| Campo | Valor |
|---|---|
| Repositório | `Geanarnold/sinspect` |
| Branch de produção | `main` |
| Framework | None |
| Comando de build | vazio (se o campo for obrigatório: `exit 0`) |
| Diretório de saída | `drive-in/app` |

## Duas aplicações no Access (as duas são obrigatórias)
1. **Produção:** domínio `<projeto>.pages.dev`.
2. **Prévias:** domínio `*.<projeto>.pages.dev`. Pages → Configurações → "Política de acesso" → Ativar. Sem isso, cada branch publicado gera um link de prévia **público**.

Regra: *Allow*, e-mails terminados em `@<domínio da empresa>`. Método de login: One-time PIN. Sessão: 7 dias.

## Teste de aceite (janela anônima)
1. Abra `https://<projeto>.pages.dev`. Deve aparecer a tela do Cloudflare Access pedindo o e-mail.
2. Digite um e-mail de fora da empresa. O código **não** pode chegar e o acesso tem que ser negado.
3. Digite um e-mail da empresa, receba o código e confirme que o app abre.
4. Repita os passos 1 a 3 num link de prévia (`<hash>.<projeto>.pages.dev`).

## Administração
- Adicionar um segundo administrador da empresa na conta Cloudflare (Manage Account → Members).
- Desligamento: o e-mail bloqueado não recebe mais o código. Para cortar na hora, revogue a sessão em Zero Trust → My Team → Users → Revoke.
