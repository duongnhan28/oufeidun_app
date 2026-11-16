@echo off
setlocal
title Oufeidun - Ket noi tu xa qua Tailscale
if not exist "%~dp0remote-access.ps1" (
  echo Thieu remote-access.ps1. Hay copy ca thu muc remote.
  pause
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0remote-access.ps1"
set "OUFEIDUN_REMOTE_EXIT=%errorlevel%"
if not "%OUFEIDUN_REMOTE_EXIT%"=="0" pause
exit /b %OUFEIDUN_REMOTE_EXIT%
