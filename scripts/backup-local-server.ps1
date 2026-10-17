[CmdletBinding()]
param([string]$EnvFile='')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$envFile=if($EnvFile){$EnvFile}else{Join-Path $root 'server\.env.local'}
if(-not(Test-Path -LiteralPath $envFile)){throw 'Không tìm thấy cấu hình server.'}
$cfg=@{}
Get-Content $envFile | ForEach-Object { if($_ -match '^([^#=]+)=(.*)$'){$cfg[$matches[1].Trim()]=$matches[2].Trim()} }
$data=$cfg.OUFEIDUN_DATA_DIR
$stamp=Get-Date -Format 'yyyy-MM-dd_HHmmss'
$daily=Join-Path $data "backups\daily\$stamp"
New-Item -ItemType Directory -Path $daily -Force | Out-Null
$dump=Join-Path $daily 'database.sql'
. (Join-Path $PSScriptRoot 'local-paths.ps1')
$mysqldump=if($cfg.MYSQLDUMP_EXE){$cfg.MYSQLDUMP_EXE}else{Find-LocalMySqlTool 'mysqldump.exe'}
$old=$env:MYSQL_PWD
try{
  $env:MYSQL_PWD=$cfg.MYSQL_PASSWORD
  & $mysqldump --default-character-set=utf8mb4 --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF --host=$($cfg.MYSQL_HOST) --port=$($cfg.MYSQL_PORT) --user=$($cfg.MYSQL_USER) $cfg.MYSQL_DATABASE | Set-Content -Path $dump -Encoding utf8
  if($LASTEXITCODE -ne 0){throw 'mysqldump thất bại.'}
}finally{if($null-eq$old){Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue}else{$env:MYSQL_PWD=$old}}
$uploads=Join-Path $data 'uploads'
if(Test-Path $uploads){Compress-Archive -Path "$uploads\*" -DestinationPath (Join-Path $daily 'uploads.zip') -CompressionLevel Optimal -Force}
Get-ChildItem $daily -File | Get-FileHash -Algorithm SHA256 | ForEach-Object{"$($_.Hash)  $($_.Path|Split-Path -Leaf)"} | Set-Content (Join-Path $daily 'SHA256SUMS.txt') -Encoding ascii
Get-ChildItem (Join-Path $data 'backups\daily') -Directory | Sort-Object Name -Descending | Select-Object -Skip 14 | Remove-Item -Recurse -Force
if((Get-Date).DayOfWeek -eq 'Sunday'){
  $weekly=Join-Path $data "backups\weekly\$stamp"
  Copy-Item $daily $weekly -Recurse -Force
  Get-ChildItem (Join-Path $data 'backups\weekly') -Directory | Sort-Object Name -Descending | Select-Object -Skip 8 | Remove-Item -Recurse -Force
}
Add-Content (Join-Path $data 'logs\backup.log') "$(Get-Date -Format o) OK $daily"
Write-Host "Backup hoàn tất: $daily"
