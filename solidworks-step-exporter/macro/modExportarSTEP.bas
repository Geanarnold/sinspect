Attribute VB_Name = "modExportarSTEP"
' =====================================================================
'  EXPORTADOR STEP EM LOTE - macro VBA para SOLIDWORKS 2019+
'  Exporta para STEP as pecas, submontagens e a montagem principal
'  selecionadas no formulario frmExportarSTEP.
'  Nao precisa de administrador nem de instalacao.
' =====================================================================
Option Explicit

Public Const KIND_TOP As Integer = 0
Public Const KIND_SUB As Integer = 1
Public Const KIND_PART As Integer = 2

Public Type TItem
    FilePath As String
    Config As String
    Kind As Integer
    IsToolbox As Boolean
    IsVirtual As Boolean
    Qty As Long
    Level As Long
    Selected As Boolean
    Model As Object
End Type

Public swApp As SldWorks.SldWorks
Public gItems() As TItem
Public gCount As Long
Public gRootPath As String
Public gNaoCarregados As Long

' Opcoes preenchidas pelo formulario
Public gConfirmado As Boolean
Public gPasta As String
Public gAp As Long
Public gSobrescrever As Boolean
Public gSempreCfg As Boolean
Public gAbrirPasta As Boolean

Private gIndice As Object        ' Scripting.Dictionary: caminho|config -> indice
Private gAtivouOutros As Boolean

Sub main()
    Set swApp = Application.SldWorks

    Dim doc As SldWorks.ModelDoc2
    Set doc = swApp.ActiveDoc
    If doc Is Nothing Then
        MsgBox "Abra uma peça ou montagem antes de exportar.", vbExclamation, "Exportador STEP"
        Exit Sub
    End If
    If doc.GetType <> swDocASSEMBLY And doc.GetType <> swDocPART Then
        MsgBox "O documento ativo precisa ser uma peça ou montagem.", vbExclamation, "Exportador STEP"
        Exit Sub
    End If
    If doc.GetPathName = "" Then
        MsgBox "Salve o documento antes de exportar.", vbExclamation, "Exportador STEP"
        Exit Sub
    End If

    ColetarItens doc

    gConfirmado = False
    frmExportarSTEP.Show          ' modal
    If Not gConfirmado Then Exit Sub

    Exportar doc
End Sub

' ---------------------------------------------------------------------
'  Coleta da arvore (todos os niveis, agrupando arquivo + configuracao)
' ---------------------------------------------------------------------
Private Sub ColetarItens(doc As SldWorks.ModelDoc2)
    gCount = 0
    ReDim gItems(0 To 31)
    Set gIndice = CreateObject("Scripting.Dictionary")
    gNaoCarregados = 0
    gRootPath = doc.GetPathName

    Dim cfg As SldWorks.Configuration
    Set cfg = doc.ConfigurationManager.ActiveConfiguration

    If doc.GetType = swDocASSEMBLY Then
        AddItem gRootPath, cfg.Name, KIND_TOP, False, False, 0, doc
    Else
        AddItem gRootPath, cfg.Name, KIND_PART, False, False, 0, doc
        Exit Sub
    End If

    ' Componentes leves nao expoem o ModelDoc2: resolve antes de varrer.
    Dim assy As SldWorks.AssemblyDoc
    Set assy = doc
    assy.ResolveAllLightWeightComponents False

    Dim root As SldWorks.Component2
    Set root = cfg.GetRootComponent3(True)
    If Not root Is Nothing Then Percorrer root, 1
End Sub

