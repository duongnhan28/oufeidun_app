[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$EnvFile,[switch]$PassThru)
$ErrorActionPreference='Stop'
$cfg=@{}
Get-Content -LiteralPath $EnvFile | ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$cfg[$matches[1].Trim()]=$matches[2].Trim()}}
$data=$cfg.OUFEIDUN_DATA_DIR
$dumpExe=$cfg.MYSQLDUMP_EXE
if(-not $dumpExe-or-not(Test-Path -LiteralPath $dumpExe)){
  $command=Get-Command mysqldump.exe -ErrorAction SilentlyContinue
  if($command){$dumpExe=$command.Source}
  else{
    $roots=@($env:ProgramFiles,${env:ProgramFiles(x86)},$env:ProgramData)|Where-Object {$_-and(Test-Path -LiteralPath $_)}
    $dumpExe=$roots|ForEach-Object {Get-ChildItem -LiteralPath $_ -Filter mysqldump.exe -Recurse -File -ErrorAction SilentlyContinue}|Select-Object -First 1 -ExpandProperty FullName
  }
}
if(-not $dumpExe-or-not(Test-Path -LiteralPath $dumpExe)){throw 'Không tìm thấy mysqldump.exe; thêm MySQL bin vào PATH.'}
$stamp=(Get-Date -Format 'yyyy-MM-dd_HHmmss_fff')+'-'+[guid]::NewGuid().ToString('N').Substring(0,8)
$daily=Join-Path $data "backups\daily\$stamp"
New-Item -ItemType Directory -Path $daily -Force|Out-Null
$dump=Join-Path $daily 'database.sql'
$configBackup=Join-Path $daily 'server.env'
Copy-Item -LiteralPath $EnvFile -Destination $configBackup
$backupSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $configBackup /inheritance:r /grant:r "*${backupSid}:(F)" '*S-1-5-18:(F)' '*S-1-5-32-544:(F)'|Out-Null
if($LASTEXITCODE-ne 0){Remove-Item -LiteralPath $configBackup -Force;throw 'Khong khoa duoc quyen file cau hinh backup.'}
$old=$env:MYSQL_PWD
try{
  $env:MYSQL_PWD=$cfg.MYSQL_PASSWORD
  & $dumpExe --default-character-set=utf8mb4 --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF --host=$($cfg.MYSQL_HOST) --port=$($cfg.MYSQL_PORT) --user=$($cfg.MYSQL_USER) $cfg.MYSQL_DATABASE | Set-Content -LiteralPath $dump -Encoding utf8
  if($LASTEXITCODE-ne 0){throw 'mysqldump thất bại.'}
}finally{if($null-eq$old){Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue}else{$env:MYSQL_PWD=$old}}
$uploads=Join-Path $data 'uploads'
if((Test-Path -LiteralPath $uploads)-and(Get-ChildItem -LiteralPath $uploads -Force|Select-Object -First 1)){Compress-Archive -Path (Join-Path $uploads '*') -DestinationPath (Join-Path $daily 'uploads.zip') -CompressionLevel Optimal -Force}
Get-ChildItem -LiteralPath $daily -File|Get-FileHash -Algorithm SHA256|ForEach-Object{"$($_.Hash)  $($_.Path|Split-Path -Leaf)"}|Set-Content (Join-Path $daily 'SHA256SUMS.txt') -Encoding ascii
# Retention is performed separately; updating never deletes an existing backup.
Write-Host "Backup hoàn tất: $daily" -ForegroundColor Green
if($PassThru){[pscustomobject]@{Directory=$daily}}
