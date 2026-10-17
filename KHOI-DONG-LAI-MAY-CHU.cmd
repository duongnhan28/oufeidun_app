@echo off
cd /d "%~dp0"
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell.exe -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restart-local-services.ps1"
if %errorlevel% neq 0 pause & exit /b 1
echo.
echo May chu Oufeidun da duoc khoi dong lai va kiem tra thanh cong.
pause
