@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0manage-client.ps1" -Action check -TargetAppData "%APPDATA%"
exit /b %errorlevel%
