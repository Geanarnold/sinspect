# Hospedagem do Configurador Drive-In — instruções para a TI

**Objetivo:** publicar o app num endereço da empresa, com **login Microsoft obrigatório**. Só os usuários liberados (grupo do Entra ID) acessam. Ao desligar a conta, o acesso termina.

**Solicitante:** Gean Arnold (Engenharia de Produto).
**Repositório:** GitHub `Geanarnold/sinspect`. O app fica na pasta `drive-in/app`.
**Já está pronto no repositório:**
- `drive-in/app/staticwebapp.config.json`: exige login em todas as páginas e aceita só o provedor Microsoft;
- `drive-in/app/acesso-negado.html`;
- `.github/workflows/drivein-azure.yml`: publicação automática.

O app é **estático**: HTML, CSS e JavaScript. Não tem banco de dados nem servidor de aplicação, e não guarda dados no Azure. Os projetos continuam na pasta da empresa (servidor ou OneDrive), acessada pelo navegador do usuário.

---

## 1. Registrar o app no Entra ID (Azure AD)

1. Abra **Entra ID → Registros de aplicativo → Novo registro**.
   - **Nome:** `Configurador Drive-In`.
   - **Tipos de conta:** *somente contas deste diretório organizacional* (locatário único).
   - **URI de redirecionamento (Web):** `https://<endereço-do-site>/.auth/login/aad/callback`. O endereço do site sai do passo 2; volte aqui depois para preencher.
2. Em **Certificados e segredos**, crie um **segredo do cliente** e anote o valor.
3. Anote também o **ID do aplicativo (cliente)** e o **ID do diretório (locatário)**.
4. Abra **Entra ID → Aplicativos empresariais → Configurador Drive-In → Propriedades → "Atribuição necessária?" = Sim**.
   - Em **Usuários e grupos**, atribua o grupo autorizado, por exemplo `Engenharia - Drive-In`.
   - Quem não estiver atribuído não consegue entrar.

## 2. Criar o Static Web App

1. Abra **Portal Azure → Static Web Apps → Criar**.
   - **Plano:** **Standard**. O plano Free não permite restringir o login ao locatário da empresa.
   - **Origem da implantação:** *Outro*. A publicação será feita pelo GitHub Actions do repositório.
2. Depois de criado, configure as **variáveis de ambiente / configurações do aplicativo**:
   - `AZURE_CLIENT_ID` = ID do aplicativo (cliente) do passo 1;
   - `AZURE_CLIENT_SECRET` = segredo do cliente do passo 1.
3. No arquivo `drive-in/app/staticwebapp.config.json`, troque `TENANT_ID_DA_EMPRESA` pelo **ID do locatário**. A TI pode fazer isso, ou pode passar o ID ao Gean.
4. Copie o **token de implantação**: Static Web App → *Gerenciar token de implantação*.

## 3. Ligar a publicação automática (GitHub)

1. Abra o repositório no GitHub → **Settings → Secrets and variables → Actions → New repository secret**.
   - **Nome:** `AZURE_STATIC_WEB_APPS_API_TOKEN`.
   - **Valor:** o token do passo 2.4.
2. Rode o fluxo **Actions → "Drive-In - publicar no Azure" → Run workflow**.
   - A partir daí, cada atualização do app no branch `main` publica sozinha.

## 4. Domínio próprio (opcional)

Para usar um endereço da empresa, por exemplo `drivein.empresa.com.br`:
1. Em Static Web App → **Domínios personalizados**, adicione o domínio e crie o registro CNAME no DNS da empresa.
2. Atualize o URI de redirecionamento no registro do app (passo 1).

## 5. Teste de aceite

- Abrir o endereço numa janela anônima: deve aparecer o login Microsoft.
- Entrar com um usuário do grupo: o app abre.
- Entrar com um usuário fora do grupo: o Entra ID bloqueia o acesso.
- No app: em "Escolher pasta", selecionar a pasta de projetos. Só funciona no Edge ou no Chrome, e o site precisa estar em HTTPS, o que o Azure já fornece.

## Observações

- **Custo:** plano Standard do Static Web Apps, valor mensal fixo por app (confirmar o valor atual na tabela de preços do Azure).
- **Internet:** o app passa a exigir internet para abrir.
- **Limite da proteção:** o login impede o acesso de quem está fora da empresa. Usuários logados ainda recebem o código no navegador. Para esconder as regras de cálculo até de quem tem acesso, o cálculo precisaria ir para um serviço no servidor (etapa futura).