Private Sub Percorrer(parent As SldWorks.Component2, nivel As Long)
    Dim filhos As Variant
    filhos = parent.GetChildren
    If IsEmpty(filhos) Then Exit Sub

    Dim i As Long
    Dim comp As SldWorks.Component2
    Dim m As SldWorks.ModelDoc2
    Dim caminho As String, cfgRef As String, chave As String
    Dim ehMontagem As Boolean, ehToolbox As Boolean

    For i = 0 To UBound(filhos)
        Set comp = filhos(i)
        If (Not comp.IsSuppressed) And (Not comp.IsEnvelope) Then
            Set m = comp.GetModelDoc2
            If m Is Nothing Then
                gNaoCarregados = gNaoCarregados + 1
            Else
                caminho = comp.GetPathName
                cfgRef = comp.ReferencedConfiguration
                ehMontagem = (m.GetType = swDocASSEMBLY)
                ehToolbox = False
                If Not ehMontagem Then ehToolbox = (m.Extension.ToolboxPartType <> swNotAToolboxPart)

                chave = UCase$(caminho & "|" & cfgRef)
                If gIndice.Exists(chave) Then
                    With gItems(gIndice(chave))
                        .Qty = .Qty + 1
                        If nivel < .Level Then .Level = nivel
                    End With
                Else
                    If ehMontagem Then
                        AddItem caminho, cfgRef, KIND_SUB, False, comp.IsVirtual, nivel, m
                    Else
                        AddItem caminho, cfgRef, KIND_PART, ehToolbox, comp.IsVirtual, nivel, m
                    End If
                End If

                If ehMontagem Then Percorrer comp, nivel + 1
            End If
        End If
    Next i
End Sub

Private Sub AddItem(ByVal caminho As String, ByVal cfg As String, ByVal tipo As Integer, _
                    ByVal toolbox As Boolean, ByVal virtual As Boolean, ByVal nivel As Long, _
                    ByVal modelo As Object)
    If gCount > UBound(gItems) Then ReDim Preserve gItems(0 To 2 * UBound(gItems) + 1)
    With gItems(gCount)
        .FilePath = caminho
        .Config = cfg
        .Kind = tipo
        .IsToolbox = toolbox
        .IsVirtual = virtual
        .Qty = 1
        .Level = nivel
        .Selected = Not toolbox
        Set .Model = modelo
    End With
    gIndice(UCase$(caminho & "|" & cfg)) = gCount
    gCount = gCount + 1
End Sub

' ---------------------------------------------------------------------
'  Exportacao
' ---------------------------------------------------------------------
Private Sub Exportar(rootDoc As SldWorks.ModelDoc2)
    Dim i As Long, k As Integer, n As Long, total As Long
    Dim ok As Long, ignorados As Long, falhas As Long, cancelado As Boolean
    Dim alvo As String, erro As String, rootTitle As String, logTxt As String

    For i = 0 To gCount - 1
        If gItems(i).Selected Then total = total + 1
    Next i
    If total = 0 Then
        MsgBox "Nenhum item selecionado.", vbExclamation, "Exportador STEP"
        Exit Sub
    End If

    Dim nomes() As String
    nomes = MontarNomes()

    logTxt = "Exportação STEP - " & Format(Now, "yyyy-mm-dd hh:nn:ss") & vbCrLf & _
             "Origem: " & gRootPath & vbCrLf & "Formato: AP" & gAp & vbCrLf & vbCrLf

    Dim apAnterior As Long
    apAnterior = swApp.GetUserPreferenceIntegerValue(swStepAP)
    If Not swApp.SetUserPreferenceIntegerValue(swStepAP, gAp) Then
        logTxt = logTxt & "AVISO: esta versão não aceitou AP" & gAp & "; usando AP" & apAnterior & "." & vbCrLf
    End If

    rootTitle = rootDoc.GetTitle
    gAtivouOutros = False

    Dim pb As SldWorks.UserProgressBar
    swApp.GetUserProgressBar pb
    pb.Start 0, total, "Exportando STEP"
    swApp.CommandInProgress = True

    ' Pecas primeiro, depois submontagens, por ultimo a montagem principal.
    For k = KIND_PART To KIND_TOP Step -1
        For i = 0 To gCount - 1
            If gItems(i).Selected And gItems(i).Kind = k Then
                alvo = nomes(i)
                pb.UpdateTitle "Exportando STEP " & (n + 1) & "/" & total & ": " & ArquivoDe(alvo)
                If pb.UpdateProgress(n) = swUpdateProgressError_UserCancel Then
                    cancelado = True
                    logTxt = logTxt & "CANCELADO pelo usuário." & vbCrLf
                    GoTo FimLoop
                End If
                n = n + 1

                If Not gSobrescrever And Dir$(alvo) <> "" Then
                    ignorados = ignorados + 1
                    logTxt = logTxt & "IGNORADO (já existe)  " & alvo & vbCrLf
                ElseIf ExportarItem(i, alvo, erro) Then
                    ok = ok + 1
                    logTxt = logTxt & "OK     " & Descrever(i) & "  ->  " & alvo & vbCrLf
                Else
                    falhas = falhas + 1
                    logTxt = logTxt & "FALHA  " & Descrever(i) & "  ->  " & erro & vbCrLf
                End If
            End If
        Next i
    Next k
