@echo off
REM Registra o add-in no SOLIDWORKS. Execute como ADMINISTRADOR.
set DLL=%~dp0src\bin\Release\net48\StepExporter.dll
if not exist "%DLL%" (
  echo DLL nao encontrada: %DLL%
  echo Compile antes: dotnet build src\StepExporter.csproj -c Release
  pause & exit /b 1
)
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe" /codebase "%DLL%"
pause
