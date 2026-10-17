function Get-RelocationPath([string]$Path) {
  if(-not [IO.Path]::IsPathRooted($Path)){throw 'Can nhap duong dan day du.'}
  $full=[IO.Path]::GetFullPath($Path).TrimEnd('\')
  if($full -notmatch '^[A-Za-z]:\\.+'){throw 'Chi ho tro thu muc tren o dia local, khong dung goc o dia/UNC.'}
  if($full-match '[%!\r\n]'){throw 'Duong dan khong duoc chua %, ! hoac xuong dong.'}
  return $full
}
function Test-RelocationInside([string]$Path,[string]$Root) {
  return $Path.Equals($Root,[StringComparison]::OrdinalIgnoreCase)-or$Path.StartsWith($Root+'\',[StringComparison]::OrdinalIgnoreCase)
}
function Assert-RelocationTree([string]$Path) {
  $ancestor=$Path
  while($ancestor){
    if((Test-Path -LiteralPath $ancestor)-and((Get-Item -LiteralPath $ancestor -Force).Attributes-band[IO.FileAttributes]::ReparsePoint)){throw 'Khong ho tro junction/symlink trong duong dan.'}
    $ancestor=Split-Path -Parent $ancestor
  }
  if(Test-Path -LiteralPath $Path){
    $pending=[Collections.Generic.Queue[string]]::new();$pending.Enqueue($Path)
    while($pending.Count){
      foreach($item in Get-ChildItem -LiteralPath $pending.Dequeue() -Force){
        if($item.Attributes-band[IO.FileAttributes]::ReparsePoint){throw 'Nguon co junction/symlink; dung de tranh copy nham.'}
        if($item.PSIsContainer){$pending.Enqueue($item.FullName)}
      }
    }
  }
}
function Convert-RelocationText([string]$Text,$Context) {
  foreach($pair in @(@($Context.OldData,$Context.NewData),@($Context.OldBundle,$Context.NewBundle))){
    foreach($format in @('json','windows','slash')){
      $old=$pair[0];$replacement=$pair[1]
      if($format-eq 'json'){$old=$old.Replace('\','\\');$replacement=$replacement.Replace('\','\\')}
      if($format-eq 'slash'){$old=$old.Replace('\','/');$replacement=$replacement.Replace('\','/')}
      $Text=[regex]::Replace($Text,([regex]::Escape($old)+'(?=$|[\\/"\s])'),[Text.RegularExpressions.MatchEvaluator]{param($m) $replacement},[Text.RegularExpressions.RegexOptions]::IgnoreCase)
    }
  }
  return $Text
}
function Write-RelocationText([string]$Path,[string]$Text) {
  $temporary=$Path+'.'+[guid]::NewGuid().ToString('N')+'.tmp'
  [IO.File]::WriteAllText($temporary,$Text,[Text.UTF8Encoding]::new($false))
  if(Test-Path -LiteralPath $Path){
    $previous=$temporary+'.previous'
    [IO.File]::Replace($temporary,$Path,$previous)
    Remove-Item -LiteralPath $previous -ErrorAction Stop
  }else{[IO.File]::Move($temporary,$Path)}
}
function Convert-RelocationEnvText([string]$Text,$Context) {
  return [regex]::Replace($Text,'(?m)^(OUFEIDUN_DATA_DIR|MYSQLDUMP_EXE|OUFEIDUN_SERVER_ENV)=[^\r\n]*',[Text.RegularExpressions.MatchEvaluator]{param($m) Convert-RelocationText $m.Value $Context})
}
function Convert-RelocationTaskXml([string]$Xml,$Context) {
  $document=[xml]$Xml
  foreach($node in $document.SelectNodes("//*[local-name()='Exec']/*")){
    $node.InnerText=Convert-RelocationText $node.InnerText $Context
  }
  return $document.OuterXml
}
function Assert-RelocationCopy([string]$Source,[string]$Destination) {
  $files=@(Get-ChildItem -LiteralPath $Source -Recurse -File -Force)
  $copied=@(Get-ChildItem -LiteralPath $Destination -Recurse -File -Force)
  if($files.Count-ne$copied.Count){throw 'So file copy khong khop.'}
  foreach($file in $files){
    $relative=$file.FullName.Substring($Source.Length+1)
    $target=Join-Path $Destination $relative
    if(-not(Test-Path -LiteralPath $target)-or(Get-FileHash -LiteralPath $file.FullName).Hash-ne(Get-FileHash -LiteralPath $target).Hash){throw 'Checksum copy khong khop; chua chuyen dich vu.'}
  }
}
function Assert-RelocationBackup($Backup,[string]$DataRoot) {
  if(-not $Backup.Directory){throw 'Backup khong tra ve duong dan.'}
  $directory=Get-RelocationPath $Backup.Directory
  if(-not(Test-RelocationInside $directory (Join-Path $DataRoot 'backups'))){throw 'Backup nam ngoai thu muc du lieu.'}
  $sql=Join-Path $directory 'database.sql'
  if(-not(Test-Path -LiteralPath $sql)-or(Get-Item -LiteralPath $sql).Length-lt128-or-not(Test-Path -LiteralPath (Join-Path $directory 'SHA256SUMS.txt'))){throw 'Backup SQL/checksum chua day du.'}
  $lines=@(Get-Content -LiteralPath (Join-Path $directory 'SHA256SUMS.txt'))
  if(-not($lines-match '  database\.sql$')){throw 'Manifest backup thieu database.sql.'}
  foreach($line in $lines){
    if($line-notmatch '^([A-Fa-f0-9]{64})  ([^\\/]+)$'){throw 'Backup manifest khong hop le.'}
    $hash=$matches[1];$file=Join-Path $directory $matches[2]
    if((Get-FileHash -LiteralPath $file).Hash-ne$hash){throw 'Checksum backup khong khop.'}
  }
}
function Invoke-RelocationAdapter($Adapter,[string]$Name,$Context) {
  $operation=$Adapter[$Name]
  if(-not $operation){throw "Thieu thao tac $Name"}
  & $operation $Context
}
function Invoke-ServerRelocation([string]$OldData,[string]$OldBundle,[string]$NewRoot,$Adapter) {
  $context=[pscustomobject]@{
    OldData=(Get-RelocationPath $OldData);OldBundle=(Get-RelocationPath $OldBundle)
    NewRoot=(Get-RelocationPath $NewRoot);NewData='';NewBundle='';StateDir=''
    Preflight=$null;Snapshots=@();OldBackup=$null;NewBackup=$null
  }
  if(-not(Test-Path -LiteralPath $context.OldData)-or-not(Test-Path -LiteralPath $context.OldBundle)){throw 'Khong tim thay thu muc nguon.'}
  if(Test-Path -LiteralPath $context.NewRoot){throw 'Thu muc dich da ton tai. Khong ghi de; chon folder moi hoac kiem tra lan chuyen truoc.'}
  $paths=@($context.OldData,$context.OldBundle,$context.NewRoot)
  for($i=0;$i-lt$paths.Count;$i++){for($j=$i+1;$j-lt$paths.Count;$j++){
    if((Test-RelocationInside $paths[$i] $paths[$j])-or(Test-RelocationInside $paths[$j] $paths[$i])){throw 'Cac thu muc nguon/dich khong duoc trung hoac long nhau.'}
  }}
  foreach($path in $paths){Assert-RelocationTree $path}
  $context.NewData=Join-Path $context.NewRoot 'OufeidunServerData'
  $context.NewBundle=Join-Path $context.NewRoot (Split-Path -Leaf $context.OldBundle)
  if($context.NewBundle-eq$context.NewData){throw 'Ten folder bo cai trung voi folder du lieu.'}
  $context.StateDir=Join-Path $context.NewRoot '.relocation'
  $context.Preflight=Invoke-RelocationAdapter $Adapter 'Preflight' $context
  $context.Snapshots=@(Invoke-RelocationAdapter $Adapter 'Snapshot' $context)
  if(-not(Invoke-RelocationAdapter $Adapter 'Confirm' $context)){return [pscustomobject]@{Status='cancelled'}}
  New-Item -ItemType Directory -Path $context.NewRoot,$context.StateDir -Force|Out-Null
  Invoke-RelocationAdapter $Adapter 'ProtectState' $context
  $state=[ordered]@{status='preparing';oldData=$context.OldData;oldBundle=$context.OldBundle;newData=$context.NewData;newBundle=$context.NewBundle;time=(Get-Date -Format o);tasks=@($context.Snapshots|ForEach-Object {[ordered]@{name=$_.Name;path=$_.Path;wasRunning=$_.WasRunning}})}
  foreach($snapshot in $context.Snapshots){Write-RelocationText (Join-Path $context.StateDir ($snapshot.Name+'.xml')) $snapshot.Xml}
  Write-RelocationText (Join-Path $context.StateDir 'state.json') ($state|ConvertTo-Json)
  $quiesced=$false;$switched=$false
  try{
    $quiesced=$true
    Invoke-RelocationAdapter $Adapter 'Quiesce' $context
    $context.OldBackup=Invoke-RelocationAdapter $Adapter 'BackupOld' $context
    Assert-RelocationBackup $context.OldBackup $context.OldData
    New-Item -ItemType Directory -Path $context.NewData -Force|Out-Null
    Invoke-RelocationAdapter $Adapter 'ProtectData' $context
    Invoke-RelocationAdapter $Adapter 'Copy' $context
    Assert-RelocationCopy $context.OldData $context.NewData
    Assert-RelocationCopy $context.OldBundle $context.NewBundle
    foreach($relative in @('config\server.env','run-api.cmd','run-caddy.cmd','Caddyfile')){
      $file=Join-Path $context.NewData $relative
      if(-not(Test-Path -LiteralPath $file)){throw 'Ban copy thieu config/launcher.'}
      $raw=Get-Content -LiteralPath $file -Raw -Encoding UTF8
      $content=if($relative-eq'config\server.env'){Convert-RelocationEnvText $raw $context}else{Convert-RelocationText $raw $context}
      if($relative-like '*.cmd'-and$content-notmatch '(?i)chcp\s+65001'){$content="@chcp 65001 >nul`r`n"+$content}
      Write-RelocationText $file $content
    }
    # Only known runtime scripts/config are rewritten; historical backups remain untouched.
    $info=Join-Path $context.NewBundle '01-MAY-CHU\server-info.json'
    if(Test-Path -LiteralPath $info){$metadata=(Convert-RelocationText (Get-Content -LiteralPath $info -Raw -Encoding UTF8) $context)|ConvertFrom-Json}else{$metadata=[pscustomobject]@{hostName=$context.Preflight.HostName}}
    $metadata|Add-Member -NotePropertyName dataDir -NotePropertyValue $context.NewData -Force
    Write-RelocationText $info ($metadata|ConvertTo-Json -Depth 12)
    Invoke-RelocationAdapter $Adapter 'ValidateNew' $context
    $switched=$true
    $state.status='switching'
    Write-RelocationText (Join-Path $context.StateDir 'state.json') ($state|ConvertTo-Json -Depth 6)
    Invoke-RelocationAdapter $Adapter 'InstallTasks' $context
    Invoke-RelocationAdapter $Adapter 'StartNew' $context
    Invoke-RelocationAdapter $Adapter 'Health' $context
    $context.NewBackup=Invoke-RelocationAdapter $Adapter 'BackupNew' $context
    Assert-RelocationBackup $context.NewBackup $context.NewData
    $state.status='complete';$state.backup=$context.NewBackup.Directory
    Write-RelocationText (Join-Path $context.StateDir 'state.json') ($state|ConvertTo-Json)
    return [pscustomobject]@{Status='complete';NewRoot=$context.NewRoot;Backup=$context.NewBackup.Directory}
  }catch{
    $original=$_.Exception.Message
    if($quiesced){
      try{
        if($switched){
          Invoke-RelocationAdapter $Adapter 'Quiesce' $context
          # Database stays in place; preserve any upload accepted during the health window.
          Invoke-RelocationAdapter $Adapter 'PreserveUploads' $context
        }
        Invoke-RelocationAdapter $Adapter 'Restore' $context
        $state.status='rolled-back'
      }catch{$state.status='rollback-failed';Write-Host 'KHONG THE KHOI PHUC TU DONG. Giu ca hai ban, ngung thao tac va lien he ho tro.' -ForegroundColor Red}
    }else{$state.status='failed'}
    Write-RelocationText (Join-Path $context.StateDir 'state.json') ($state|ConvertTo-Json)
    throw "Chuyen thu muc that bai ($($state.status)): $original"
  }
}
function Invoke-ServerRelocationRecovery([string]$NewRoot,$Adapter) {
  $NewRoot=Get-RelocationPath $NewRoot
  Assert-RelocationTree $NewRoot
  $stateDir=Join-Path $NewRoot '.relocation'
  $file=Join-Path $stateDir 'state.json'
  $state=Get-Content -LiteralPath $file -Raw -Encoding UTF8|ConvertFrom-Json
  if($state.status-notin@('preparing','switching','rollback-failed')){throw 'Lan chuyen da hoan thanh/da quay lai. Khong dung phuc hoi khan cap cho trang thai nay.'}
  $oldData=Get-RelocationPath $state.oldData;$oldBundle=Get-RelocationPath $state.oldBundle
  $newData=Get-RelocationPath $state.newData;$newBundle=Get-RelocationPath $state.newBundle
  if($newData-ne(Join-Path $NewRoot 'OufeidunServerData')-or$newBundle-ne(Join-Path $NewRoot (Split-Path -Leaf $oldBundle))){throw 'State folder khong khop; dung de kiem tra.'}
  foreach($old in @($oldData,$oldBundle)){
    if(-not(Test-Path -LiteralPath $old)-or(Test-RelocationInside $old $NewRoot)-or(Test-RelocationInside $NewRoot $old)){throw 'Nguon cu khong hop le.'}
    Assert-RelocationTree $old
  }
  $snapshots=@()
  foreach($name in @('Oufeidun Local API','Oufeidun HTTPS','Oufeidun Backup')){
    $record=@($state.tasks|Where-Object {$_.name-eq$name-and$_.path-eq'\'})
    if($record.Count-ne1){throw 'Thieu thong tin task goc.'}
    $xml=Get-Content -LiteralPath (Join-Path $stateDir ($name+'.xml')) -Raw -Encoding UTF8
    $doc=[xml]$xml
    if(-not($doc.SelectNodes("//*[local-name()='Exec']/*")|Where-Object {$_.InnerText.IndexOf($oldData,[StringComparison]::OrdinalIgnoreCase)-ge0})){throw 'XML task cu khong khop nguon.'}
    $snapshots+=[pscustomobject]@{Name=$name;Path='\';WasRunning=[bool]$record[0].wasRunning;Xml=$xml}
  }
  $portLine=Get-Content -LiteralPath (Join-Path $oldData 'config\server.env')|Where-Object {$_-match '^OUFEIDUN_PORT='}|Select-Object -First 1
  $port=if($portLine){[int]$portLine.Split('=')[1]}else{8787}
  $version=(Get-Content -LiteralPath (Join-Path $oldData 'app\package.json') -Raw|ConvertFrom-Json).version
  $context=[pscustomobject]@{OldData=$oldData;OldBundle=$oldBundle;NewRoot=$NewRoot;NewData=$newData;NewBundle=$newBundle;StateDir=$stateDir;Snapshots=$snapshots;Preflight=[pscustomobject]@{Port=$port;Version=$version}}
  Invoke-RelocationAdapter $Adapter 'CheckRecovery' $context
  if(-not(Invoke-RelocationAdapter $Adapter 'ConfirmRecovery' $context)){return [pscustomobject]@{Status='cancelled'}}
  try{
    Invoke-RelocationAdapter $Adapter 'Quiesce' $context
    if($state.status-in@('switching','rollback-failed')){Invoke-RelocationAdapter $Adapter 'PreserveUploads' $context}
    Invoke-RelocationAdapter $Adapter 'Restore' $context
    $state.status='rolled-back'
    Write-RelocationText $file ($state|ConvertTo-Json -Depth 6)
    return [pscustomobject]@{Status='rolled-back'}
  }catch{
    $state.status='rollback-failed'
    Write-RelocationText $file ($state|ConvertTo-Json -Depth 6)
    throw 'Khoi phuc chua thanh cong. Giu ca hai ban va .relocation de ho tro; khong restore database cu.'
  }
}
