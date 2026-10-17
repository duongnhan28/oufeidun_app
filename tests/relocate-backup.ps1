$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
. (Join-Path $root 'deployment\relocate\scripts\relocate-windows.ps1')
$cfg=Read-RelocationEnv (Join-Path $root 'server\.env.test.local')
if($cfg.MYSQL_DATABASE-notmatch'(?i)test'){throw 'Expected test database'}
$data=Join-Path $root ('.local\relocation backup '+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $data 'config'),(Join-Path $data 'uploads\products') -Force|Out-Null
Protect-RelocationDirectory $data
$cfg.OUFEIDUN_DATA_DIR=$data
$envFile=Join-Path $data 'config\server.env'
Write-RelocationText $envFile (($cfg.Keys|ForEach-Object {"$_=$($cfg[$_])"})-join"`r`n")
'fixture image'|Set-Content (Join-Path $data 'uploads\products\fixture.jpg')
$database=& node (Join-Path $root 'deployment\relocate\scripts\check-relocation-db.cjs') (Join-Path $root 'server') $envFile
if($LASTEXITCODE-ne0){throw 'Database metadata check failed'}
if(-not($database|ConvertFrom-Json).mysqlDataDir){throw 'Missing actual MySQL datadir'}
$backup=& (Join-Path $root 'deployment\relocate\scripts\backup-server.ps1') -EnvFile $envFile -PassThru
Assert-RelocationBackup $backup $data
if(-not(Test-Path -LiteralPath (Join-Path $backup.Directory 'uploads.zip'))){throw 'Missing photo archive'}
Write-Output 'PASS relocation real backup: test DB metadata, isolated folder with spaces, SQL/photos/config/checksums'
