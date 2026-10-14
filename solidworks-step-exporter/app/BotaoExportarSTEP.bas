' Macro de 3 linhas para ter um BOTAO no SOLIDWORKS sem administrador.
' 1) Ferramentas > Macro > Nova... salve como BotaoExportarSTEP.swp
'    NA MESMA PASTA do StepExporterApp.exe
' 2) Apague o conteudo gerado e cole este codigo; salve.
' 3) Ferramentas > Personalizar > Comandos > Macro: arraste "Novo botao de macro"
'    para uma barra de ferramentas e aponte para BotaoExportarSTEP.swp / main.
Option Explicit

Sub main()
    Dim swApp As SldWorks.SldWorks
    Set swApp = Application.SldWorks
    Shell Chr(34) & swApp.GetCurrentMacroPathFolder() & "\StepExporterApp.exe" & Chr(34), vbNormalFocus
End Sub
