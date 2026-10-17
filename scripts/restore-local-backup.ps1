[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$BackupDirectory,
  [string]$TargetDatabase='oufeidun_restore_test'
)
$ErrorActionPreference='Stop'
$dump=Join-Path $BackupDirectory 'database.sql'
$manifest=Join-Path $BackupDirectory 'SHA256SUMS.txt'
if(-not(Test-Path $dump)-or-not(Test-Path $manifest)){throw 'Bộ backup không đầy đủ.'}
$expected=@{}
Get-Content $manifest | ForEach-Object{if($_ -match '^([A-F0-9]{64})\s+(.+)$'){$expected[$matches[2]]=$matches[1]}}
Get-ChildItem $BackupDirectory -File | Where-Object Name -ne 'SHA256SUMS.txt' | ForEach-Object{
  if($expected[$_.Name] -ne (Get-FileHash $_.FullName -Algorithm SHA256).Hash){throw "Checksum sai: $($_.Name)"}
}
$secure=Read-Host 'Nhập mật khẩu root MySQL (không hiển thị)' -AsSecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try{$password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
. (Join-Path $PSScriptRoot 'local-paths.ps1')
$mysql=Find-LocalMySqlTool 'mysql.exe'
$old=$env:MYSQL_PWD
try{
  $env:MYSQL_PWD=$password
  "DROP DATABASE IF EXISTS ``$TargetDatabase``; CREATE DATABASE ``$TargetDatabase`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" | & $mysql --protocol=TCP -h 127.0.0.1 -u root
  Get-Content $dump -Raw | & $mysql --protocol=TCP -h 127.0.0.1 -u root $TargetDatabase
  if($LASTEXITCODE-ne 0){throw 'Khôi phục database thất bại.'}
}finally{if($null-eq$old){Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue}else{$env:MYSQL_PWD=$old};$password=$null}
Write-Host "Đã khôi phục kiểm thử vào database $TargetDatabase. Database chính không bị thay đổi." -ForegroundColor Green
