[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$serverFolder=Split-Path -Parent $PSScriptRoot
$outputRoot=Split-Path -Parent $serverFolder
$clientFolder=Join-Path $outputRoot '02-MAY-CLIENT'
. (Join-Path $PSScriptRoot 'existing-server.ps1')
$profile=Resolve-ExistingServer $serverFolder
$info=$profile.Info
if(-not $info.serverIp -or -not(Get-NetIPAddress -IPAddress $info.serverIp -AddressFamily IPv4 -ErrorAction SilentlyContinue)){
  $suggested=(Get-NetIPConfiguration|Where-Object {$_.IPv4DefaultGateway}|Select-Object -First 1).IPv4Address.IPAddress
  $ip=$suggested
  if(-not(Get-NetIPAddress -IPAddress $ip -AddressFamily IPv4 -ErrorAction SilentlyContinue)){throw 'IP chua duoc gan tren may chu.'}
  $info|Add-Member -NotePropertyName serverIp -NotePropertyValue $ip -Force
}
Save-ExistingServer $profile
$rootCert=Join-Path $info.dataDir 'caddy-data\caddy\pki\authorities\local\root.crt'
if(-not(Test-Path -LiteralPath $rootCert)){throw 'Máy chủ chưa sinh root.crt.'}
if(-not(Test-Path -LiteralPath $clientFolder)){throw 'Không tìm thấy thư mục 02-MAY-CLIENT đặt cạnh thư mục máy chủ.'}
Copy-Item -LiteralPath $rootCert -Destination (Join-Path $clientFolder 'root.crt') -Force
$discovery=Join-Path $info.dataDir 'app\src\discovery.cjs'
if(Test-Path -LiteralPath $discovery){
  $newIdentity=-not(Test-Path -LiteralPath (Join-Path $info.dataDir 'config\discovery-identity.json'))
  . (Join-Path $PSScriptRoot 'discovery-server.ps1')
  Enable-ServerDiscovery $info.dataDir $info.hostName $info.allowedNetworks
  $publicProfile=& node $discovery export $info.dataDir $info.hostName $info.serverIp
  if($LASTEXITCODE-ne 0){throw 'Khong export duoc nhan dien may chu.'}
  [IO.File]::WriteAllText((Join-Path $clientFolder 'server-profile.json'),($publicProfile -join "`n"),[Text.UTF8Encoding]::new($false))
  if($newIdentity-and(Get-ScheduledTask -TaskName 'Oufeidun Local API' -ErrorAction SilentlyContinue)){
    Stop-ScheduledTask -TaskName 'Oufeidun Local API';Start-Sleep 2;Start-ScheduledTask -TaskName 'Oufeidun Local API'
  }
}
@("SERVER_IP=$($info.serverIp)","HOST_NAME=$($info.hostName)")|Set-Content -LiteralPath (Join-Path $clientFolder 'server-config.txt') -Encoding ascii
$marker=Join-Path $clientFolder 'CHUA-CAU-HINH.txt';if(Test-Path -LiteralPath $marker){Remove-Item -LiteralPath $marker -Force}
Get-ChildItem -LiteralPath $clientFolder -File|Where-Object {$_.Name-ne 'SHA256SUMS.txt'}|Get-FileHash -Algorithm SHA256|ForEach-Object{"$($_.Hash)  $($_.Path|Split-Path -Leaf)"}|Set-Content (Join-Path $clientFolder 'SHA256SUMS.txt') -Encoding ascii
Write-Host "Đã tạo bộ client cho IP $($info.serverIp), MAC $($info.macAddress)." -ForegroundColor Green
Write-Host "Chép toàn bộ thư mục này sang từng máy nhân viên: $clientFolder"
