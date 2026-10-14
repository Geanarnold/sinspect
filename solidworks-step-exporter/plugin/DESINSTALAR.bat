@echo off
setlocal
REM Remove o Exportador STEP. Feche o SOLIDWORKS antes.
set "GUID={F004CBA8-388C-4126-8113-EFC4FD40B057}"
reg delete "HKCU\Software\Classes\CLSID\%GUID%" /f >nul 2>&1
reg delete "HKCU\Software\Classes\StepExporter.SwAddin" /f >nul 2>&1
reg delete "HKCU\Software\SolidWorks\AddIns\%GUID%" /f >nul 2>&1
reg delete "HKCU\Software\SolidWorks\AddInsStartup\%GUID%" /f >nul 2>&1
net session >nul 2>&1
if not errorlevel 1 "%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe" /unregister "%~dp0StepExporter.dll"
echo Exportador STEP removido.
pause
