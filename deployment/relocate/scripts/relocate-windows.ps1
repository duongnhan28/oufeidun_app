. (Join-Path $PSScriptRoot 'relocate-core.ps1')
$RelocationScripts=$PSScriptRoot
$RelocationTaskNames=@('Oufeidun Local API','Oufeidun HTTPS','Oufeidun Backup')
function Read-RelocationEnv([string]$File) {
  $values=@{}
  foreach($line in Get-Content -LiteralPath $File -Encoding UTF8){if($line-match '^([^#=]+)=(.*)$'){$values[$matches[1].Trim()]=$matches[2].Trim()}}
  return $values
}
function Get-RelocationDatabase([string]$Data) {
  $result=& node (Join-Path $RelocationScripts 'check-relocation-db.cjs') (Join-Path $Data 'app') (Join-Path $Data 'config\server.env')
  if($LASTEXITCODE-ne0){throw 'Khong kiem tra duoc MySQL; chua thay cau hinh DB.'}
  return ($result|ConvertFrom-Json)
}
function Copy-RelocationTree([string]$Source,[string]$Destination) {
  Assert-RelocationTree $Source
  $copyOutput=& robocopy.exe $Source $Destination /E /COPY:DAT /DCOPY:DAT /XJ /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
  $copyCode=$LASTEXITCODE
  if($copyCode-ge8){throw 'Robocopy that bai. Giu nguyen nguon.'}
}
function Protect-RelocationDirectory([string]$Directory) {
  $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  & icacls.exe $Directory /inheritance:r /grant:r "*${sid}:(OI)(CI)(F)" '*S-1-5-18:(OI)(CI)(F)' '*S-1-5-32-544:(OI)(CI)(F)'|Out-Null
  if($LASTEXITCODE-ne0){throw 'Khong thiet lap duoc quyen thu muc rieng.'}
}
function Stop-RelocationTasks($Context) {
  foreach($name in $RelocationTaskNames){Disable-ScheduledTask -TaskName $name -ErrorAction Stop|Out-Null;Stop-ScheduledTask -TaskName $name -ErrorAction Stop}
  for($i=0;$i-lt30;$i++){
    $running=@(Get-ScheduledTask -TaskName $RelocationTaskNames|Where-Object {$_.State-eq'Running'})
    $ports=@(Get-NetTCPConnection -LocalPort $Context.Preflight.Port,443 -State Listen -ErrorAction SilentlyContinue)
    if(-not$running.Count-and-not$ports.Count){return}
    Start-Sleep -Milliseconds 500
  }
  throw 'API/HTTPS/backup chua dung han; khong copy khi dich vu con chay.'
}
function Restore-RelocationTasks($Context) {
  foreach($snapshot in $Context.Snapshots){Register-ScheduledTask -TaskName $snapshot.Name -TaskPath $snapshot.Path -Xml $snapshot.Xml -Force -ErrorAction Stop|Out-Null}
  foreach($snapshot in $Context.Snapshots){if($snapshot.WasRunning){Start-ScheduledTask -TaskName $snapshot.Name -TaskPath $snapshot.Path -ErrorAction Stop}}
  $api=$Context.Snapshots|Where-Object {$_.Name-eq'Oufeidun Local API'}
  if($api.WasRunning){
    for($i=0;$i-lt30;$i++){
      try{$health=Invoke-RestMethod "http://127.0.0.1:$($Context.Preflight.Port)/health" -TimeoutSec 2;if($health.ok-and$health.version-eq$Context.Preflight.Version){return}}catch{}
      Start-Sleep -Milliseconds 500
    }
    throw 'Da tra task cu nhung API cu chua san sang.'
  }
}
function Get-WindowsRelocationAdapter {
  return @{
    Preflight={param($c)
      foreach($file in @('config\server.env','app\package.json','run-api.cmd','run-caddy.cmd','Caddyfile','bin\caddy.exe')){if(-not(Test-Path -LiteralPath (Join-Path $c.OldData $file))){throw 'Folder du lieu thieu config/API/launcher/Caddy.'}}
      foreach($file in @('01-MAY-CHU\app\package.json','02-MAY-CLIENT\MO-APP.bat')){if(-not(Test-Path -LiteralPath (Join-Path $c.OldBundle $file))){throw 'Chon folder bo ban giao chua 01-MAY-CHU va 02-MAY-CLIENT.'}}
      $cfg=Read-RelocationEnv (Join-Path $c.OldData 'config\server.env')
      if($cfg.MYSQL_HOST-notin@('127.0.0.1','localhost','::1')){throw 'Cong cu nay chi danh cho MySQL local tren may chu.'}
      if((Get-RelocationPath $cfg.OUFEIDUN_DATA_DIR)-ne$c.OldData){throw 'OUFEIDUN_DATA_DIR khong khop nguon.'}
      $version=(Get-Content -LiteralPath (Join-Path $c.OldData 'app\package.json') -Raw|ConvertFrom-Json).version
      $kitVersion=(Get-Content -LiteralPath (Join-Path $c.OldBundle '01-MAY-CHU\app\package.json') -Raw|ConvertFrom-Json).version
      if($version-ne$kitVersion){throw 'API va bo ban giao khac version. Cap nhat may chu xong truoc khi gom folder.'}
      $port=if($cfg.OUFEIDUN_PORT){[int]$cfg.OUFEIDUN_PORT}else{8787}
      $hostMatch=[regex]::Match((Get-Content -LiteralPath (Join-Path $c.OldData 'Caddyfile') -Raw),'(?m)^\s*([a-zA-Z0-9.-]+\.home\.arpa)\s*\{')
      if(-not$hostMatch.Success){throw 'Khong doc duoc hostname .home.arpa trong Caddyfile.'}
      $hostName=$hostMatch.Groups[1].Value
      $health=Invoke-RestMethod "http://127.0.0.1:$port/health" -TimeoutSec 5
      if(-not$health.ok-or$health.version-ne$version){throw 'API hien tai chua san sang/dung version.'}
      $https=Invoke-RestMethod "https://$hostName/health" -TimeoutSec 5
      if(-not$https.ok){throw 'HTTPS hien tai chua san sang.'}
      if(Get-Process Oufeidun -ErrorAction SilentlyContinue){throw 'Dong Oufeidun tren may chu va tat ca may ban hang truoc.'}
      $database=Get-RelocationDatabase $c.OldData
      $mysqlPath=Get-RelocationPath $database.mysqlDataDir
      foreach($path in @($c.OldData,$c.OldBundle,$c.NewRoot)){if((Test-RelocationInside $mysqlPath $path)-or(Test-RelocationInside $path $mysqlPath)){throw 'MySQL datadir nam trong/long thu muc se copy. Khong ho tro; can tach MySQL truoc.'}}
      $bytes=[long]0
      foreach($path in @($c.OldData,$c.OldBundle)){$bytes+=[long](Get-ChildItem -LiteralPath $path -Recurse -File -Force|Measure-Object Length -Sum).Sum}
      $drive=[IO.DriveInfo]::new([IO.Path]::GetPathRoot($c.NewRoot))
      if($drive.AvailableFreeSpace-lt(2*$bytes+3*[long]$database.dbBytes+512MB)){throw 'Khong du dung luong cho copy va backup; chua dung dich vu.'}
      return [pscustomobject]@{Port=$port;HostName=$hostName;Version=$version;Database=$database}
    }
    Snapshot={param($c)
      foreach($task in Get-ScheduledTask){
        if($task.TaskName-notin$RelocationTaskNames-or$task.TaskPath-ne'\'){
          foreach($action in $task.Actions){foreach($value in @($action.Execute,$action.Arguments,$action.WorkingDirectory)){
            if($value-and($value.IndexOf($c.OldData,[StringComparison]::OrdinalIgnoreCase)-ge0-or$value.IndexOf($c.OldBundle,[StringComparison]::OrdinalIgnoreCase)-ge0)){throw 'Co task khac tham chieu folder cu. Can kiem tra truoc khi gom.'}
          }}
        }
      }
      foreach($name in $RelocationTaskNames){
        $task=Get-ScheduledTask -TaskName $name -TaskPath '\' -ErrorAction Stop
        if($task.Principal.UserId-notin@('SYSTEM','S-1-5-18','NT AUTHORITY\SYSTEM','LocalSystem')){throw 'Chi ho tro task Oufeidun chay SYSTEM nhu bo cai goc.'}
        if($name-ne'Oufeidun Backup'-and-not$task.Settings.Enabled){throw 'API/HTTPS task dang bi disable; sua hoat dong hien tai truoc.'}
        $xml=Export-ScheduledTask -TaskName $name -TaskPath '\' -ErrorAction Stop
        $doc=[xml]$xml
        $actions=@($doc.SelectNodes("//*[local-name()='Exec']/*")|ForEach-Object {$_.InnerText})-join' '
        if($actions.IndexOf($c.OldData,[StringComparison]::OrdinalIgnoreCase)-lt0){throw 'Task Oufeidun khong tro ve folder du lieu da chon.'}
        [pscustomobject]@{Name=$name;Path='\';WasRunning=($task.State-eq'Running');Xml=$xml}
      }
    }
    Confirm={param($c)
      Write-Host "DU LIEU CU: $($c.OldData)"
      Write-Host "BO CAI CU: $($c.OldBundle)"
      Write-Host "DICH MOI: $($c.NewRoot)"
      Write-Host 'Tam dung ban hang; giu MySQL/DB, IP, hostname, CA. Khong xoa 2 folder cu.' -ForegroundColor Yellow
      return ((Read-Host 'Dong app tren TAT CA may. Nhap GOM THU MUC de bat dau (Enter huy)')-ceq'GOM THU MUC')
    }
    ProtectState={param($c) Protect-RelocationDirectory $c.StateDir}
    ProtectData={param($c) Protect-RelocationDirectory $c.NewData}
    Quiesce={param($c) Stop-RelocationTasks $c}
    BackupOld={param($c) & (Join-Path $RelocationScripts 'backup-server.ps1') -EnvFile (Join-Path $c.OldData 'config\server.env') -PassThru}
    Copy={param($c) Copy-RelocationTree $c.OldData $c.NewData;Copy-RelocationTree $c.OldBundle $c.NewBundle}
    ValidateNew={param($c)
      $oldCfg=Read-RelocationEnv (Join-Path $c.OldData 'config\server.env')
      $cfg=Read-RelocationEnv (Join-Path $c.NewData 'config\server.env')
      foreach($key in $oldCfg.Keys){if($key-notin@('OUFEIDUN_DATA_DIR','MYSQLDUMP_EXE','OUFEIDUN_SERVER_ENV')-and$cfg[$key]-cne$oldCfg[$key]){throw 'Cau hinh DB/account da thay doi ngoai du kien.'}}
      $database=Get-RelocationDatabase $c.NewData
      if($database.mysqlDataDir-ne$c.Preflight.Database.mysqlDataDir){throw 'MySQL datadir thay doi ngoai du kien.'}
      if((Get-RelocationPath $cfg.OUFEIDUN_DATA_DIR)-ne$c.NewData){throw 'Env chua chuyen ve du lieu moi.'}
      foreach($relative in @('run-api.cmd','run-caddy.cmd','Caddyfile')){
        $text=Get-Content -LiteralPath (Join-Path $c.NewData $relative) -Raw -Encoding UTF8
        if($text.IndexOf($c.OldData,[StringComparison]::OrdinalIgnoreCase)-ge0){throw 'Con duong dan runtime cu; chua chuyen dich vu.'}
      }
    }
    InstallTasks={param($c)
      foreach($task in $c.Snapshots){
        $xml=Convert-RelocationTaskXml $task.Xml $c
        Register-ScheduledTask -TaskName $task.Name -TaskPath $task.Path -Xml $xml -Force -ErrorAction Stop|Out-Null
      }
    }
    StartNew={param($c)
      foreach($name in @('Oufeidun Local API','Oufeidun HTTPS')){Start-ScheduledTask -TaskName $name -ErrorAction Stop}
    }
    Health={param($c)
      $ready=$false
      for($i=0;$i-lt30;$i++){
        try{
          $api=Invoke-RestMethod "http://127.0.0.1:$($c.Preflight.Port)/health" -TimeoutSec 2
          $https=Invoke-RestMethod "https://$($c.Preflight.HostName)/health" -TimeoutSec 2
          if($api.ok-and$https.ok-and$api.version-eq$c.Preflight.Version-and$https.version-eq$c.Preflight.Version){$ready=$true;break}
        }catch{}
        Start-Sleep -Milliseconds 500
      }
      if(-not$ready){throw 'API/HTTPS tai vi tri moi khong san sang.'}
      if($c.Preflight.Database.imageId){
        $image=Invoke-WebRequest "https://$($c.Preflight.HostName)/api/images/$($c.Preflight.Database.imageId)" -UseBasicParsing -TimeoutSec 10
        if($image.StatusCode-ne200-or$image.Headers['Content-Type']-notlike'image/*'-or$image.RawContentLength-le0){throw 'Kiem tra anh local khong dat.'}
      }
      foreach($task in $c.Snapshots){
        $current=Get-ScheduledTask -TaskName $task.Name -TaskPath $task.Path
        foreach($action in $current.Actions){foreach($value in @($action.Execute,$action.Arguments,$action.WorkingDirectory)){
          if($value-and$value.IndexOf($c.OldData,[StringComparison]::OrdinalIgnoreCase)-ge0){throw 'Task van tro vao nguon cu.'}
        }}
      }
    }
    BackupNew={param($c) & (Join-Path $RelocationScripts 'backup-server.ps1') -EnvFile (Join-Path $c.NewData 'config\server.env') -PassThru}
    PreserveUploads={param($c)
      $newUploads=Join-Path $c.NewData 'uploads'
      if(Test-Path -LiteralPath $newUploads){Copy-RelocationTree $newUploads (Join-Path $c.OldData 'uploads')}
    }
    Restore={param($c) Restore-RelocationTasks $c}
    CheckRecovery={param($c)
      foreach($name in $RelocationTaskNames){
        $task=Get-ScheduledTask -TaskName $name -TaskPath '\' -ErrorAction Stop
        $actions=($task.Actions|ForEach-Object {"$($_.Execute) $($_.Arguments) $($_.WorkingDirectory)"})-join' '
        if($actions.IndexOf($c.OldData,[StringComparison]::OrdinalIgnoreCase)-lt0-and$actions.IndexOf($c.NewData,[StringComparison]::OrdinalIgnoreCase)-lt0){throw 'Task hien tai da doi ngoai cong cu; khong tu ghi de.'}
      }
    }
    ConfirmRecovery={param($c)
      Write-Host "Khoi phuc dich vu ve: $($c.OldData)" -ForegroundColor Yellow
      return ((Read-Host 'Dong app cac may. Nhap KHOI PHUC de tiep tuc')-ceq'KHOI PHUC')
    }
  }
}
