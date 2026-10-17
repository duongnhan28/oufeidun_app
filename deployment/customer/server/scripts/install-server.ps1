[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
function PlainText([Security.SecureString]$value){$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($value);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}}
$identity=[Security.Principal.WindowsIdentity]::GetCurrent();$principal=[Security.Principal.WindowsPrincipal]::new($identity)
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Hãy chạy bằng quyền Administrator.'}
$serverFolder=Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'existing-server.ps1')
$existing=$null
try{$existing=Resolve-ExistingServer $serverFolder -NoPrompt}catch{}
if($existing){throw 'May da co cau hinh. Chay CAP-NHAT.bat hoac SUA-CAU-HINH.bat, khong cai lai database.'}
$bundleRoot=Split-Path -Parent $serverFolder
$sourceApp=Join-Path $serverFolder 'app'
$caddySource=Join-Path $serverFolder 'tools\caddy.exe'
if(-not(Test-Path -LiteralPath (Join-Path $sourceApp 'src\index.cjs'))){throw 'Bộ cài thiếu source Local API.'}
if(-not(Test-Path -LiteralPath $caddySource)){throw 'Bộ cài thiếu caddy.exe.'}
$node=(Get-Command node -ErrorAction Stop).Source
$mysqlService=Get-Service|Where-Object {$_.Name -like 'MySQL*'}|Sort-Object Status -Descending|Select-Object -First 1
if(-not $mysqlService){throw 'Chưa cài MySQL Server hoặc chưa tạo Windows Service.'}
$mysqlCommand=Get-Command mysql.exe -ErrorAction SilentlyContinue
$mysqlExe=if($mysqlCommand){Get-Item -LiteralPath $mysqlCommand.Source}else{$null}
if(-not $mysqlExe){
  $mysqlRoots=@($env:ProgramFiles,${env:ProgramFiles(x86)},$env:ProgramData)|Where-Object {$_ -and (Test-Path -LiteralPath $_)}
  $mysqlExe=$mysqlRoots|ForEach-Object {Get-ChildItem $_ -Filter mysql.exe -Recurse -File -ErrorAction SilentlyContinue}|Select-Object -First 1
}
if(-not $mysqlExe){throw 'Không tìm thấy mysql.exe. Hãy cài MySQL Client hoặc thêm thư mục bin của MySQL vào PATH.'}
$mysqldumpExe=Join-Path $mysqlExe.DirectoryName 'mysqldump.exe'
$network=Get-NetIPConfiguration|Where-Object {$_.IPv4DefaultGateway -and $_.IPv4Address.IPAddress -notlike '169.254.*'}|Select-Object -First 1
if(-not $network){throw 'Không tìm thấy card mạng có IPv4 và gateway.'}
$suggestedIp=$network.IPv4Address.IPAddress
$enteredIp=Read-Host "IP cố định của máy chủ [$suggestedIp]"
$serverIp=if([string]::IsNullOrWhiteSpace($enteredIp)){$suggestedIp}else{$enteredIp.Trim()}
if($serverIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$'){throw 'IP máy chủ không hợp lệ.'}
$selectedAddress=Get-NetIPAddress -AddressFamily IPv4 -IPAddress $serverIp -ErrorAction SilentlyContinue|Select-Object -First 1
if(-not $selectedAddress){throw 'IP đã nhập chưa được gán cho card mạng trên máy chủ. Hãy đặt IP/DHCP Reservation trước rồi chạy lại.'}
$network=Get-NetIPConfiguration -InterfaceIndex $selectedAddress.InterfaceIndex
$enteredHost=Read-Host 'Tên nội bộ [oufeidun.home.arpa]'
$hostName=if([string]::IsNullOrWhiteSpace($enteredHost)){'oufeidun.home.arpa'}else{$enteredHost.Trim().ToLowerInvariant()}
$enteredNetworks=Read-Host 'Dải mạng máy nhân viên được phép [LocalSubnet], ví dụ 192.168.1.0/24,192.168.2.0/24'
$allowedNetworks=if([string]::IsNullOrWhiteSpace($enteredNetworks)){@('LocalSubnet')}else{@($enteredNetworks.Split(',')|ForEach-Object {$_.Trim()}|Where-Object {$_})}
$defaultDataDir=Join-Path $bundleRoot 'OufeidunServerData'
$enteredData=Read-Host "Thư mục dữ liệu [$defaultDataDir]"
$dataDir=[IO.Path]::GetFullPath($(if([string]::IsNullOrWhiteSpace($enteredData)){$defaultDataDir}else{$enteredData.Trim()}))
$rootPassword=PlainText (Read-Host 'Nhập mật khẩu root MySQL (không hiển thị)' -AsSecureString)
$adminPassword=PlainText (Read-Host 'Tạo mật khẩu Admin Oufeidun, tối thiểu 12 ký tự (không hiển thị)' -AsSecureString)
if($adminPassword.Length-lt 12){throw 'Mật khẩu Admin phải có ít nhất 12 ký tự.'}
$random=New-Object byte[] 32;$rng=[Security.Cryptography.RandomNumberGenerator]::Create();try{$rng.GetBytes($random)}finally{$rng.Dispose()}
$appPassword=[Convert]::ToBase64String($random).TrimEnd('=').Replace('+','-').Replace('/','_')
$database='oufeidun_local';$appUser='oufeidun_app'
$sql=@"
CREATE DATABASE IF NOT EXISTS ``$database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$appUser'@'127.0.0.1' IDENTIFIED BY '$appPassword';
ALTER USER '$appUser'@'127.0.0.1' IDENTIFIED BY '$appPassword';
GRANT ALL PRIVILEGES ON ``$database``.* TO '$appUser'@'127.0.0.1';
CREATE USER IF NOT EXISTS '$appUser'@'localhost' IDENTIFIED BY '$appPassword';
ALTER USER '$appUser'@'localhost' IDENTIFIED BY '$appPassword';
GRANT ALL PRIVILEGES ON ``$database``.* TO '$appUser'@'localhost';
FLUSH PRIVILEGES;
"@
$oldMysqlPassword=$env:MYSQL_PWD
try{$env:MYSQL_PWD=$rootPassword;$sql|& $mysqlExe.FullName --protocol=TCP --host=127.0.0.1 --port=3306 --user=root;if($LASTEXITCODE-ne 0){throw 'Không tạo được database. Kiểm tra mật khẩu root MySQL.'}}finally{if($null-eq$oldMysqlPassword){Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue}else{$env:MYSQL_PWD=$oldMysqlPassword};$rootPassword=$null}
$appDir=Join-Path $dataDir 'app';$configDir=Join-Path $dataDir 'config';$caddyData=Join-Path $dataDir 'caddy-data';$bin=Join-Path $dataDir 'bin'
New-Item -ItemType Directory -Path $dataDir,$configDir,$caddyData,$bin,(Join-Path $dataDir 'uploads'),(Join-Path $dataDir 'backups\daily') -Force|Out-Null
if(Test-Path -LiteralPath $appDir){$archive=Join-Path $dataDir ('app-before-'+(Get-Date -Format 'yyyyMMdd-HHmmss'));Move-Item -LiteralPath $appDir -Destination $archive}
Copy-Item -LiteralPath $sourceApp -Destination $appDir -Recurse
Copy-Item -LiteralPath $caddySource -Destination (Join-Path $bin 'caddy.exe') -Force
$envFile=Join-Path $configDir 'server.env'
$envText=@"
OUFEIDUN_HOST=127.0.0.1
OUFEIDUN_PORT=8787
OUFEIDUN_DATA_DIR=$dataDir
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=$database
MYSQL_USER=$appUser
MYSQL_PASSWORD=$appPassword
MYSQLDUMP_EXE=$mysqldumpExe
ADMIN_LOGIN=admin
ADMIN_DISPLAY_NAME=Admin
ADMIN_PASSWORD=$adminPassword
SESSION_IDLE_SECONDS=90
OUFEIDUN_ALLOWED_ORIGINS=shop://app
"@
[IO.File]::WriteAllText($envFile,$envText,[Text.UTF8Encoding]::new($false))
$currentSid=$identity.User.Value;& icacls.exe $envFile /inheritance:r /grant:r "*${currentSid}:(F)" '*S-1-5-18:(F)' '*S-1-5-32-544:(F)'|Out-Null
$env:OUFEIDUN_SERVER_ENV=$envFile
& $node (Join-Path $appDir 'src\migrate.cjs');if($LASTEXITCODE-ne 0){throw 'Migration MySQL thất bại.'}
Remove-Item Env:OUFEIDUN_SERVER_ENV -ErrorAction SilentlyContinue
$envText=$envText-replace '(?m)^ADMIN_PASSWORD=.*$','ADMIN_PASSWORD='
[IO.File]::WriteAllText($envFile,$envText,[Text.UTF8Encoding]::new($false));$adminPassword=$null;$appPassword=$null
$caddyFile=Join-Path $dataDir 'Caddyfile'
[IO.File]::WriteAllText($caddyFile,"{`r`n  admin off`r`n}`r`n`r`n$hostName {`r`n  tls internal`r`n  encode zstd gzip`r`n  reverse_proxy 127.0.0.1:8787`r`n}`r`n",[Text.UTF8Encoding]::new($false))
$apiCmd=Join-Path $dataDir 'run-api.cmd';$caddyCmd=Join-Path $dataDir 'run-caddy.cmd'
[IO.File]::WriteAllText($apiCmd,"@echo off`r`nset `"OUFEIDUN_SERVER_ENV=$envFile`"`r`n`"$node`" `"$appDir\src\index.cjs`"`r`n",[Text.ASCIIEncoding]::new())
[IO.File]::WriteAllText($caddyCmd,"@echo off`r`nset `"XDG_DATA_HOME=$caddyData`"`r`n`"$bin\caddy.exe`" run --config `"$caddyFile`" --adapter caddyfile`r`n",[Text.ASCIIEncoding]::new())
$trigger=New-ScheduledTaskTrigger -AtStartup;$settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
Register-ScheduledTask -TaskName 'Oufeidun Local API' -Action (New-ScheduledTaskAction -Execute $apiCmd -WorkingDirectory $dataDir) -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force|Out-Null
Register-ScheduledTask -TaskName 'Oufeidun HTTPS' -Action (New-ScheduledTaskAction -Execute $caddyCmd -WorkingDirectory $dataDir) -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force|Out-Null
$backupScript=Join-Path $appDir 'backup-server.ps1';Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'backup-server.ps1') -Destination $backupScript -Force
$backupAction=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -EnvFile `"$envFile`"" -WorkingDirectory $appDir
Register-ScheduledTask -TaskName 'Oufeidun Backup' -Action $backupAction -Trigger (New-ScheduledTaskTrigger -Daily -At '23:00') -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable) -User 'SYSTEM' -RunLevel Highest -Force|Out-Null
$hosts="$env:SystemRoot\System32\drivers\etc\hosts";$hostLines=Get-Content $hosts|Where-Object {$_ -notmatch "\s$([regex]::Escape($hostName))\s*$"};$hostLines+='127.0.0.1 '+$hostName;[IO.File]::WriteAllLines($hosts,$hostLines,[Text.UTF8Encoding]::new($false))
Set-NetConnectionProfile -InterfaceIndex $network.InterfaceIndex -NetworkCategory Private
Get-NetFirewallRule -DisplayName 'Oufeidun HTTPS LAN' -ErrorAction SilentlyContinue|Remove-NetFirewallRule
New-NetFirewallRule -DisplayName 'Oufeidun HTTPS LAN' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443 -Profile Private -RemoteAddress $allowedNetworks|Out-Null
$myIniRoots=@($env:ProgramData,$mysqlExe.Directory.Parent.FullName)|Where-Object {$_ -and (Test-Path -LiteralPath $_)}
$myIni=$myIniRoots|ForEach-Object {Get-ChildItem $_ -Filter my.ini -Recurse -File -ErrorAction SilentlyContinue}|Select-Object -First 1
if($myIni){$ini=Get-Content -Raw $myIni.FullName;Copy-Item $myIni.FullName ($myIni.FullName+'.oufeidun-backup') -Force;if($ini-match '(?m)^\s*bind-address\s*='){$ini=$ini-replace '(?m)^\s*bind-address\s*=.*$','bind-address=127.0.0.1'}else{$ini=$ini-replace '(?m)^\[mysqld\]\s*$',"[mysqld]`r`nbind-address=127.0.0.1"};[IO.File]::WriteAllText($myIni.FullName,$ini,[Text.UTF8Encoding]::new($false));Restart-Service $mysqlService.Name;(Get-Service $mysqlService.Name).WaitForStatus('Running',[TimeSpan]::FromSeconds(90))}
powercfg /change standby-timeout-ac 0|Out-Null;powercfg /change hibernate-timeout-ac 0|Out-Null;powercfg /change monitor-timeout-ac 5|Out-Null
. (Join-Path $PSScriptRoot 'discovery-server.ps1')
Enable-ServerDiscovery $dataDir $hostName $allowedNetworks
Start-ScheduledTask -TaskName 'Oufeidun Local API';Start-ScheduledTask -TaskName 'Oufeidun HTTPS'
$rootCert=Join-Path $caddyData 'caddy\pki\authorities\local\root.crt';for($i=0;$i-lt 45-and-not(Test-Path $rootCert);$i++){Start-Sleep 1}
if(-not(Test-Path $rootCert)){throw 'HTTPS chưa sinh root.crt.'};Import-Certificate -FilePath $rootCert -CertStoreLocation 'Cert:\LocalMachine\Root'|Out-Null
$adapter=Get-NetAdapter -InterfaceIndex $network.InterfaceIndex
$info=[ordered]@{serverIp=$serverIp;macAddress=$adapter.MacAddress;hostName=$hostName;allowedNetworks=$allowedNetworks;dataDir=$dataDir;installedAt=(Get-Date).ToString('o');mysqlService=$mysqlService.Name}
$info|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $serverFolder 'server-info.json') -Encoding UTF8
& (Join-Path $PSScriptRoot 'export-client.ps1')
$healthy=$false
for($i=0;$i-lt 60;$i++){try{$health=Invoke-RestMethod "https://$hostName/health" -TimeoutSec 3;if($health.ok){$healthy=$true;break}}catch{};Start-Sleep 1}
if(-not $healthy){$apiResult=(Get-ScheduledTaskInfo -TaskName 'Oufeidun Local API').LastTaskResult;$httpsResult=(Get-ScheduledTaskInfo -TaskName 'Oufeidun HTTPS').LastTaskResult;throw "Máy chủ chưa sẵn sàng sau 60 giây. Local API=$apiResult; HTTPS=$httpsResult. Chạy SUA-LOI-KHOI-DONG.cmd."}
Start-ScheduledTask -TaskName 'Oufeidun Backup'
Write-Host "Cài máy chủ thành công. IP: $serverIp - MAC: $($adapter.MacAddress)" -ForegroundColor Green
Write-Host 'Đã tự tạo lại thư mục 02-MAY-CLIENT bằng chứng chỉ của máy chủ này.' -ForegroundColor Green
