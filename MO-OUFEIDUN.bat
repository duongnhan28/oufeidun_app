@echo off
setlocal
title Oufeidun - Quan ly ban hang

set "APP_UPDATER=%LOCALAPPDATA%\KinhBanHang\Update.exe"
set "OUFEIDUN_INSTALLER=%~dp0Oufeidun-Setup.exe"

if exist "%APP_UPDATER%" (
  start "" "%APP_UPDATER%" --processStart "Oufeidun.exe"
  exit /b 0
)

if not exist "%OUFEIDUN_INSTALLER%" (
  echo Khong tim thay Oufeidun-Setup.exe trong cung thu muc.
  echo Hay dat file MO-OUFEIDUN.bat canh file Oufeidun-Setup.exe.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p=$env:OUFEIDUN_INSTALLER; if (Test-Path -LiteralPath $p) { Unblock-File -LiteralPath $p -ErrorAction SilentlyContinue }"
start "" "%OUFEIDUN_INSTALLER%"
exit /b 0
