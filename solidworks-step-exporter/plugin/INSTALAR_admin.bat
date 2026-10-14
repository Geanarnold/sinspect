@echo off
setlocal
REM =====================================================================
REM  Exportador STEP - registro OFICIAL (todos os usuarios). Requer ADMIN.
REM  Clique com o botao direito > Executar como administrador.
REM  Feche o SOLIDWORKS antes.
REM =====================================================================
net session >nul 2>&1
if errorlevel 1 (echo Execute este arquivo como ADMINISTRADOR. & pause & exit /b 1)
set "DLL=%~dp0StepExporter.dll"
if not exist "%DLL%" (echo Nao encontrei %DLL% & pause & exit /b 1)
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%~dp0' | Unblock-File" >nul 2>&1
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe" /codebase "%DLL%"
echo.
echo Abra o SOLIDWORKS e confira em Ferramentas ^> Suplementos.
pause
