$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
. (Join-Path $root 'deployment\relocate\scripts\relocate-windows.ps1')
$sandbox=Join-Path $root ('.local\relocation windows '+[guid]::NewGuid().ToString('N'))
$old=Join-Path $sandbox 'old data & path';$new=Join-Path $sandbox 'new data & path'
New-Item -ItemType Directory -Path $old -Force|Out-Null
'copy fixture'|Set-Content (Join-Path $old 'image.jpg')
Copy-RelocationTree $old $new
Assert-RelocationCopy $old $new
Protect-RelocationDirectory $new
$script:tasks=@{};$script:registered=0;$script:starts=0;$script:foreign=$false
$c=[pscustomobject]@{OldData=$old;OldBundle=(Join-Path $sandbox 'old kit');NewData=$new;NewBundle=(Join-Path $sandbox 'new kit');Snapshots=@();Preflight=[pscustomobject]@{Port=8799;HostName='fixture.home.arpa';Version='0.2.14';Database=[pscustomobject]@{imageId='fixture-image'}}}
foreach($name in $RelocationTaskNames){
  $doc=[xml]'<Task xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><Triggers><BootTrigger><Enabled>true</Enabled></BootTrigger></Triggers><Principals><Principal><UserId>SYSTEM</UserId><RunLevel>HighestAvailable</RunLevel></Principal></Principals><Settings><Enabled>true</Enabled><RestartOnFailure><Interval>PT1M</Interval><Count>10</Count></RestartOnFailure></Settings><Actions><Exec><Command></Command><Arguments></Arguments><WorkingDirectory></WorkingDirectory></Exec></Actions></Task>'
  $doc.Task.Actions.Exec.Command="$old\run-api.cmd";$doc.Task.Actions.Exec.WorkingDirectory=[string]$old
  $doc.Task.Actions.Exec.Arguments="-File `"$old\app\backup-server.ps1`""
  $tasks[$name]=[pscustomobject]@{Xml=$doc;State='Running'}
}
function Get-ScheduledTask {
  param($TaskName,$TaskPath,$ErrorAction)
  $names=if($TaskName){@($TaskName)}else{@($tasks.Keys)}
  foreach($name in $names){
    $item=$tasks[$name]
    [pscustomobject]@{TaskName=$name;TaskPath='\';State=$item.State;Principal=[pscustomobject]@{UserId=$item.Xml.Task.Principals.Principal.UserId};Settings=[pscustomobject]@{Enabled=($item.Xml.Task.Settings.Enabled-eq'true')};Actions=@([pscustomobject]@{Execute=$item.Xml.Task.Actions.Exec.Command;Arguments=$item.Xml.Task.Actions.Exec.Arguments;WorkingDirectory=$item.Xml.Task.Actions.Exec.WorkingDirectory})}
  }
  if(-not$TaskName-and$foreign){[pscustomobject]@{TaskName='Custom archive';TaskPath='\';Actions=@([pscustomobject]@{Execute='powershell.exe';Arguments="-File `"$old\archive.ps1`"";WorkingDirectory=$old})}}
}
function Export-ScheduledTask {param($TaskName,$TaskPath,$ErrorAction);$tasks[$TaskName].Xml.OuterXml}
function Disable-ScheduledTask {param($TaskName,$ErrorAction);$tasks[$TaskName].Xml.Task.Settings.Enabled='false'}
function Stop-ScheduledTask {param($TaskName,$ErrorAction);$tasks[$TaskName].State='Ready'}
function Start-ScheduledTask {param($TaskName,$TaskPath,$ErrorAction);$tasks[$TaskName].State='Running';$script:starts++}
function Register-ScheduledTask {param($TaskName,$TaskPath,$Xml,[switch]$Force,$ErrorAction);$tasks[$TaskName]=[pscustomobject]@{Xml=[xml]$Xml;State='Ready'};$script:registered++}
function Get-NetTCPConnection {param($LocalPort,$State,$ErrorAction)}
function Invoke-RestMethod {param($Uri,$TimeoutSec);[pscustomobject]@{ok=$true;version='0.2.14'}}
function Invoke-WebRequest {param($Uri,[switch]$UseBasicParsing,$TimeoutSec);[pscustomobject]@{StatusCode=200;Headers=@{'Content-Type'='image/png'};RawContentLength=100}}
$adapter=Get-WindowsRelocationAdapter
$c.Snapshots=@(Invoke-RelocationAdapter $adapter 'Snapshot' $c)
if($c.Snapshots.Count-ne3){throw 'Did not capture all tasks'}
Invoke-RelocationAdapter $adapter 'Quiesce' $c
Invoke-RelocationAdapter $adapter 'InstallTasks' $c
Invoke-RelocationAdapter $adapter 'StartNew' $c
Invoke-RelocationAdapter $adapter 'Health' $c
Invoke-RelocationAdapter $adapter 'CheckRecovery' $c
foreach($task in $tasks.Values){
  if($task.Xml.Task.Settings.Enabled-ne'true'-or$task.Xml.Task.Settings.RestartOnFailure.Count-ne'10'-or$task.Xml.Task.Principals.Principal.RunLevel-ne'HighestAvailable'){throw 'Task settings changed'}
  if($task.Xml.Task.Actions.Exec.WorkingDirectory-ne$new){throw 'Task not moved'}
}
Invoke-RelocationAdapter $adapter 'Quiesce' $c
Invoke-RelocationAdapter $adapter 'Restore' $c
foreach($task in $tasks.Values){if($task.Xml.Task.Actions.Exec.WorkingDirectory-ne$old){throw 'Task not restored'}}
$script:foreign=$true;$rejected=$false
try{Invoke-RelocationAdapter $adapter 'Snapshot' $c|Out-Null}catch{$rejected=$true}
if(-not$rejected){throw 'Foreign task reference not rejected'}
Write-Output 'PASS Windows adapter: real robocopy/checksums/ACL, mocked task capture/stop/rewrite/start/health/restore, foreign task blocked'
