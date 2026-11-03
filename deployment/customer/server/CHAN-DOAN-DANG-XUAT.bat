@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\diagnose-session.ps1"
set "diagnosticExit=%errorlevel%"
pause
exit /b %diagnosticExit%