FimLoop:

    pb.End
    swApp.CommandInProgress = False
    swApp.SetUserPreferenceIntegerValue swStepAP, apAnterior

    Dim errAtv As Long
    If gAtivouOutros Then swApp.ActivateDoc3 rootTitle, False, swDontRebuildActiveDoc, errAtv

    logTxt = logTxt & vbCrLf & "Resumo: " & ok & " OK, " & ignorados & " ignorado(s), " & falhas & " falha(s)." & vbCrLf
    Dim logPath As String
    logPath = GravarLog(logTxt)

    Dim msg As String
    msg = "Exportação concluída." & vbCrLf & vbCrLf & _
          "Exportados: " & ok & vbCrLf & _
          "Ignorados (já existiam): " & ignorados & vbCrLf & _
          "Falhas: " & falhas & vbCrLf & vbCrLf & _
          "Pasta: " & gPasta & vbCrLf & "Log: " & logPath
    If cancelado Then msg = "Exportação CANCELADA pelo usuário." & vbCrLf & vbCrLf & msg
    MsgBox msg, IIf(falhas > 0, vbExclamation, vbInformation), "Exportador STEP"

    If gAbrirPasta Then Shell "explorer.exe """ & gPasta & """", vbNormalFocus
End Sub

' Exporta um item na configuracao referenciada e restaura a configuracao original.
Private Function ExportarItem(i As Long, alvo As String, erro As String) As Boolean
    Dim doc As SldWorks.ModelDoc2
    Dim cfgOriginal As String, trocar As Boolean, ativou As Boolean, eraVisivel As Boolean
    Dim errs As Long, warns As Long

    erro = ""
    Set doc = gItems(i).Model
    If doc Is Nothing Then
        erro = "documento não carregado"
        Exit Function
    End If

    On Error GoTo Falha
    cfgOriginal = doc.ConfigurationManager.ActiveConfiguration.Name
    trocar = (gItems(i).Config <> "" And gItems(i).Config <> cfgOriginal)
    eraVisivel = doc.Visible

    If trocar Then
        If Not doc.ShowConfiguration2(gItems(i).Config) Then
            ' Documentos ocultos as vezes so trocam de configuracao com janela ativa.
            swApp.ActivateDoc3 doc.GetTitle, False, swDontRebuildActiveDoc, errs
            ativou = True
            If Not doc.ShowConfiguration2(gItems(i).Config) Then
                erro = "não foi possível ativar a configuração '" & gItems(i).Config & "'"
                GoTo Fim
            End If
        End If
    End If

    If doc.Extension.SaveAs3(alvo, swSaveAsCurrentVersion, _
                             swSaveAsOptions_Silent + swSaveAsOptions_Copy, _
                             Nothing, Nothing, errs, warns) And Dir$(alvo) <> "" Then
        ExportarItem = True
    Else
        erro = "SaveAs3 falhou (erros=" & errs & ", avisos=" & warns & ")"
    End If

Fim:
    On Error Resume Next
    If trocar Then doc.ShowConfiguration2 cfgOriginal
    If ativou And Not eraVisivel Then swApp.CloseDoc doc.GetTitle
    If ativou Then gAtivouOutros = True
    Exit Function

Falha:
    erro = Err.Description
    Resume Fim
End Function

' Nome do STEP: Arquivo.step, ou Arquivo_Config.step se o mesmo arquivo sai em mais
' de uma configuracao (ou se a opcao estiver marcada). Homonimos recebem _2, _3...
Private Function MontarNomes() As String()
    Dim nomes() As String
    ReDim nomes(0 To gCount - 1)

    Dim porArquivo As Object, usados As Object
    Set porArquivo = CreateObject("Scripting.Dictionary")
    Set usados = CreateObject("Scripting.Dictionary")

    Dim i As Long, chave As String, base As String, candidato As String, sufixo As Long
    For i = 0 To gCount - 1
        If gItems(i).Selected Then
            chave = UCase$(gItems(i).FilePath)
            porArquivo(chave) = porArquivo(chave) + 1
        End If
    Next i

    For i = 0 To gCount - 1
        If gItems(i).Selected Then
            base = NomeSemExtensao(gItems(i).FilePath)
            If (gSempreCfg Or porArquivo(UCase$(gItems(i).FilePath)) > 1) And gItems(i).Config <> "" Then
                base = base & "_" & gItems(i).Config
            End If
            base = Sanitizar(base)

            candidato = base
            sufixo = 2
            Do While usados.Exists(UCase$(candidato))
                candidato = base & "_" & sufixo
                sufixo = sufixo + 1
            Loop
            usados(UCase$(candidato)) = True
            nomes(i) = gPasta & "\" & candidato & ".step"
        End If
    Next i

    MontarNomes = nomes
End Function

' ---------------------------------------------------------------------
'  Utilitarios (tambem usados pelo formulario)
' ---------------------------------------------------------------------
Public Function NomeSemExtensao(caminho As String) As String
    Dim nome As String, p As Long
    nome = Mid$(caminho, InStrRev(caminho, "\") + 1)
    p = InStrRev(nome, ".")
    If p > 0 Then nome = Left$(nome, p - 1)
    NomeSemExtensao = nome
End Function

Public Function PastaDe(caminho As String) As String
    PastaDe = Left$(caminho, InStrRev(caminho, "\") - 1)
End Function

Private Function ArquivoDe(caminho As String) As String
    ArquivoDe = Mid$(caminho, InStrRev(caminho, "\") + 1)
End Function

Private Function Sanitizar(ByVal nome As String) As String
    Dim c As Variant
    For Each c In Array("\", "/", ":", "*", "?", """", "<", ">", "|")
        nome = Replace(nome, c, "_")
    Next c
    Sanitizar = Trim$(nome)
