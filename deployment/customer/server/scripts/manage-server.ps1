[CmdletBinding()]
param([ValidateSet('start','restart','check','configure','backup','stop','export')][string]$Action='check',[string]$DataDir='',[switch]$NoPrompt)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'existing-server.ps1')
. (Join-Path $PSScriptRoot 'discovery-server.ps1')
$serverFolder=Split-Path -Parent $PSScriptRoot
$profile=Resolve-ExistingServer $serverFolder $DataDir -NoPrompt:$NoPrompt
Write-Host "Du lieu: $($profile.DataDir)"
Write-Host "Database: $($profile.Config.MYSQL_DATABASE) | MySQL: $($profile.Config.MYSQL_HOST):$($profile.Config.MYSQL_PORT)"
Write-Host "Dia chi: https://$($profile.HostName)"
if($Action-ne 'check'){Assert-ServerAdmin}
function Wait-Api {
  for($attempt=0;$attempt-lt 30;$attempt++){
    try{
      $health=Invoke-RestMethod "http://127.0.0.1:$($profile.Port)/health" -TimeoutSec 2
      $expected=(Get-Content -LiteralPath (Join-Path $profile.DataDir 'app\package.json') -Raw|ConvertFrom-Json).version
      $requiresVersion=([version]$expected-ge[version]'0.2.12')-or(Test-Path -LiteralPath (Join-Path $profile.DataDir 'app\src\discovery.cjs'))
      if($health.ok-and($health.version-eq$expected-or(-not $health.version-and-not $requiresVersion))){return}
    }catch{}
    Start-Sleep -Seconds 1
  }
  throw 'API chua san sang. Chay KIEM-TRA-LOI.bat de xem buoc bi loi.'
}
function Start-Existing {
  $serviceName=if($profile.Info.mysqlService){[string]$profile.Info.mysqlService}else{(Get-Service|Where-Object {$_.Name-like 'MySQL*'}|Select-Object -First 1).Name}
  if(-not $serviceName){throw 'Khong tim thay service MySQL; kiem tra ban cai cu.'}
  $service=Get-Service -Name $serviceName
  Set-Service -Name $serviceName -StartupType Automatic
  if($service.Status-ne 'Running'){Start-Service -Name $serviceName}
  (Get-Service -Name $serviceName).WaitForStatus('Running',[TimeSpan]::FromSeconds(60))
  Test-ExistingDatabase $profile
  Enable-ServerDiscovery $profile.DataDir $profile.HostName $profile.Info.allowedNetworks
  Ensure-ExistingTasks
  foreach($name in @('Oufeidun Local API','Oufeidun HTTPS')){
    $task=Get-ScheduledTask -TaskName $name -ErrorAction Stop
    if($task.State-ne 'Running'){Start-ScheduledTask -TaskName $name}
    if($name-eq 'Oufeidun Local API'){Wait-Api}
  }
  for($attempt=0;$attempt-lt 20;$attempt++){
    try{$health=Invoke-RestMethod "https://$($profile.HostName)/health" -TimeoutSec 2;if($health.ok){Write-Host 'May chu san sang.' -ForegroundColor Green;return}}catch{}
    Start-Sleep 1
  }
  throw 'API da chay nhung HTTPS chua san sang. Kiem tra chung chi va tac vu HTTPS.'
}
function Ensure-ExistingTasks {
  $node=(Get-Command node -ErrorAction Stop).Source
  $api=Join-Path $profile.DataDir 'run-api.cmd'
  $https=Join-Path $profile.DataDir 'run-caddy.cmd'
  $caddy=Join-Path $profile.DataDir 'bin\caddy.exe'
  if(-not(Test-Path -LiteralPath $caddy)){throw 'Thieu caddy.exe trong thu muc du lieu cu.'}
  if(-not(Test-Path -LiteralPath (Join-Path $profile.DataDir 'Caddyfile'))){throw 'Thieu Caddyfile; khong tu ghi de hostname cu.'}
  $trigger=New-ScheduledTaskTrigger -AtStartup
  $settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
  foreach($name in @('Oufeidun Local API','Oufeidun HTTPS')){
    if(-not(Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue)){
      if($name-eq 'Oufeidun Local API'){
        [IO.File]::WriteAllText($api,"@echo off`r`nchcp 65001 >nul`r`nset `"OUFEIDUN_SERVER_ENV=$($profile.EnvFile)`"`r`n`"$node`" `"$($profile.DataDir)\app\src\index.cjs`"`r`n",[Text.UTF8Encoding]::new($false))
        $runner=$api
      }else{
        [IO.File]::WriteAllText($https,"@echo off`r`nchcp 65001 >nul`r`nset `"XDG_DATA_HOME=$($profile.DataDir)\caddy-data`"`r`n`"$caddy`" run --config `"$($profile.DataDir)\Caddyfile`" --adapter caddyfile`r`n",[Text.UTF8Encoding]::new($false))
        $runner=$https
      }
      Register-ScheduledTask -TaskName $name -Action (New-ScheduledTaskAction -Execute $runner -WorkingDirectory $profile.DataDir) -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force|Out-Null
    }
  }
  $backupScript=Join-Path $profile.DataDir 'app\backup-server.ps1'
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'backup-server.ps1') -Destination $backupScript -Force
  Copy-Item -LiteralPath $backupScript -Destination (Join-Path $profile.DataDir 'app\backup-local-server.ps1') -Force
  if(Test-Path -LiteralPath (Join-Path $profile.DataDir 'config\drive-backup\drive-settings.json')){
    foreach($name in @('drive-backup-core.ps1','upload-drive.ps1')){
      Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $profile.DataDir "tools\drive-backup\$name") -Force
    }
  }
  if(-not(Get-ScheduledTask -TaskName 'Oufeidun Backup' -ErrorAction SilentlyContinue)){
    $backupAction=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -EnvFile `"$($profile.EnvFile)`"" -WorkingDirectory $profile.DataDir
    Register-ScheduledTask -TaskName 'Oufeidun Backup' -Action $backupAction -Trigger (New-ScheduledTaskTrigger -Daily -At '23:00') -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable) -User 'SYSTEM' -RunLevel Highest -Force|Out-Null
  }
}
switch($Action){
  'check' {
    $lines=New-Object System.Collections.Generic.List[string]
    $lines.Add("Thoi gian: $(Get-Date -Format o)")
    $lines.Add("Du lieu: $($profile.DataDir)")
    $lines.Add("Hostname: $($profile.HostName)")
    $failed=$false
    foreach($name in @('Oufeidun Local API','Oufeidun HTTPS','Oufeidun Backup')){
      $task=Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
      $lines.Add("$name : $(if($task){$task.State}else{'KHONG TIM THAY'})")
      if(-not $task){$failed=$true}
    }
    try{Test-ExistingDatabase $profile;$lines.Add('Database: OK')}catch{$lines.Add('Database: LOI KET NOI');$failed=$true}
    foreach($url in @("http://127.0.0.1:$($profile.Port)/health","https://$($profile.HostName)/health")){
      try{$health=Invoke-RestMethod $url -TimeoutSec 3;if(-not $health.ok){throw 'not ready'};$lines.Add("$url : OK")}catch{$lines.Add("$url : LOI");$failed=$true}
    }
    try{
      $health=Invoke-RestMethod "http://127.0.0.1:$($profile.Port)/health" -TimeoutSec 3
      if($health.PSObject.Properties['discovery']-and-not $health.discovery){throw 'discovery not ready'}
      $lines.Add('Tu tim may chu UDP 47631: OK')
    }catch{$lines.Add('Tu tim may chu UDP 47631: CHUA SAN SANG');$failed=$true}
    $logDir=Join-Path $serverFolder 'logs';New-Item -ItemType Directory -Path $logDir -Force|Out-Null
    $logFile=Join-Path $logDir ('kiem-tra-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
    $lines|Set-Content -LiteralPath $logFile -Encoding UTF8
    $lines|ForEach-Object {Write-Host $_};Write-Host "File gui ho tro: $logFile"
    if($failed){throw "Co buoc kiem tra bi loi. Xem file: $logFile"}
  }
  'start' {Save-ExistingServer $profile;Start-Existing}
  'restart' {foreach($name in @('Oufeidun HTTPS','Oufeidun Local API')){if(Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue){Stop-ScheduledTask -TaskName $name -ErrorAction Stop}};Start-Sleep 2;Start-Existing}
  'stop' {foreach($name in @('Oufeidun HTTPS','Oufeidun Local API')){Stop-ScheduledTask -TaskName $name -ErrorAction Stop};Write-Host 'Da dung API/HTTPS Oufeidun. Database van duoc giu nguyen.'}
  'backup' {& (Join-Path $PSScriptRoot 'backup-server.ps1') -EnvFile $profile.EnvFile}
  'export' {Save-ExistingServer $profile;& (Join-Path $PSScriptRoot 'export-client.ps1')}
  'configure' {
    $cfg=$profile.Config.Clone()
    foreach($key in @('MYSQL_HOST','MYSQL_PORT','MYSQL_DATABASE','MYSQL_USER')){
      $value=Read-Host "$key [$($cfg[$key])] (Enter giu nguyen)"
      if($value){if($value-match '[\r\n]'){throw 'Gia tri khong hop le'};$cfg[$key]=$value.Trim()}
    }
    $secret=Read-Host 'Mat khau MySQL (Enter giu nguyen)' -AsSecureString
    if($secret.Length){$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret);try{$cfg.MYSQL_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}}
    $newIp=Read-Host "IP may chu [$($profile.Info.serverIp)] (Enter giu nguyen)"
    if($newIp){if(-not(Get-NetIPAddress -AddressFamily IPv4 -IPAddress $newIp -ErrorAction SilentlyContinue)){throw 'IP nay chua duoc gan cho may chu.'}}
    $candidate=Join-Path (Split-Path -Parent $profile.EnvFile) ('candidate-'+[guid]::NewGuid().ToString()+'.env')
    Copy-Item -LiteralPath $profile.EnvFile -Destination $candidate
    $candidateSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    & icacls.exe $candidate /inheritance:r /grant:r "*${candidateSid}:(F)" '*S-1-5-18:(F)' '*S-1-5-32-544:(F)'|Out-Null
    if($LASTEXITCODE-ne 0){Remove-Item -LiteralPath $candidate -Force;throw 'Khong khoa duoc quyen file cau hinh tam.'}
    try{
      [IO.File]::WriteAllLines($candidate,@($cfg.Keys|Sort-Object|ForEach-Object {"$_=$($cfg[$_])"}),[Text.UTF8Encoding]::new($false))
      Test-ExistingDatabase $profile $candidate
      Copy-Item -LiteralPath $profile.EnvFile -Destination ($profile.EnvFile+'.before-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
      [IO.File]::WriteAllText($profile.EnvFile,(Get-Content -LiteralPath $candidate -Raw),[Text.UTF8Encoding]::new($false))
      if($newIp){$profile.Info|Add-Member -NotePropertyName serverIp -NotePropertyValue $newIp -Force}
      Save-ExistingServer $profile
    }finally{Remove-Item -LiteralPath $candidate -Force -ErrorAction SilentlyContinue}
    foreach($name in @('Oufeidun HTTPS','Oufeidun Local API')){if(Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue){Stop-ScheduledTask -TaskName $name -ErrorAction Stop}}
    Start-Sleep 2;Start-Existing
    Write-Host 'Da sua cau hinh. Client moi tu tim lai IP trong cung mang. Client cu can SUA-KET-NOI.'
  }
}
