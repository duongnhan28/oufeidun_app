$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$sandbox=Join-Path $root ('.local\clean orchestration '+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $sandbox -Force|Out-Null
foreach($case in @('cancel','backup-fail','port-open','sql-fail','success')){
  $caseDir=Join-Path $sandbox $case
  $scripts=Join-Path $caseDir '01-MAY-CHU\scripts'
  $data=Join-Path $caseDir 'data moved with spaces'
  New-Item -ItemType Directory -Path $scripts,(Join-Path $data 'uploads\products') -Force|Out-Null
  'image fixture'|Set-Content (Join-Path $data 'uploads\products\original.jpg')
  Copy-Item (Join-Path $root 'deployment\customer\server\scripts\clean-data-core.ps1') (Join-Path $scripts 'clean-data-core.ps1')
  @'
function Assert-ServerAdmin {}
function Resolve-ExistingServer($Folder,$DataDir){
 [pscustomobject]@{DataDir=$DataDir;EnvFile=(Join-Path $DataDir 'fake.env');Port=9999;Config=@{MYSQL_DATABASE='clean_test';OUFEIDUN_DATA_DIR=$DataDir}}
}
'@|Set-Content (Join-Path $scripts 'existing-server.ps1')
  @'
param($EnvFile,[switch]$PassThru)
Add-Content $env:CLEAN_EVENTS 'backup'
if($env:CLEAN_CASE-eq 'backup-fail'){throw 'backup fixture failure'}
$directory=Join-Path (Split-Path -Parent $EnvFile) 'backups\daily\fixture'
New-Item -ItemType Directory -Path $directory -Force|Out-Null
('x'*256)|Set-Content (Join-Path $directory 'database.sql')
'hash fixture'|Set-Content (Join-Path $directory 'SHA256SUMS.txt')
[pscustomobject]@{Directory=$directory}
'@|Set-Content (Join-Path $scripts 'backup-server.ps1')
  $runner=Join-Path $caseDir 'runner.ps1'
  @'
param($Script,$DataDir,$Case)
$env:CLEAN_CASE=$Case
$env:CLEAN_EVENTS=Join-Path $DataDir 'events.txt'
function Get-ScheduledTask {param($TaskName,$ErrorAction);[pscustomobject]@{State='Running'}}
function Stop-ScheduledTask {param($TaskName,$ErrorAction);Add-Content $env:CLEAN_EVENTS 'stop'}
function Start-ScheduledTask {param($TaskName,$ErrorAction);Add-Content $env:CLEAN_EVENTS 'start'}
function Get-NetTCPConnection {param($LocalPort,$State,$ErrorAction);if($env:CLEAN_CASE-eq 'port-open'){[pscustomobject]@{State='Listen'}}}
function Start-Sleep {param($Milliseconds)}
function Read-Host {param($Prompt);if($Prompt-like 'Nhap nguyen van*'){if($env:CLEAN_CASE-ne 'cancel'){'XOA DU LIEU clean_test'}}}
function node {
 param($Script,$Action,$AppDir,$EnvFile)
 $global:LASTEXITCODE=0
 Add-Content $env:CLEAN_EVENTS $Action
 if($Action-eq 'preview'){'{"counts":{"app_users":2,"products":1}}'}
 elseif($env:CLEAN_CASE-eq 'sql-fail'){$global:LASTEXITCODE=1}
 else{'{"accounts":2}'}
}
& $Script -DataDir $DataDir
exit $LASTEXITCODE
'@|Set-Content $runner
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runner -Script (Join-Path $scripts 'clean-data-core.ps1') -DataDir $data -Case $case|Out-Null
  $code=$LASTEXITCODE
  $events=@(Get-Content (Join-Path $data 'events.txt'))
  if($case-eq 'cancel'){
    if($code-ne 0-or($events -join ',')-ne 'preview'){throw 'Cancel changed state'}
  }elseif($case-eq 'success'){
    if($code-ne 0-or($events -join ',')-ne 'preview,stop,backup,apply,start'){throw 'Success order incorrect'}
    if(Test-Path (Join-Path $data 'uploads\products\original.jpg')){throw 'Old photo still active'}
    if(-not(Test-Path (Join-Path $data 'backups\daily\fixture\uploads-before-clean\products\original.jpg'))){throw 'Photo backup missing'}
  }else{
    if($code-ne 1-or$events[-1]-ne 'start'){throw "Failure did not restart API: $case"}
    if($case-ne 'sql-fail'-and$events-contains 'apply'){throw 'Deletion ran despite failed prerequisite'}
    if(-not(Test-Path (Join-Path $data 'uploads\products\original.jpg'))){throw "Photo not restored: $case"}
  }
  Write-Output "PASS clean orchestration: $case"
}
