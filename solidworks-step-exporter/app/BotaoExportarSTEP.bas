' Botao "Gerar STEP" - abre o GeradorDeSTEP.exe (sem administrador).
' Salve esta macro como BotaoGerarSTEP.swp NA MESMA PASTA do GeradorDeSTEP.exe.
Option Explicit

Sub main()
    Dim swApp As Object
    Dim exe As String
    Set swApp = Application.SldWorks
    exe = swApp.GetCurrentMacroPathFolder() & "\GeradorDeSTEP.exe"
    If Dir(exe) = "" Then
        MsgBox "Nao encontrei:" & vbCrLf & exe & vbCrLf & vbCrLf & _
               "Salve esta macro na mesma pasta do GeradorDeSTEP.exe.", vbExclamation, "Gerar STEP"
        Exit Sub
    End If
    Shell Chr(34) & exe & Chr(34), vbNormalFocus
End Sub