End Function

Private Function Descrever(i As Long) As String
    Dim t As String
    Select Case gItems(i).Kind
        Case KIND_TOP: t = "Montagem"
        Case KIND_SUB: t = "Submontagem"
        Case Else: t = "Peça"
    End Select
    Descrever = "[" & t & "] " & NomeSemExtensao(gItems(i).FilePath) & " (" & gItems(i).Config & ")"
End Function

Public Function CriarPasta(caminho As String) As Boolean
    On Error GoTo Falha
    Dim fso As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    If Not fso.FolderExists(caminho) Then
        Dim pai As String
        pai = fso.GetParentFolderName(caminho)
        If pai <> "" And Not fso.FolderExists(pai) Then
            If Not CriarPasta(pai) Then Exit Function
        End If
        fso.CreateFolder caminho
    End If
    CriarPasta = True
    Exit Function
Falha:
    CriarPasta = False
End Function

Private Function GravarLog(texto As String) As String
    On Error GoTo Falha
    Dim caminho As String, f As Integer
    caminho = gPasta & "\exportacao_step_" & Format(Now, "yyyymmdd_hhnnss") & ".log"
    f = FreeFile
    Open caminho For Output As #f
    Print #f, texto;
    Close #f
    GravarLog = caminho
    Exit Function
Falha:
    GravarLog = "(não gravado: " & Err.Description & ")"
End Function
