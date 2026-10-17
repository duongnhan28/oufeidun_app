param([ValidateSet('start','restart','check','configure','backup','stop','export','update','install')][string]$Action='check')
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'existing-server.ps1')
$principal=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
  $process=Start-Process powershell.exe -Verb RunAs -PassThru -Wait -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Action $Action"
  exit $process.ExitCode
}
try{
  if($Action-eq 'update'){& (Join-Path $PSScriptRoot 'update-server.ps1')}
  elseif($Action-eq 'install'){& (Join-Path $PSScriptRoot 'install-server.ps1')}
  else{& (Join-Path $PSScriptRoot 'manage-server.ps1') -Action $Action}
}catch{Write-Host $_.Exception.Message -ForegroundColor Red;Read-Host 'Nhan Enter de dong';exit 1}
Read-Host 'Nhan Enter de dong'
