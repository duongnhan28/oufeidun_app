[CmdletBinding()]
param([string]$HostName = 'oufeidun.home.arpa')
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Hãy chạy PowerShell bằng quyền Administrator.' }

$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'local-paths.ps1')
$data = Find-LocalDataDir
$bin = Join-Path $data 'bin'
$caddyData = Join-Path $data 'caddy-data'
$appDir = Join-Path $data 'app'
$configDir = Join-Path $data 'config'
New-Item -ItemType Directory -Path $bin,$caddyData,$appDir,$configDir -Force | Out-Null
$node = (Get-Command node -ErrorAction Stop).Source
$caddy = Join-Path $bin 'caddy.exe'
if (-not (Test-Path -LiteralPath $caddy)) {
  Write-Host 'Đang tải Caddy chính thức...'
  Invoke-WebRequest 'https://caddyserver.com/api/download?os=windows&arch=amd64' -OutFile $caddy
}

$sourceEnv = Join-Path $root 'server\.env.local'
if (-not (Test-Path $sourceEnv)) { throw 'Chưa chạy setup-local-server.ps1.' }
foreach ($folder in @('src','mysql')) {
  $target = Join-Path $appDir $folder
  if (Test-Path $target) { Remove-Item $target -Recurse -Force }
  Copy-Item (Join-Path $root "server\$folder") $target -Recurse -Force
}
Copy-Item (Join-Path $root 'server\package.json') $appDir -Force
Copy-Item (Join-Path $root 'server\package-lock.json') $appDir -Force
& npm.cmd ci --omit=dev --prefix $appDir
if ($LASTEXITCODE -ne 0) { throw 'Không cài được thư viện Local API.' }
$runtimeEnv = Join-Path $configDir 'server.env'
Copy-Item $sourceEnv $runtimeEnv -Force
$currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $runtimeEnv /inheritance:r /grant:r "*${currentSid}:(F)" '*S-1-5-18:(F)' '*S-1-5-32-544:(F)' | Out-Null

$caddyfile = Get-Content (Join-Path $root 'server\Caddyfile') -Raw
$caddyfile = $caddyfile -replace 'oufeidun\.home\.arpa', $HostName
[IO.File]::WriteAllText((Join-Path $data 'Caddyfile'), $caddyfile, [Text.UTF8Encoding]::new($false))
$apiRunner = @"
@echo off
set "OUFEIDUN_SERVER_ENV=$runtimeEnv"
"$node" "$appDir\src\index.cjs"
"@
[IO.File]::WriteAllText((Join-Path $data 'run-api.cmd'), $apiRunner, [Text.ASCIIEncoding]::new())
$caddyRunner = @"
@echo off
set "XDG_DATA_HOME=$caddyData"
"$caddy" run --config "$data\Caddyfile" --adapter caddyfile
"@
[IO.File]::WriteAllText((Join-Path $data 'run-caddy.cmd'), $caddyRunner, [Text.ASCIIEncoding]::new())

$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
$apiAction = New-ScheduledTaskAction -Execute (Join-Path $data 'run-api.cmd') -WorkingDirectory $data
$caddyAction = New-ScheduledTaskAction -Execute (Join-Path $data 'run-caddy.cmd') -WorkingDirectory $data
Register-ScheduledTask -TaskName 'Oufeidun Local API' -Action $apiAction -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force | Out-Null
Register-ScheduledTask -TaskName 'Oufeidun HTTPS' -Action $caddyAction -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

Copy-Item (Join-Path $root 'scripts\backup-local-server.ps1') $appDir -Force
$backupAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$appDir\backup-local-server.ps1`" -EnvFile `"$runtimeEnv`"" -WorkingDirectory $appDir
$backupTrigger = New-ScheduledTaskTrigger -Daily -At '23:00'
Register-ScheduledTask -TaskName 'Oufeidun Backup' -Action $backupAction -Trigger $backupTrigger -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable) -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

$hosts = "$env:SystemRoot\System32\drivers\etc\hosts"
if (-not (Select-String -Path $hosts -SimpleMatch $HostName -Quiet)) { Add-Content -Path $hosts -Value "`r`n127.0.0.1 $HostName" }
$publicProfiles = Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' -and $_.IPv4Connectivity -ne 'Disconnected' }
foreach ($profile in $publicProfiles) {
  Set-NetConnectionProfile -InterfaceIndex $profile.InterfaceIndex -NetworkCategory Private
}
if (-not (Get-NetFirewallRule -DisplayName 'Oufeidun HTTPS LAN' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName 'Oufeidun HTTPS LAN' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443 -Profile Private -RemoteAddress LocalSubnet | Out-Null
}

$mysqlIni = (Get-ChildItem -LiteralPath $env:ProgramData -Filter my.ini -Recurse -File -ErrorAction SilentlyContinue|Where-Object {$_.FullName-match 'MySQL'}|Select-Object -First 1 -ExpandProperty FullName)
if ($mysqlIni -and (Test-Path -LiteralPath $mysqlIni)) {
  Copy-Item $mysqlIni "$mysqlIni.oufeidun-backup" -Force
  $ini = Get-Content $mysqlIni -Raw
  if ($ini -match '(?m)^\s*bind-address\s*=') { $ini = $ini -replace '(?m)^\s*bind-address\s*=.*$', 'bind-address=127.0.0.1' }
  else { $ini = $ini -replace '(?m)^\[mysqld\]\s*$', "[mysqld]`r`nbind-address=127.0.0.1" }
  if ($ini -match '(?m)^\s*mysqlx-bind-address\s*=') { $ini = $ini -replace '(?m)^\s*mysqlx-bind-address\s*=.*$', 'mysqlx-bind-address=127.0.0.1' }
  else { $ini = $ini -replace '(?m)^\[mysqld\]\s*$', "[mysqld]`r`nmysqlx-bind-address=127.0.0.1" }
  [IO.File]::WriteAllText($mysqlIni, $ini, [Text.UTF8Encoding]::new($false))
  $taskMysqlService=Get-Service|Where-Object {$_.Name-like 'MySQL*'}|Select-Object -First 1
  Restart-Service -Name $taskMysqlService.Name
}

powercfg /change standby-timeout-ac 0 | Out-Null
powercfg /change hibernate-timeout-ac 0 | Out-Null
powercfg /change monitor-timeout-ac 5 | Out-Null
Start-ScheduledTask -TaskName 'Oufeidun Local API'
Start-ScheduledTask -TaskName 'Oufeidun HTTPS'
$rootCert = Join-Path $caddyData 'caddy\pki\authorities\local\root.crt'
for ($i=0; $i -lt 30 -and -not (Test-Path $rootCert); $i++) { Start-Sleep -Seconds 1 }
if (Test-Path $rootCert) { Import-Certificate -FilePath $rootCert -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null }
else { Write-Warning 'Caddy chưa sinh root certificate. Kiểm tra tác vụ Oufeidun HTTPS.' }
Write-Host 'Đã cài tác vụ API, HTTPS, backup và cấu hình máy chủ không Sleep.' -ForegroundColor Green
