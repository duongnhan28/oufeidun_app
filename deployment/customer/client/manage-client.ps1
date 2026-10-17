param([ValidateSet('install','update','configure','check','open')][string]$Action='check',[string]$TargetAppData=$env:APPDATA)
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
try {
  $publicProfile=Join-Path $root 'server-profile.json'
  $profileCache=Join-Path $TargetAppData 'Oufeidun\server-profile.json'
  if(Test-Path -LiteralPath $publicProfile){
    $public=Get-Content -LiteralPath $publicProfile -Raw -Encoding UTF8|ConvertFrom-Json
    if($public.v-ne 1-or-not $public.serverId-or-not $public.publicKey-or-not $public.rootCertificatePem-or$public.privateKey){throw 'Bo nhan dien may chu khong hop le.'}
    New-Item -ItemType Directory -Path (Split-Path -Parent $profileCache) -Force|Out-Null
    $keepCache=$false
    if(Test-Path -LiteralPath $profileCache){$old=Get-Content -LiteralPath $profileCache -Raw -Encoding UTF8|ConvertFrom-Json;$keepCache=$old.serverId-eq $public.serverId-and$old.publicKey-eq $public.publicKey-and$old.hostName-eq $public.hostName-and$old.rootCertificatePem-eq $public.rootCertificatePem}
    if(-not $keepCache){Copy-Item -LiteralPath $publicProfile -Destination $profileCache -Force}
    if($Action-in @('install','configure')){$Action=if($Action-eq 'install'){'update'}else{'open'}}
  }
  if($Action-eq 'install'){
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath -Action configure -TargetAppData $TargetAppData
    if($LASTEXITCODE-ne 0){throw 'Chua cau hinh duoc ket noi.'}
    $Action='update'
  }
  if($Action-in @('install','configure')){
    $principal=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
    if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
      $process=Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Action $Action -TargetAppData `"$TargetAppData`""
      exit $process.ExitCode
    }
  }
  $connection=Join-Path $TargetAppData 'Oufeidun\connection.json'
  $kitConfig=Join-Path $root 'server-config.txt'
  $config=@{}
  if(Test-Path -LiteralPath $kitConfig){Get-Content -LiteralPath $kitConfig|ForEach-Object {if($_-match '^([^=]+)=(.*)$'){$config[$matches[1].Trim()]=$matches[2].Trim()}}}
  if((Test-Path -LiteralPath $connection)-and-not $config.HOST_NAME){$old=Get-Content -LiteralPath $connection -Raw|ConvertFrom-Json;$config.HOST_NAME=([uri]$old.apiBaseUrl).Host}
  if(-not $config.HOST_NAME){$config.HOST_NAME='oufeidun.home.arpa'}
  $hostName=$config.HOST_NAME
  if($hostName-notmatch '^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$'){throw 'Hostname khong hop le.'}
  if($Action-in @('configure','install')){
    if($Action-eq 'configure'){
      $entered=Read-Host "IP may chu [$($config.SERVER_IP)] (Enter giu nguyen)"
      if($entered){$config.SERVER_IP=$entered.Trim()}
    }
    $ip=$config.SERVER_IP;$parsedIp=$null
    if(-not [Net.IPAddress]::TryParse($ip,[ref]$parsedIp)-or $parsedIp.AddressFamily-ne [Net.Sockets.AddressFamily]::InterNetwork){throw 'Thieu/sai IPv4 may chu. Tao bo client tren may chu hoac nhap IP qua SUA-KET-NOI.bat.'}
    if(-not(Test-NetConnection $ip -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue)){throw "Khong ket noi duoc $ip cong 443. Chua thay doi cau hinh cu."}
    $cert=Join-Path $root 'root.crt'
    if($Action-eq 'install'-and-not(Test-Path -LiteralPath $cert)){throw 'Thieu root.crt. Tao bo client tu may chu truoc.'}
    if(Test-Path -LiteralPath $cert){Import-Certificate -FilePath $cert -CertStoreLocation 'Cert:\LocalMachine\Root'|Out-Null}
    $hosts=Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
    $original=Get-Content -LiteralPath $hosts
    $lines=@($original|Where-Object {$_-notmatch "(?i)\s$([regex]::Escape($hostName))(?:\s|$)"})
    $lines+="$ip $hostName"
    [IO.File]::WriteAllLines($hosts,$lines,[Text.UTF8Encoding]::new($false))
    try{$health=Invoke-RestMethod "https://$hostName/health" -TimeoutSec 5;if(-not $health.ok){throw 'API chua san sang'}}catch{[IO.File]::WriteAllLines($hosts,$original,[Text.UTF8Encoding]::new($false));throw 'HTTPS/API chua dat. Da khoi phuc hosts cu.'}
    $dir=Split-Path -Parent $connection;New-Item -ItemType Directory -Path $dir -Force|Out-Null
    if(Test-Path -LiteralPath $connection){Copy-Item -LiteralPath $connection -Destination ($connection+'.before-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))}
    @{apiBaseUrl="https://$hostName/api/app/v1"}|ConvertTo-Json|Set-Content -LiteralPath $connection -Encoding UTF8
    @("SERVER_IP=$ip","HOST_NAME=$hostName")|Set-Content -LiteralPath $kitConfig -Encoding ascii
    Write-Host 'Ket noi da luu. Dong va mo lai app de nhan cau hinh.' -ForegroundColor Green
  }
  if($Action-in @('install','update')){
    $setup=Join-Path $root 'Oufeidun-Setup.exe'
    if(-not(Test-Path -LiteralPath $setup)){throw 'Thieu Oufeidun-Setup.exe.'}
    if(Get-Process Oufeidun -ErrorAction SilentlyContinue){throw 'Hay dong app Oufeidun truoc khi cap nhat.'}
    $process=Start-Process -FilePath $setup -PassThru -Wait
    if($process.ExitCode-ne 0){throw "Bo cai tra ma $($process.ExitCode)"}
    Write-Host 'Da cap nhat app; giu nguyen cau hinh ket noi.' -ForegroundColor Green
  }
  if($Action-eq 'check'){
    $portable=Join-Path $root 'App\Oufeidun.exe'
    if((Test-Path -LiteralPath $profileCache)-and(Test-Path -LiteralPath $portable)){
      if(Get-Process Oufeidun -ErrorAction SilentlyContinue){throw 'Dong Oufeidun truoc khi kiem tra; hoac bam Tim may chu trong man dang nhap.'}
      $process=Start-Process -FilePath $portable -ArgumentList "--check-server --server-profile=`"$profileCache`"" -WindowStyle Hidden -Wait -PassThru
      exit $process.ExitCode
    }
    $ip=if($config.SERVER_IP){$config.SERVER_IP}else{[Net.Dns]::GetHostAddresses($hostName)|Where-Object {$_.AddressFamily-eq 'InterNetwork'}|Select-Object -First 1 -ExpandProperty IPAddressToString}
    Write-Host "May chu: $hostName | IP: $ip"
    if(-not(Test-NetConnection $ip -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue)){throw 'Khong ket noi TCP 443. Kiem tra mang, may chu, firewall.'}
    $health=Invoke-RestMethod "https://$hostName/health" -TimeoutSec 5
    if(-not $health.ok){throw 'API chua san sang'}
    Write-Host 'Ket noi HTTPS thanh cong.' -ForegroundColor Green
  }
  if($Action-eq 'open'){
    $portable=Join-Path $root 'App\Oufeidun.exe'
    if(Test-Path -LiteralPath $portable){
      $arguments=if(Test-Path -LiteralPath $profileCache){"--server-profile=`"$profileCache`""}else{''}
      if($arguments){Start-Process -FilePath $portable -ArgumentList $arguments -WindowStyle Hidden}else{Start-Process -FilePath $portable -WindowStyle Hidden}
      exit 0
    }
    $installed=Join-Path $env:LOCALAPPDATA 'KinhBanHang\Update.exe'
    if(-not(Test-Path -LiteralPath $installed)){throw 'Chua tim thay app. Chay CAP-NHAT.bat hoac mo shortcut Oufeidun tren Desktop.'}
    Start-Process -FilePath $installed -ArgumentList '--processStart Oufeidun.exe' -WindowStyle Hidden
  }
}catch{Write-Host $_.Exception.Message -ForegroundColor Red;Read-Host 'Nhan Enter de dong';exit 1}
if($Action-ne 'open'){Read-Host 'Nhan Enter de dong'}
