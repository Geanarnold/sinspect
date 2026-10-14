@echo off
REM Remove o registro do add-in. Execute como ADMINISTRADOR com o SOLIDWORKS fechado.
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe" /unregister "%~dp0src\bin\Release\net48\StepExporter.dll"
pause
