' ============================================================================================
' TESTE - gera 1 travessa diagonal no SolidWorks a partir dos dados do Configurador Drive-In
' (macro de demonstração do fluxo app -> SolidWorks; peça criada do zero, sem peça-mestre)
'
' Peça: blank planificado do sliter 80 x 1,40 (ACO0602) no comprimento total da travessa,
'       com os 2 furos Ø9 nas pontas (c/c = total - 30,5 -> furo a 15,25 de cada ponta).
' Dados do exemplo: projeto GEAN, passo 788 mm, vão 900 mm  ->  total 1157,8 / c/c 1127,3
'
' COMO RODAR: SolidWorks > Ferramentas > Macro > Novo...  (salve como TESTE.swp),
'             apague o conteúdo, cole este arquivo inteiro, salve e rode (F5) - ou
'             Ferramentas > Macro > Editar/Executar se já tiver o .swp.
' Saída:      C:\DriveIn_Teste\TRAV-D-788-900.SLDPRT, .SLDDRW e .PDF
' ============================================================================================
Option Explicit

' ---- dados da peça (no fluxo real virão do arquivo "peças novas" exportado pelo app) ----
Const NOME As String = "TRAV-D-788-900"
Const DESCRICAO As String = "TRAVESSA DIAGONAL - PASSO 788 - VAO 900"
Const TOTAL_MM As Double = 1157.8      ' comprimento total
Const CC_MM As Double = 1127.3         ' centro a centro dos furos
Const LARG_MM As Double = 80           ' sliter (largura do blank)
Const ESP_MM As Double = 1.4           ' espessura
Const FURO_MM As Double = 9            ' diâmetro dos furos
Const PASTA As String = "C:\DriveIn_Teste\"

Dim swApp As Object

Sub main()
    Set swApp = Application.SldWorks
    Dim modelo As Object, tpl As String, erros As Long, avisos As Long

    If Dir(PASTA, vbDirectory) = "" Then MkDir PASTA

    ' ---------- peça ----------
    tpl = swApp.GetUserPreferenceStringValue(8)            ' swDefaultTemplatePart
    If tpl = "" Then MsgBox "Defina o template padrão de peça em Opções > Locais de arquivos.": Exit Sub
    Set modelo = swApp.NewDocument(tpl, 0, 0, 0)
    If modelo Is Nothing Then MsgBox "Não foi possível criar a peça (template: " & tpl & ")": Exit Sub

    ' 1º plano de referência da árvore (Plano Frontal / Front Plane, independe do idioma)
    Dim f As Object
    Set f = modelo.FirstFeature
    Do While Not f Is Nothing
        If f.GetTypeName2 = "RefPlane" Then Exit Do
        Set f = f.GetNextFeature
    Loop
    If f Is Nothing Then MsgBox "Plano de referência não encontrado.": Exit Sub
    modelo.ClearSelection2 True
    f.Select2 False, 0

    ' esboço: retângulo total x largura + 2 furos (contornos internos viram furos na extrusão)
    Dim m As Double: m = 1 / 1000                           ' API trabalha em metros
    Dim xF As Double: xF = (TOTAL_MM - CC_MM) / 2           ' furo a 15,25 da ponta
    modelo.SketchManager.InsertSketch True
    modelo.SketchManager.AddToDB = True
    modelo.SketchManager.CreateCornerRectangle 0, 0, 0, TOTAL_MM * m, LARG_MM * m, 0
    modelo.SketchManager.CreateCircleByRadius xF * m, LARG_MM / 2 * m, 0, FURO_MM / 2 * m
    modelo.SketchManager.CreateCircleByRadius (xF + CC_MM) * m, LARG_MM / 2 * m, 0, FURO_MM / 2 * m
    modelo.SketchManager.AddToDB = False
    modelo.SketchManager.InsertSketch True

    ' extrusão na espessura
    Dim feat As Object
    Set feat = modelo.FeatureManager.FeatureExtrusion2(True, False, False, 0, 0, ESP_MM * m, 0, _
        False, False, False, False, 0, 0, False, False, False, False, True, True, True, 0, 0, False)
    If feat Is Nothing Then MsgBox "Falha na extrusão.": Exit Sub

    ' propriedades (vão para a lista de materiais / carimbo)
    Dim cp As Object
    Set cp = modelo.Extension.CustomPropertyManager("")
    cp.Add3 "Descricao", 30, DESCRICAO, 2
    cp.Add3 "Codigo", 30, "SA04XXXX", 2
    cp.Add3 "Comprimento", 30, Format(TOTAL_MM, "0.0"), 2
    cp.Add3 "CC_Furos", 30, Format(CC_MM, "0.0"), 2
    cp.Add3 "Material", 30, "ACO0602 - SLITER 80 x 1,40", 2
    cp.Add3 "Origem", 30, "Configurador Drive-In (teste)", 2

    modelo.ViewZoomtofit2
    Dim arqPeca As String: arqPeca = PASTA & NOME & ".SLDPRT"
    modelo.Extension.SaveAs arqPeca, 0, 1, Nothing, erros, avisos   ' 1 = swSaveAsOptions_Silent
    If erros <> 0 Then MsgBox "Erro ao salvar a peça (" & erros & ")": Exit Sub

    ' ---------- desenho (1º diedro, padrão ABNT) + PDF ----------
    Dim tplD As String, des As Object
    tplD = swApp.GetUserPreferenceStringValue(9)            ' swDefaultTemplateDrawing
    If tplD <> "" Then
        Set des = swApp.NewDocument(tplD, 0, 0, 0)
        If Not des Is Nothing Then
            des.Create1stAngleViews2 arqPeca
            des.ViewZoomtofit2
            des.Extension.SaveAs PASTA & NOME & ".SLDDRW", 0, 1, Nothing, erros, avisos
            des.Extension.SaveAs PASTA & NOME & ".PDF", 0, 1, Nothing, erros, avisos
        End If
    End If

    MsgBox "Peça de teste gerada em " & PASTA & vbCrLf & NOME & ".SLDPRT / .SLDDRW / .PDF", vbInformation, "Drive-In"
End Sub
