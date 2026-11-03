@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-drive-action.ps1" -Action setup
exit /b %errorlevel%
