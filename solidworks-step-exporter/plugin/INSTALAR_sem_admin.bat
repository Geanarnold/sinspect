@echo off
setlocal
REM =====================================================================
REM  Exportador STEP - registro SOMENTE para o usuario atual (sem admin).
REM  Feche o SOLIDWORKS antes de executar.
REM  ATENCAO: o SOLIDWORKS documenta apenas o registro em HKLM (admin).
REM  Este modo e uma tentativa; se o plugin nao aparecer em
REM  Ferramentas > Suplementos, use INSTALAR_admin.bat (ou peca a TI).
REM =====================================================================
set "GUID={F004CBA8-388C-4126-8113-EFC4FD40B057}"
set "CLS=StepExporter.SwAddin"
set "ASM=StepExporter, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null"
set "DLL=%~dp0StepExporter.dll"
if not exist "%DLL%" (echo Nao encontrei %DLL% & pause & exit /b 1)

REM Remove o bloqueio de "arquivo vindo da internet"
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%~dp0' | Unblock-File" >nul 2>&1

set "URL=file:///%DLL:\=/%"
set "K=HKCU\Software\Classes\CLSID\%GUID%"
reg add "%K%" /ve /d "%CLS%" /f >nul
reg add "%K%\InprocServer32" /ve /d "mscoree.dll" /f >nul
reg add "%K%\InprocServer32" /v ThreadingModel /d "Both" /f >nul
reg add "%K%\InprocServer32" /v Class /d "%CLS%" /f >nul
reg add "%K%\InprocServer32" /v Assembly /d "%ASM%" /f >nul
reg add "%K%\InprocServer32" /v RuntimeVersion /d "v4.0.30319" /f >nul
reg add "%K%\InprocServer32" /v CodeBase /d "%URL%" /f >nul
reg add "%K%\InprocServer32\1.0.0.0" /v Class /d "%CLS%" /f >nul
reg add "%K%\InprocServer32\1.0.0.0" /v Assembly /d "%ASM%" /f >nul
reg add "%K%\InprocServer32\1.0.0.0" /v RuntimeVersion /d "v4.0.30319" /f >nul
reg add "%K%\InprocServer32\1.0.0.0" /v CodeBase /d "%URL%" /f >nul
reg add "%K%\ProgId" /ve /d "%CLS%" /f >nul
reg add "%K%\Implemented Categories\{62C8FE65-4EBB-45E7-B440-6E39B2CDBF29}" /f >nul
reg add "HKCU\Software\Classes\%CLS%\CLSID" /ve /d "%GUID%" /f >nul

reg add "HKCU\Software\SolidWorks\AddIns\%GUID%" /ve /t REG_DWORD /d 1 /f >nul
reg add "HKCU\Software\SolidWorks\AddIns\%GUID%" /v Title /d "Exportador STEP" /f >nul
reg add "HKCU\Software\SolidWorks\AddIns\%GUID%" /v Description /d "Exporta pecas, submontagens e montagens para STEP em lote." /f >nul
reg add "HKCU\Software\SolidWorks\AddInsStartup\%GUID%" /ve /t REG_DWORD /d 1 /f >nul

echo.
echo Registro do usuario concluido.
echo Abra o SOLIDWORKS e confira em Ferramentas ^> Suplementos se aparece "Exportador STEP".
echo Se NAO aparecer, execute INSTALAR_admin.bat como administrador.
pause
