[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidatePattern('^\d{1,3}(\.\d{1,3}){3}$')][string]$ServerIp,
  [string]$HostName='oufeidun.home.arpa'
)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'local-paths.ps1')
$data=Find-LocalDataDir
$kit=Join-Path $data 'client-kit'
$certificate=Join-Path $data 'caddy-data\caddy\pki\authorities\local\root.crt'
$setup=Join-Path $root 'out\make\squirrel.windows\x64\Oufeidun-Setup.exe'
if(-not(Test-Path $certificate)){throw 'Chưa có root.crt. Hãy cài và khởi động Oufeidun HTTPS trước.'}
if(-not(Test-Path $setup)){throw 'Chưa có Oufeidun-Setup.exe. Hãy chạy build-local-client.ps1 trước.'}
if(Test-Path $kit){Remove-Item $kit -Recurse -Force}
New-Item -ItemType Directory -Path $kit|Out-Null
Copy-Item $certificate (Join-Path $kit 'root.crt')
Copy-Item $setup $kit
Copy-Item (Join-Path $root 'scripts\configure-local-client.ps1') $kit
Copy-Item (Join-Path $root 'docs\HUONG-DAN-CAI-MAY-CON.txt') $kit
Copy-Item (Join-Path $root 'docs\HUONG-DAN-TRIEN-KHAI-LAN-WIFI.md') $kit
$cmd=@"
@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell.exe -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0configure-local-client.ps1" -ServerIp "$ServerIp" -HostName "$HostName" -RootCertificate "%~dp0root.crt"
if %errorlevel% neq 0 pause & exit /b 1
start /wait "" "%~dp0Oufeidun-Setup.exe"
"@
[IO.File]::WriteAllText((Join-Path $kit 'CAI-MAY-CON.cmd'),$cmd,[Text.ASCIIEncoding]::new())
Get-ChildItem $kit -File|Get-FileHash -Algorithm SHA256|ForEach-Object{"$($_.Hash)  $($_.Path|Split-Path -Leaf)"}|Set-Content (Join-Path $kit 'SHA256SUMS.txt') -Encoding ascii
Write-Host "Bộ cài máy con: $kit" -ForegroundColor Green
