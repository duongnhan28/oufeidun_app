$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$fixture=Join-Path $root ('.local\drive setup & fixture '+[guid]::NewGuid().ToString('N'))
$scripts=Join-Path $fixture 'bundle\scripts';$script:TestData=Join-Path $fixture 'existing data';$script:TestRemote=Join-Path $fixture 'fake drive'
New-Item -ItemType Directory -Path $scripts,(Join-Path $script:TestData 'app'),(Join-Path $script:TestData 'config'),$script:TestRemote -Force|Out-Null
$original=Join-Path $root 'deployment\customer\server\scripts'
foreach($name in @('drive-backup.ps1','drive-backup-core.ps1','upload-drive.ps1')){Copy-Item -LiteralPath (Join-Path $original $name) -Destination (Join-Path $scripts $name)}
@'
function Assert-ServerAdmin {}
function Resolve-ExistingServer($ServerFolder,$DataDir){return [pscustomobject]@{DataDir=$script:TestData;EnvFile=(Join-Path $script:TestData 'config\server.env')}}
'@|Set-Content (Join-Path $scripts 'existing-server.ps1')
'fixture config only'|Set-Content (Join-Path $script:TestData 'config\server.env')
@'
param($EnvFile)
$fixtureData=Split-Path -Parent (Split-Path -Parent $EnvFile)
$dir=Join-Path $fixtureData ('backups\daily\'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $dir -Force|Out-Null
'fixture SQL'|Set-Content (Join-Path $dir 'database.sql')
"$((Get-FileHash (Join-Path $dir 'database.sql')).Hash)  database.sql"|Set-Content (Join-Path $dir 'SHA256SUMS.txt') -Encoding ascii
'@|Set-Content (Join-Path $scripts 'backup-server.ps1')
# Only OAuth is mocked: all copy/check/mkdir commands use the real downloaded rclone.
@'
$script:ActualInvoke=${function:Invoke-DriveRclone}
function Invoke-DriveRclone($Paths,[string[]]$Arguments){
 if($Arguments[0]-eq'config'){
  if($Arguments-notcontains'--no-output'){throw 'OAuth configuration may leak token'}
  $script:authCalls++
  [IO.File]::WriteAllText($Paths.Config,"[oufeidun-drive]`ntype = alias`nremote = $script:TestRemote`n",[Text.UTF8Encoding]::new($false))
  return
 }
 & $script:ActualInvoke $Paths $Arguments
}
'@|Add-Content (Join-Path $scripts 'drive-backup-core.ps1')
. (Join-Path $original 'drive-backup-core.ps1')
$paths=Get-DrivePaths $script:TestData
New-Item -ItemType Directory -Path $paths.Tools -Force|Out-Null
Copy-Item -LiteralPath (Join-Path $root '.local\drive-tool-fixture\tools\drive-backup\rclone.exe') -Destination $paths.Exe
$script:authCalls=0;$script:taskCalls=0;$script:prompts=0
function Read-Host($Prompt){$script:prompts++;if($script:prompts-eq1){return 'test-store'};if($script:prompts-eq2){return 'https://drive.google.com/drive/folders/abcDEFG_123456'};throw 'Setup repeated an unnecessary question'}
function New-ScheduledTaskAction($Execute,$Argument,$WorkingDirectory){
 if($Argument-notlike('*'+$script:TestData+'*')-or$Execute-ne'powershell.exe'){throw 'Task hardcodes a different data directory'}
 return [pscustomobject]@{Arguments=$Argument;WorkingDirectory=$WorkingDirectory}
}
function New-ScheduledTaskTrigger([switch]$Once,$At,$RepetitionInterval){if(-not$Once-or$RepetitionInterval.TotalHours-ne1){throw 'Retry trigger is incorrect'};return 'fixture trigger'}
function New-ScheduledTaskSettingsSet([switch]$StartWhenAvailable,$MultipleInstances){if(-not$StartWhenAvailable-or$MultipleInstances-ne'IgnoreNew'){throw 'Task retry/concurrency settings incorrect'};return 'fixture settings'}
function Register-ScheduledTask($TaskName,$Action,$Trigger,$Settings,$User,$RunLevel,[switch]$Force){if($TaskName-ne'Oufeidun Drive Backup'-or$User-ne'SYSTEM'-or-not$Force){throw 'Scheduled task identity incorrect'};$script:taskCalls++}
. (Join-Path $scripts 'drive-backup.ps1') -Action setup
if($script:authCalls-ne1-or$script:taskCalls-ne1){throw 'Setup did not authenticate/register correctly'}
$before=(Get-FileHash $paths.Config).Hash
. (Join-Path $scripts 'drive-backup.ps1') -Action setup
if($script:authCalls-ne1-or$script:taskCalls-ne2-or(Get-FileHash $paths.Config).Hash-ne$before){throw 'Setup rerun lost or changed credentials'}
foreach($name in @('backup-server.ps1','backup-local-server.ps1')){if(-not(Test-Path (Join-Path $script:TestData "app\$name"))){throw 'Legacy backup task hook not installed'}}
if(@(Get-ChildItem (Join-Path $script:TestRemote 'Oufeidun-Backup\test-store\daily') -Directory).Count-ne2){throw 'Setup did not upload test backups'}
Write-Output 'PASS setup: existing data discovery, automatic destination, optional folder link, OAuth no-output, SYSTEM hourly retry, persistent scripts, reuse account/config on rerun; OAuth and Windows task registration mocked.'
