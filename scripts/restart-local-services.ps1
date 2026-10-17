[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Hãy chạy PowerShell bằng quyền Administrator.'
}

foreach ($name in @('Oufeidun Local API', 'Oufeidun HTTPS')) {
  Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName 'Oufeidun Local API'
Start-ScheduledTask -TaskName 'Oufeidun HTTPS'

$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    $response = Invoke-RestMethod 'https://oufeidun.home.arpa/health' -TimeoutSec 2
    if ($response.ok) { $healthy = $true; break }
  } catch {}
  Start-Sleep -Seconds 1
}
if (-not $healthy) { throw 'API/HTTPS không khỏe sau khi khởi động lại.' }

Start-ScheduledTask -TaskName 'Oufeidun Backup'
for ($i = 0; $i -lt 120; $i++) {
  Start-Sleep -Seconds 1
  if ((Get-ScheduledTask -TaskName 'Oufeidun Backup').State -eq 'Ready') { break }
}
$backupInfo = Get-ScheduledTaskInfo -TaskName 'Oufeidun Backup'
if ($backupInfo.LastTaskResult -ne 0) {
  throw "Scheduled Task backup lỗi: $($backupInfo.LastTaskResult)"
}
Write-Host 'API, HTTPS và Scheduled Task backup đã được kiểm tra thành công.' -ForegroundColor Green
