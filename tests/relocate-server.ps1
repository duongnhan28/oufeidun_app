$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
. (Join-Path $root 'deployment\relocate\scripts\relocate-core.ps1')
$sandbox=Join-Path $root ('.local\relocation '+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $sandbox -Force|Out-Null
function Assert($Condition,[string]$Message){if(-not$Condition){throw $Message}}
foreach($case in @('success','cancel','preflight-fail','snapshot-fail','stop-fail','backup-fail','backup-corrupt','copy-fail','checksum-fail','validate-fail','task-fail','health-fail','new-backup-fail','restore-fail')){
  $caseDir=Join-Path $sandbox $case
  $script:sourceData=Join-Path $caseDir 'old data & store'
  $script:sourceBundle=Join-Path $caseDir 'Oufeidun-Local-0.2.14'
  $script:targetRoot=Join-Path $caseDir 'new root & store'
  $script:currentCase=$case;$script:events=[Collections.Generic.List[string]]::new()
  $script:switches=@{}
  New-Item -ItemType Directory -Path (Join-Path $sourceData 'config'),(Join-Path $sourceData 'uploads\products'),(Join-Path $sourceData 'caddy-data'),(Join-Path $sourceBundle '01-MAY-CHU'),(Join-Path $sourceBundle '02-MAY-CLIENT') -Force|Out-Null
  New-Item -ItemType Directory -Path (Join-Path $sourceData 'app') -Force|Out-Null
  '{"version":"0.2.14"}'|Set-Content (Join-Path $sourceData 'app\package.json')
  "OUFEIDUN_DATA_DIR=$sourceData`r`nMYSQL_DATABASE=relocation_test`r`nMYSQL_PASSWORD=fixture-only-$sourceData"|Set-Content (Join-Path $sourceData 'config\server.env') -Encoding UTF8
  "@echo off`r`nset `"OUFEIDUN_SERVER_ENV=$sourceData\config\server.env`"`r`nnode `"$sourceData\app\src\index.cjs`""|Set-Content (Join-Path $sourceData 'run-api.cmd')
  "@echo off`r`nset `"XDG_DATA_HOME=$sourceData\caddy-data`"`r`ncaddy --config `"$sourceData\Caddyfile`""|Set-Content (Join-Path $sourceData 'run-caddy.cmd')
  "custom.home.arpa {`r`n reverse_proxy 127.0.0.1:8799`r`n}"|Set-Content (Join-Path $sourceData 'Caddyfile')
  'unchanged image'|Set-Content (Join-Path $sourceData 'uploads\products\original.jpg')
  'unchanged private key'|Set-Content (Join-Path $sourceData 'caddy-data\private.key')
  @{dataDir=$sourceData;hostName='custom.home.arpa';serverIp='192.168.88.119'}|ConvertTo-Json|Set-Content (Join-Path $sourceBundle '01-MAY-CHU\server-info.json')
  $script:originalEnv=Get-Content (Join-Path $sourceData 'config\server.env') -Raw
  $adapter=@{
    Preflight={param($c) $events.Add('preflight');if($currentCase-eq'preflight-fail'){throw 'fixture'};[pscustomobject]@{HostName='custom.home.arpa';Port=8799;Version='0.2.14'}}
    Snapshot={param($c) $events.Add('snapshot');if($currentCase-eq'snapshot-fail'){throw 'snapshot fixture'};foreach($name in @('Oufeidun Local API','Oufeidun HTTPS','Oufeidun Backup')){
      $document=[xml]'<Task xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><Triggers><CalendarTrigger><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger></Triggers><Principals><Principal><UserId>SYSTEM</UserId></Principal></Principals><Settings><Enabled>true</Enabled></Settings><Actions><Exec><Command></Command><Arguments></Arguments><WorkingDirectory></WorkingDirectory></Exec></Actions></Task>'
      $exec=$document.Task.Actions.Exec
      $exec.Command="$($c.OldData)\run-api.cmd"
      $exec.Arguments="-File `"$($c.OldData)\app\backup-server.ps1`" -EnvFile `"$($c.OldData)\config\server.env`""
      $exec.WorkingDirectory=$c.OldData
      [pscustomobject]@{Name=$name;Path='\';WasRunning=($name-ne'Oufeidun Backup');Xml=$document.OuterXml}
    }}
    Confirm={param($c) $events.Add('confirm');$currentCase-ne'cancel'}
    ProtectState={param($c) $events.Add('protect-state')}
    ProtectData={param($c) $events.Add('protect-data')}
    Quiesce={param($c) $events.Add('stop');if($currentCase-eq'stop-fail'){throw 'port fixture'}}
    BackupOld={param($c) $events.Add('backup-old');if($currentCase-eq'backup-fail'){throw 'backup fixture'};$backup=New-TestBackup $c.OldData;if($currentCase-eq'backup-corrupt'){('changed '*50)|Set-Content (Join-Path $backup.Directory 'database.sql')};$backup}
    Copy={param($c) $events.Add('copy');if($currentCase-eq'copy-fail'){throw 'copy fixture'};Get-ChildItem -LiteralPath $c.OldData -Force|ForEach-Object {Copy-Item -LiteralPath $_.FullName -Destination $c.NewData -Recurse};Copy-Item -LiteralPath $c.OldBundle -Destination $c.NewBundle -Recurse;if($currentCase-eq'checksum-fail'){'corrupted'|Set-Content (Join-Path $c.NewData 'uploads\products\original.jpg')}}
    ValidateNew={param($c)
      $events.Add('validate')
      if($currentCase-eq'validate-fail'){throw 'validate fixture'}
      $text=Get-Content (Join-Path $c.NewData 'config\server.env') -Raw
      Assert ($text.Contains($c.NewData)) 'New env path not applied'
      Assert ($text.Contains("MYSQL_PASSWORD=fixture-only-$($c.OldData)")) 'Credential changed'
      $info=Get-Content (Join-Path $c.NewBundle '01-MAY-CHU\server-info.json') -Raw|ConvertFrom-Json
      Assert ($info.dataDir-eq$c.NewData-and$info.hostName-eq'custom.home.arpa'-and$info.serverIp-eq'192.168.88.119') 'Metadata changed incorrectly'
      Assert ((Get-Content (Join-Path $c.NewData 'run-caddy.cmd') -Raw).Contains($c.NewData)) 'Caddy launcher path unchanged'
    }
    InstallTasks={param($c)
      $events.Add('install')
      foreach($snapshot in $c.Snapshots){
        $rewritten=[xml](Convert-RelocationTaskXml $snapshot.Xml $c)
        Assert ($rewritten.Task.Actions.Exec.WorkingDirectory-eq$c.NewData) 'Task path not rewritten'
        Assert ($rewritten.Task.Principals.Principal.UserId-eq'SYSTEM') 'Task principal changed'
        Assert ($rewritten.Task.Triggers.CalendarTrigger.ScheduleByDay.DaysInterval-eq'1') 'Backup trigger changed'
        Assert ($rewritten.Task.Actions.Exec.Arguments.Contains($c.NewData)) 'Task arguments not rewritten'
        $switches[$snapshot.Name]=$rewritten.OuterXml
        if($currentCase-eq'task-fail'){throw 'partial task fixture'}
      }
    }
    StartNew={param($c) $events.Add('start-new')}
    Health={param($c) $events.Add('health');if($currentCase-in@('health-fail','restore-fail')){'newly accepted photo'|Set-Content (Join-Path $c.NewData 'uploads\products\new.jpg');throw 'health fixture'}}
    BackupNew={param($c) $events.Add('backup-new');if($currentCase-eq'new-backup-fail'){throw 'new backup fixture'};New-TestBackup $c.NewData}
    PreserveUploads={param($c) $events.Add('preserve');Copy-Item -Path (Join-Path $c.NewData 'uploads\products\*') -Destination (Join-Path $c.OldData 'uploads\products') -Force}
    Restore={param($c) $events.Add('restore');if($currentCase-eq'restore-fail'){throw 'restore fixture'};foreach($snapshot in $c.Snapshots){$switches[$snapshot.Name]=$snapshot.Xml}}
    CheckRecovery={param($c) $events.Add('check-recovery')}
    ConfirmRecovery={param($c) $events.Add('confirm-recovery');$currentCase-ne'recovery-cancel'}
  }
  function New-TestBackup([string]$Data){
    $dir=Join-Path $Data ('backups\daily\'+[guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $dir -Force|Out-Null
    ('fixture database '*20)|Set-Content (Join-Path $dir 'database.sql')
    ((Get-FileHash (Join-Path $dir 'database.sql')).Hash+'  database.sql')|Set-Content (Join-Path $dir 'SHA256SUMS.txt')
    [pscustomobject]@{Directory=$dir}
  }
  $failed=$false
  try{$result=Invoke-ServerRelocation $sourceData $sourceBundle $targetRoot $adapter}catch{$failed=$true;if($case-eq'success'){Write-Host $_.Exception.Message}}
  if($case-eq'success'){
    Assert (-not$failed-and$result.Status-eq'complete') 'Success did not finish'
    Assert ($events[-1]-eq'backup-new') 'New location backup not tested'
    Assert ((Get-Content (Join-Path $targetRoot 'OufeidunServerData\caddy-data\private.key'))-eq'unchanged private key') 'CA/key changed'
  }elseif($case-eq'cancel'){
    Assert (-not$failed-and$result.Status-eq'cancelled'-and-not(Test-Path $targetRoot)) 'Cancel created destination'
    Assert (-not($events-contains'stop')) 'Cancel stopped services'
  }elseif($case-in@('preflight-fail','snapshot-fail')){
    Assert ($failed-and-not(Test-Path $targetRoot)-and-not($events-contains'stop')) 'Preflight failure mutated state'
  }else{
    Assert $failed "Failure was swallowed: $case"
    Assert ($events[-1]-eq'restore') "No rollback attempted: $case"
    if($case-in@('stop-fail','backup-fail','backup-corrupt','copy-fail','checksum-fail','validate-fail')){Assert (-not($events-contains'install')) 'Switched before checks passed'}
    if($case-in@('health-fail','restore-fail')){Assert (Test-Path (Join-Path $sourceData 'uploads\products\new.jpg')) 'New upload lost on rollback'}
    $status=(Get-Content (Join-Path $targetRoot '.relocation\state.json') -Raw|ConvertFrom-Json).status
    Assert ($status-eq$(if($case-eq'restore-fail'){'rollback-failed'}else{'rolled-back'})) 'Wrong persisted failure state'
    if($case-ne'restore-fail'){foreach($xml in $switches.Values){Assert (([xml]$xml).Task.Actions.Exec.WorkingDirectory-eq$sourceData) 'Partial task changes not restored'}}
  }
  Assert ((Get-Content (Join-Path $sourceData 'config\server.env') -Raw)-ceq$originalEnv) 'Old env changed'
  Assert ((Test-Path -LiteralPath $sourceData)-and(Test-Path -LiteralPath $sourceBundle)) 'Source folder deleted'
  Write-Output "PASS relocation: $case"
}
$recoveryRoot=Join-Path $sandbox 'success\new root & store'
$events.Clear();$currentCase='success';$rejected=$false
try{Invoke-ServerRelocationRecovery $recoveryRoot $adapter|Out-Null}catch{$rejected=$true}
Assert ($rejected-and-not($events-contains'stop')) 'Recovery accepted completed move'
$stateFile=Join-Path $recoveryRoot '.relocation\state.json'
$state=Get-Content $stateFile -Raw|ConvertFrom-Json;$state.status='switching'
Write-RelocationText $stateFile ($state|ConvertTo-Json -Depth 6)
'new photo after crash'|Set-Content (Join-Path $recoveryRoot 'OufeidunServerData\uploads\products\after-crash.jpg')
$events.Clear();$currentCase='recovery-cancel'
$result=Invoke-ServerRelocationRecovery $recoveryRoot $adapter
Assert ($result.Status-eq'cancelled'-and-not($events-contains'stop')) 'Cancelled recovery changed services'
$events.Clear();$currentCase='success'
$result=Invoke-ServerRelocationRecovery $recoveryRoot $adapter
Assert ($result.Status-eq'rolled-back'-and($events-join',')-eq'check-recovery,confirm-recovery,stop,preserve,restore') 'Recovery order incorrect'
Assert (Test-Path (Join-Path $sandbox 'success\old data & store\uploads\products\after-crash.jpg')) 'Recovery lost new photo'
Write-Output 'PASS relocation recovery: completed move blocked, cancel, interrupted switch, retained new photo'
# Refuse overlap/root/relative/reparse and existing destination before stopping anything.
foreach($bad in @('relative','C:\',($sourceData+'\nested'),$caseDir,(Join-Path $sandbox '%unsafe%'))){
  $rejected=$false
  try{Invoke-ServerRelocation $sourceData $sourceBundle $bad $adapter|Out-Null}catch{$rejected=$true}
  Assert $rejected 'Unsafe destination accepted'
}
$junction=Join-Path $sourceData 'linked'
New-Item -ItemType Junction -Path $junction -Target $sourceBundle|Out-Null
$rejected=$false
try{Assert-RelocationTree $sourceData}catch{$rejected=$true}
Assert $rejected 'Junction accepted'
Write-Output 'PASS relocation: unsafe paths, existing destination, junction, XML escaping and spaces'
