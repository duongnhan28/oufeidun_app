param([ValidateSet('setup','backup','check')][string]$Action='check',[string]$DataDir='')
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'existing-server.ps1')
. (Join-Path $PSScriptRoot 'drive-backup-core.ps1')
try {
  Assert-ServerAdmin
  $profile=Resolve-ExistingServer (Split-Path -Parent $PSScriptRoot) $DataDir
  $paths=Get-DrivePaths $profile.DataDir
  if($Action-eq'setup') {
    Protect-DriveDirectory $paths.Private;Protect-DriveDirectory $paths.Tools
    Install-DriveTool $paths
    foreach($name in @('drive-backup-core.ps1','upload-drive.ps1')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $paths.Tools $name) -Force}
    if(-not(Test-Path -LiteralPath $paths.Settings)) {
      $store=Read-Host "Ten cua hang (chu khong dau/so/gach, Enter = $env:COMPUTERNAME)"
      if(-not$store){$store=$env:COMPUTERNAME}
      if($store-notmatch '^[A-Za-z0-9_-]{1,80}$'){throw 'Ten cua hang chi dung chu khong dau, so, dau - hoac _.'}
      $folderId=Get-DriveFolderId (Read-Host 'Link thu muc Drive co san (Enter = Drive cua toi)')
      Write-Host 'Trinh duyet se mo. Dang nhap Google cua cua hang va cap quyen mot lan.'
      $options=@('config','create','oufeidun-drive','drive','scope','drive','config_is_local','true','--no-output')
      if($folderId){$options+=@('root_folder_id',$folderId)}
      Invoke-DriveRclone $paths $options|Out-Null
      $remoteFolder='Oufeidun-Backup/'+$store
      Invoke-DriveRclone $paths @('mkdir',('oufeidun-drive:'+$remoteFolder))|Out-Null
      Save-DriveJson $paths.Settings @{remoteFolder=$remoteFolder;rootFolderId=$folderId}
    } else {Write-Host 'Da co cau hinh Drive; giu nguyen tai khoan/thu muc cu.'}
    # Persist the post-backup hook for both old and current backup task paths.
    foreach($name in @('backup-server.ps1','backup-local-server.ps1')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'backup-server.ps1') -Destination (Join-Path $paths.Data "app\$name") -Force}
    $taskAction=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$($paths.Tools)\upload-drive.ps1`" -DataDir `"$($paths.Data)`"" -WorkingDirectory $paths.Tools
    $trigger=New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(5)) -RepetitionInterval (New-TimeSpan -Hours 1)
    Register-ScheduledTask -TaskName 'Oufeidun Drive Backup' -Action $taskAction -Trigger $trigger -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew) -User 'SYSTEM' -RunLevel Highest -Force|Out-Null
    & (Join-Path $PSScriptRoot 'backup-server.ps1') -EnvFile $profile.EnvFile
    Invoke-DriveUpload $paths.Data
    Write-Host 'Da cai backup Drive: sau moi backup va thu lai moi gio, ke ca khi chua dang nhap Windows.' -ForegroundColor Green
  } elseif($Action-eq'backup') {
    & (Join-Path $PSScriptRoot 'backup-server.ps1') -EnvFile $profile.EnvFile
    Invoke-DriveUpload $paths.Data
  } else {
    if(-not(Test-Path -LiteralPath $paths.Settings)){throw 'Chua cai backup Drive.'}
    $settings=Get-Content -LiteralPath $paths.Settings -Raw -Encoding UTF8|ConvertFrom-Json
    Invoke-DriveRclone $paths @('lsf',('oufeidun-drive:'+$settings.remoteFolder),'--dirs-only','--contimeout','15s','--timeout','30s')|Out-Null
    Write-Host "Ket noi Drive OK. Thu muc: $($settings.remoteFolder)" -ForegroundColor Green
    if(Test-Path -LiteralPath $paths.State){$state=Get-Content -LiteralPath $paths.State -Raw -Encoding UTF8|ConvertFrom-Json;Write-Host "Tai thanh cong gan nhat: $($state.lastSuccess) | Lan thu gan nhat OK: $($state.ok)"}
    Get-ScheduledTaskInfo -TaskName 'Oufeidun Drive Backup'|Select-Object LastRunTime,LastTaskResult,NextRunTime|Format-List
    Write-Host "Log: $($paths.Log)"
  }
} catch {Write-Host $_.Exception.Message -ForegroundColor Red;exit 1}
