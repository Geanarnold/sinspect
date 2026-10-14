# Exportador STEP em Lote (add-in SOLIDWORKS)

Este add-in adiciona o comando **Exportar STEP** ao SOLIDWORKS (aba própria no CommandManager, menu e barra de ferramentas). O comando abre uma janela com todos os componentes da montagem ativa, separados em grupos, e você marca quais converter:

| Grupo | Padrão |
|---|---|
| Montagem principal | marcado |
| Submontagens (todos os níveis) | marcado |
| Peças | marcado |
| Toolbox (parafusos, porcas…) | **desmarcado** |

A janela tem atalhos *Todas as peças*, *Todas as submontagens*, *Montagem principal*, *Toolbox*, *Tudo* e *Nada*. Também dá para escolher a pasta de saída (padrão: `<pasta da montagem>\STEP`), o formato (AP203 / AP214 / AP242) e as opções de sobrescrita e de nome.

## Comportamento

- **Uma exportação por arquivo + configuração.** Se uma peça aparece 40 vezes na mesma configuração, sai um único STEP. A coluna *Qtd* mostra quantas instâncias existem.
- **Configuração correta.** Cada item é exportado na configuração que a montagem referencia. Depois, o add-in restaura a configuração ativa original do arquivo.
- **Nomes.** Por padrão o nome é `NomeDoArquivo.step`. Quando o mesmo arquivo é exportado em mais de uma configuração, o nome passa a ser `NomeDoArquivo_Config.step`. Arquivos com o mesmo nome em pastas diferentes recebem o sufixo `_2`, `_3`… em vez de se sobrescreverem.
- **Ignorados.** Componentes suprimidos, envelopes e componentes que não carregaram não são exportados. O pop-up avisa quando há componentes não carregados.
- **Componentes leves (lightweight)** são resolvidos automaticamente antes da varredura.
- **Ordem:** primeiro as peças, depois as submontagens e por último a montagem principal.
- **Log:** cada execução grava `exportacao_step_AAAAMMDD_HHMMSS.log` na pasta de saída, com o resultado OK/FALHA de cada item.
- **Cancelar:** pressione `Esc` durante a barra de progresso.
- **Preferência restaurada:** a preferência de formato STEP do SOLIDWORKS volta ao valor original ao final.
- **Peça aberta:** com uma peça ativa, o comando exporta apenas essa peça.

## Requisitos

- SOLIDWORKS 2019 ou superior, 64 bits (usa `SaveAs3`, disponível a partir do 2019)
- Visual Studio 2019/2022 com a carga de trabalho ".NET desktop" **ou** o .NET SDK 6+ com o Developer Pack do .NET Framework 4.8
- Permissão de administrador **somente** para a versão add-in (RegAsm grava em `HKLM`); a versão executável não precisa

## Instalação SEM administrador (recomendada para estações sem direito de admin)

Esta versão é um executável avulso (`StepExporterApp.exe`). Ele se conecta ao SOLIDWORKS que já está aberto e roda **exatamente o mesmo pop-up e a mesma exportação** do add-in. Não usa RegAsm, não grava no registro e não precisa de administrador.

1. **Pronto para usar:** baixe `dist/ExportadorSTEP.zip`. Se o Windows marcar o arquivo como vindo da internet, use *Propriedades › Desbloquear* antes de extrair. Extraia o zip para uma pasta sua, por exemplo `C:\Users\<voce>\Ferramentas\ExportadorSTEP\`.
2. *(Opcional)* Para recompilar: `dotnet build app\StepExporterApp.csproj -c Release`. Não precisa das DLLs do SOLIDWORKS, porque a API é chamada por ligação tardia e as constantes são lidas da instalação do SOLIDWORKS ao executar.
3. Com o SOLIDWORKS aberto e a montagem ativa, execute `StepExporterApp.exe`.

**Botão dentro do SOLIDWORKS (também sem admin):** a macro `app\BotaoExportarSTEP.bas` chama o executável. O passo a passo está no próprio arquivo:
- crie a macro `.swp` na mesma pasta do `.exe`;
- cole o código;
- em *Ferramentas › Personalizar › Comandos › Macro*, arraste um botão de macro para a barra.

Diferenças em relação ao add-in:
- **Sem aba própria no CommandManager.** O acesso é pelo botão de macro ou pelo atalho do `.exe`.
- **Um pouco mais lento em montagens muito grandes.** As chamadas à API cruzam processos. O tempo de exportação STEP continua sendo o fator dominante.
- **Mesmo nível de privilégio.** Se o SOLIDWORKS for aberto "como administrador", o `.exe` também precisa ser.
- **Política de TI.** Em empresas com AppLocker ou bloqueio de executáveis não assinados, a TI pode bloquear o `.exe`. Nesse caso não há saída técnica: é liberação da TI.

## Compilação e instalação do add-in (requer administrador)

1. Confira o caminho das DLLs de interop. Por padrão:
   `C:\Program Files\SOLIDWORKS Corp\SOLIDWORKS\api\redist\`
   Se a instalação estiver em outro caminho, compile passando
   `/p:SwInstallDir="D:\caminho\SOLIDWORKS"`.
2. Compile:
   ```bat
   dotnet build src\StepExporter.csproj -c Release
   ```
3. Feche o SOLIDWORKS e execute **`registrar.bat` como administrador**.
4. Abra o SOLIDWORKS. Em *Ferramentas › Suplementos*, confira se o **Exportador STEP** está ativo. A aba de mesmo nome aparece com montagem ou peça abertas.

Para remover, execute `desregistrar.bat` como administrador, com o SOLIDWORKS fechado.

> O registro também grava `HKCU\Software\SolidWorks\AddInsStartup`, para carregar o add-in ao iniciar o SOLIDWORKS. Isso vale para o usuário que executou o `.bat`. Se o administrador for outro usuário, ative o add-in manualmente em *Suplementos*.

## Limitações conhecidas

- **AP242:** só funciona nas versões do SOLIDWORKS que oferecem esse formato. Se a versão não aceitar, o log registra o aviso e a exportação segue no formato que estava configurado.
- **Large Design Review:** montagens abertas nesse modo não dão acesso aos componentes. Abra a montagem em modo resolvido.
- **Peças em configurações diferentes da ativa:** o add-in troca a configuração ativa do arquivo durante a exportação e depois a restaura. Se um arquivo oculto recusar a troca, o add-in abre a janela do arquivo, exporta e fecha. Nada é salvo nos arquivos de origem.
- **Componentes virtuais:** são exportados normalmente. O nome do STEP inclui o sufixo `^Montagem` do SOLIDWORKS.

## Estrutura

```
src/
  SwAddin.cs             add-in: registro COM, CommandManager, ícone gerado em runtime
  ExportCommand.cs       fluxo do comando (pop-up, exportação, resumo); compartilhado
  ComponentCollector.cs  varredura recursiva da árvore (dedup por arquivo + configuração)
  ExportDialog.cs        pop-up de seleção (WinForms)
  StepExportService.cs   exportação, troca e restauração de configuração, progresso, log
app/
  Program.cs             executável sem admin (conecta ao SOLIDWORKS aberto)
  BotaoExportarSTEP.bas  macro VBA para criar o botão na barra do SOLIDWORKS
```
