[CmdletBinding()]
param([string]$DataDir='')
$ErrorActionPreference='Stop'
try {
  . (Join-Path $PSScriptRoot 'existing-server.ps1')
  $profile=Resolve-ExistingServer (Split-Path -Parent $PSScriptRoot) $DataDir
  $health=Invoke-RestMethod "http://127.0.0.1:$($profile.Port)/health" -TimeoutSec 5
  if(-not $health.ok -or $health.service-ne 'oufeidun-local-api'){throw 'Chua ket noi duoc dung Oufeidun Local API.'}
  Write-Host "Server dang chay: $($health.version)"
  if(-not $health.capabilities -or -not $health.capabilities.stockForecast){throw 'Server dang chay chua co ton du kien. Chay CAP-NHAT.bat tren may chu, sau do kiem tra lai.'}
  Write-Host 'OK: API dang chay da ho tro ton du kien tu tat ca don nhap.' -ForegroundColor Green
  Write-Host 'Mo lai app 0.1.4, bam Tai lai du lieu. Tren the san pham phai co Trong nhap / Du kien.'
  Write-Host 'Kiem thu: ton 8 -> luu nhap 8 -> DON MOI chon 7 -> canh bao thieu 7.'
} catch {Write-Host $_.Exception.Message -ForegroundColor Red;exit 1}
