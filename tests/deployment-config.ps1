param([string]$InstalledDataDir='')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
. (Join-Path $root 'deployment\customer\server\scripts\existing-server.ps1')
$fixture=Join-Path $root ('.local\deployment test '+[guid]::NewGuid().ToString())
$serverFolder=Join-Path $fixture 'new bundle\01-MAY-CHU'
$data=Join-Path $fixture 'old data'
New-Item -ItemType Directory -Path $serverFolder,(Join-Path $data 'config') -Force|Out-Null
@('MYSQL_DATABASE=existing_test','MYSQL_HOST=127.0.0.1','MYSQL_PORT=3310','MYSQL_PASSWORD=not_a_real_password','OUFEIDUN_PORT=8999')|Set-Content (Join-Path $data 'config\server.env')
'custom-name.home.arpa {'|Set-Content (Join-Path $data 'Caddyfile')
@{dataDir=$data;hostName='old-name.home.arpa'}|ConvertTo-Json|Set-Content (Join-Path $serverFolder 'server-info.json')
$profile=Resolve-ExistingServer $serverFolder -NoPrompt
if($profile.DataDir-ne $data-or$profile.Port-ne 8999-or$profile.HostName-ne 'custom-name.home.arpa'){throw 'Saved configuration resolution failed'}
function Get-ScheduledTask {param($TaskName,$ErrorAction) return [pscustomobject]@{Actions=@([pscustomobject]@{WorkingDirectory=$data;Execute=(Join-Path $data 'run-api.cmd')})}}
@{dataDir=(Join-Path $fixture 'missing-folder')}|ConvertTo-Json|Set-Content (Join-Path $serverFolder 'server-info.json')
$profile=Resolve-ExistingServer $serverFolder -NoPrompt
if($profile.DataDir-ne $data){throw 'Existing task discovery failed'}
Save-ExistingServer $profile
if((Get-Content (Join-Path $serverFolder 'server-info.json') -Raw)-match 'not_a_real_password'){throw 'Secret leaked to public server info'}
Write-Host 'PASS: saved config, moved bundle, stale config fallback, spaces, custom hostname, port, secret exclusion'
if($InstalledDataDir){$installed=Resolve-ExistingServer $serverFolder -DataDir $InstalledDataDir -NoPrompt;Test-ExistingDatabase $installed;Write-Host 'PASS: actual installed MySQL connection (read-only)'}
