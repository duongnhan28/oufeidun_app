@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-stock-forecast.ps1"
set "checkExit=%errorlevel%"
pause
exit /b %checkExit%
