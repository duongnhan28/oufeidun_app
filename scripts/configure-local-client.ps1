[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidatePattern('^\d{1,3}(\.\d{1,3}){3}$')][string]$ServerIp,
  [string]$HostName='oufeidun.home.arpa',
  [Parameter(Mandatory=$true)][string]$RootCertificate
)
$ErrorActionPreference='Stop'
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
$principal=[Security.Principal.WindowsPrincipal]::new($identity)
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Hãy chạy PowerShell bằng quyền Administrator.'}
if(-not(Test-Path -LiteralPath $RootCertificate)){throw 'Không tìm thấy chứng chỉ root.crt.'}
Import-Certificate -FilePath $RootCertificate -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null
$hosts="$env:SystemRoot\System32\drivers\etc\hosts"
$lines=Get-Content $hosts | Where-Object {$_ -notmatch "\s$([regex]::Escape($HostName))\s*$"}
$lines += "$ServerIp $HostName"
[IO.File]::WriteAllLines($hosts,$lines,[Text.UTF8Encoding]::new($false))
Write-Host "Máy đã tin cậy server tại https://$HostName" -ForegroundColor Green
