[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$identity=[Security.Principal.WindowsIdentity]::GetCurrent();$principal=[Security.Principal.WindowsPrincipal]::new($identity)
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Hãy chạy bằng quyền Administrator.'}
$root=$PSScriptRoot;$configFile=Join-Path $root 'server-config.txt';$certificate=Join-Path $root 'root.crt';$setup=Join-Path $root 'Oufeidun-Setup.exe'
foreach($file in @($configFile,$certificate,$setup)){if(-not(Test-Path -LiteralPath $file)){throw "Thiếu file bắt buộc: $([IO.Path]::GetFileName($file)). Hãy chạy TAO-BO-CAI-MAY-CLIENT.cmd trên máy chủ trước."}}
$config=@{};Get-Content $configFile|ForEach-Object {if($_-match '^([^=]+)=(.*)$'){$config[$matches[1].Trim()]=$matches[2].Trim()}}
$ip=$config.SERVER_IP;$hostName=$config.HOST_NAME
if($ip-notmatch '^\d{1,3}(\.\d{1,3}){3}$' -or [string]::IsNullOrWhiteSpace($hostName)){throw 'server-config.txt không hợp lệ.'}
if(-not(Test-NetConnection $ip -Port 443 -InformationLevel Quiet)){throw "Không kết nối được máy chủ $ip cổng 443. Kiểm tra Wi-Fi Guest/AP Isolation/firewall."}
Import-Certificate -FilePath $certificate -CertStoreLocation 'Cert:\LocalMachine\Root'|Out-Null
$hosts="$env:SystemRoot\System32\drivers\etc\hosts";$lines=Get-Content $hosts|Where-Object {$_-notmatch "\s$([regex]::Escape($hostName))\s*$"};$lines+="$ip $hostName";[IO.File]::WriteAllLines($hosts,$lines,[Text.UTF8Encoding]::new($false))
Start-Process -FilePath $setup -Wait
Write-Host "Cài máy client thành công, kết nối $hostName tại $ip." -ForegroundColor Green
