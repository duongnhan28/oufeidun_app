$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
. (Join-Path $root 'deployment\customer\server\scripts\existing-server.ps1')
$cfg=Read-ServerEnv (Join-Path $root 'server\.env.test.local')
if($cfg.MYSQL_DATABASE-notmatch 'test'){throw 'Expected test database'}
$data=Join-Path $root ('.local\clean backup '+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $data 'config'),(Join-Path $data 'uploads\products') -Force|Out-Null
$envFile=Join-Path $data 'config\server.env'
Copy-Item (Join-Path $root 'server\.env.test.local') $envFile
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $envFile /inheritance:r /grant:r "*${sid}:(F)" '*S-1-5-18:(F)' '*S-1-5-32-544:(F)'|Out-Null
if($LASTEXITCODE-ne 0){throw 'Fixture ACL failed'}
$cfg.OUFEIDUN_DATA_DIR=$data
[IO.File]::WriteAllLines($envFile,@($cfg.Keys|ForEach-Object{"$_=$($cfg[$_])"}),[Text.UTF8Encoding]::new($false))
'fixture image'|Set-Content (Join-Path $data 'uploads\products\test.jpg')
$backup=& (Join-Path $root 'deployment\customer\server\scripts\backup-server.ps1') -EnvFile $envFile -PassThru
if(-not(Test-Path (Join-Path $backup.Directory 'uploads.zip'))){throw 'Missing image archive'}
if((Get-Item (Join-Path $backup.Directory 'database.sql')).Length-lt 128){throw 'Empty dump'}
if(-not(Test-Path (Join-Path $backup.Directory 'SHA256SUMS.txt'))){throw 'Missing checksum'}
Write-Output 'PASS real backup: test DB, isolated data dir, SQL/uploads/checksum and PassThru'
