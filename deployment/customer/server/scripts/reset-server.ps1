[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
function PlainText([Security.SecureString]$value){$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($value);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}}
$identity=[Security.Principal.WindowsIdentity]::GetCurrent();$principal=[Security.Principal.WindowsPrincipal]::new($identity)
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Hãy chạy bằng quyền Administrator.'}
$serverFolder=Split-Path -Parent $PSScriptRoot
$infoFile=Join-Path $serverFolder 'server-info.json'
$info=if(Test-Path -LiteralPath $infoFile){Get-Content -Raw -Encoding UTF8 $infoFile|ConvertFrom-Json}else{$null}
$defaultDataDir=Join-Path (Split-Path -Parent $serverFolder) 'OufeidunServerData'
$dataDir=if($info-and $info.dataDir){[IO.Path]::GetFullPath([string]$info.dataDir)}else{[IO.Path]::GetFullPath($defaultDataDir)}
if([IO.Path]::GetFileName($dataDir)-ne 'OufeidunServerData'){throw "Từ chối xóa thư mục không an toàn: $dataDir"}
Write-Host 'CANH BAO: thao tac nay se xoa toan bo du lieu Oufeidun local, tai khoan, don hang, kho va anh.' -ForegroundColor Red
Write-Host 'MySQL Server va Node.js van duoc giu lai de co the cai lai.' -ForegroundColor Yellow
$confirm=Read-Host 'Nhap chinh xac XOA OUFEIDUN de tiep tuc'
if($confirm-ne 'XOA OUFEIDUN'){Write-Host 'Đã hủy thao tác.' -ForegroundColor Yellow;exit 2}
$envFile=Join-Path $dataDir 'config\server.env'
$cfg=@{}
if(Test-Path -LiteralPath $envFile){Get-Content -LiteralPath $envFile|ForEach-Object {if($_-match '^([^#=]+)=(.*)$'){$cfg[$matches[1].Trim()]=$matches[2].Trim()}}}
$stamp=Get-Date -Format 'yyyy-MM-dd_HHmmss'
$backupRoot=Join-Path (Split-Path -Parent $dataDir) "Oufeidun-Reset-Backup-$stamp"
New-Item -ItemType Directory -Path $backupRoot -Force|Out-Null
if($cfg.MYSQLDUMP_EXE-and(Test-Path -LiteralPath $cfg.MYSQLDUMP_EXE)-and $cfg.MYSQL_PASSWORD){
  $oldPassword=$env:MYSQL_PWD
  try{$env:MYSQL_PWD=$cfg.MYSQL_PASSWORD;& $cfg.MYSQLDUMP_EXE --default-character-set=utf8mb4 --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF --host=127.0.0.1 --port=3306 --user=$($cfg.MYSQL_USER) $cfg.MYSQL_DATABASE|Set-Content -LiteralPath (Join-Path $backupRoot 'database.sql') -Encoding utf8;if($LASTEXITCODE-ne 0){Write-Warning 'Không tạo được dump database cuối.'}}finally{if($null-eq$oldPassword){Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue}else{$env:MYSQL_PWD=$oldPassword}}
}
$uploads=Join-Path $dataDir 'uploads';if(Test-Path -LiteralPath $uploads){Compress-Archive -Path (Join-Path $uploads '*') -DestinationPath (Join-Path $backupRoot 'uploads.zip') -CompressionLevel Optimal -Force -ErrorAction SilentlyContinue}
Get-ChildItem -LiteralPath $backupRoot -File|Get-FileHash -Algorithm SHA256|ForEach-Object{"$($_.Hash)  $($_.Path|Split-Path -Leaf)"}|Set-Content (Join-Path $backupRoot 'SHA256SUMS.txt') -Encoding ascii
$mysqlCommand=Get-Command mysql.exe -ErrorAction SilentlyContinue
$mysqlExe=if($mysqlCommand){Get-Item -LiteralPath $mysqlCommand.Source}else{$null}
if(-not $mysqlExe){$mysqlRoots=@($env:ProgramFiles,${env:ProgramFiles(x86)},$env:ProgramData)|Where-Object {$_ -and (Test-Path -LiteralPath $_)};$mysqlExe=$mysqlRoots|ForEach-Object {Get-ChildItem $_ -Filter mysql.exe -Recurse -File -ErrorAction SilentlyContinue}|Select-Object -First 1}
if(-not $mysqlExe){throw 'Không tìm thấy mysql.exe; chưa xóa bất kỳ dịch vụ hoặc dữ liệu nào.'}
$rootPassword=PlainText (Read-Host 'Nhập mật khẩu root MySQL để xóa database Oufeidun (không hiển thị)' -AsSecureString)
$dropSql="DROP DATABASE IF EXISTS ``oufeidun_local``; DROP USER IF EXISTS 'oufeidun_app'@'127.0.0.1'; DROP USER IF EXISTS 'oufeidun_app'@'localhost'; FLUSH PRIVILEGES;"
$oldRoot=$env:MYSQL_PWD
try{$env:MYSQL_PWD=$rootPassword;$dropSql|& $mysqlExe.FullName --protocol=TCP --host=127.0.0.1 --port=3306 --user=root;if($LASTEXITCODE-ne 0){throw 'Mật khẩu root MySQL sai hoặc không xóa được database. Chưa xóa runtime.'}}finally{if($null-eq$oldRoot){Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue}else{$env:MYSQL_PWD=$oldRoot};$rootPassword=$null}
foreach($task in @('Oufeidun Local API','Oufeidun HTTPS','Oufeidun Backup')){Stop-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue;Unregister-ScheduledTask -TaskName $task -Confirm:$false -ErrorAction SilentlyContinue}
Get-Process Oufeidun,caddy -ErrorAction SilentlyContinue|Stop-Process -Force -ErrorAction SilentlyContinue
Get-NetFirewallRule -DisplayName 'Oufeidun HTTPS LAN' -ErrorAction SilentlyContinue|Remove-NetFirewallRule
$hosts="$env:SystemRoot\System32\drivers\etc\hosts";$hostLines=Get-Content $hosts|Where-Object {$_-notmatch '(?i)\s(?:outfeidun|oufeidun)\.home(?:\.arpa)?\s*$'};[IO.File]::WriteAllLines($hosts,$hostLines,[Text.UTF8Encoding]::new($false))
$rootCert=Join-Path $dataDir 'caddy-data\caddy\pki\authorities\local\root.crt'
if(Test-Path -LiteralPath $rootCert){$certificate=[Security.Cryptography.X509Certificates.X509Certificate2]::new($rootCert);$store=[Security.Cryptography.X509Certificates.X509Store]::new('Root','LocalMachine');try{$store.Open('ReadWrite');$matches=$store.Certificates.Find('FindByThumbprint',$certificate.Thumbprint,$false);foreach($match in $matches){$store.Remove($match)}}finally{$store.Close()}}
$myIniRoots=@($env:ProgramData,$mysqlExe.Directory.Parent.FullName)|Where-Object {$_ -and (Test-Path -LiteralPath $_)}
$myIni=$myIniRoots|ForEach-Object {Get-ChildItem $_ -Filter my.ini -Recurse -File -ErrorAction SilentlyContinue}|Select-Object -First 1
if($myIni-and(Test-Path -LiteralPath ($myIni.FullName+'.oufeidun-backup'))){Copy-Item -LiteralPath ($myIni.FullName+'.oufeidun-backup') -Destination $myIni.FullName -Force;$mysqlService=Get-Service|Where-Object {$_.Name-like'MySQL*'}|Select-Object -First 1;if($mysqlService){Restart-Service $mysqlService.Name}}
$updateCandidates=@((Join-Path $env:LOCALAPPDATA 'KinhBanHang\Update.exe'),(Join-Path $env:LOCALAPPDATA 'Oufeidun\Update.exe'))
foreach($update in $updateCandidates){if(Test-Path -LiteralPath $update){Start-Process -FilePath $update -ArgumentList '--uninstall','-s' -Wait -ErrorAction SilentlyContinue}}
if(Test-Path -LiteralPath $dataDir){$resolved=[IO.Path]::GetFullPath($dataDir);if([IO.Path]::GetFileName($resolved)-ne 'OufeidunServerData'){throw "Từ chối xóa runtime không an toàn: $resolved"};Remove-Item -LiteralPath $resolved -Recurse -Force}
Remove-Item -LiteralPath $infoFile -Force -ErrorAction SilentlyContinue
$clientFolder=Join-Path (Split-Path -Parent $serverFolder) '02-MAY-CLIENT'
foreach($generated in @('root.crt','server-config.txt')){Remove-Item -LiteralPath (Join-Path $clientFolder $generated) -Force -ErrorAction SilentlyContinue}
@('CHUA CO root.crt VA server-config.txt.','Hay chay lai CAI-MAY-CHU.cmd de tao may chu va cau hinh client moi.')|Set-Content -LiteralPath (Join-Path $clientFolder 'CHUA-CAU-HINH.txt') -Encoding UTF8
Write-Host ''
Write-Host 'ĐÃ GỠ SẠCH OUFEIDUN LOCAL.' -ForegroundColor Green
Write-Host "Backup cuối (nếu tạo được): $backupRoot" -ForegroundColor Green
Write-Host 'MySQL Server và Node.js vẫn được giữ. Có thể chạy lại CAI-MAY-CHU.cmd.' -ForegroundColor Green
