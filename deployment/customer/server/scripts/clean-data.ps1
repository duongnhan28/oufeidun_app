[CmdletBinding()]
param([string]$DataDir='')
$ErrorActionPreference='Stop'
$principal=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
  $arguments="-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  if($DataDir){$arguments+=" -DataDir `"$DataDir`""}
  $process=Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList $arguments
  exit $process.ExitCode
}
& (Join-Path $PSScriptRoot 'clean-data-core.ps1') -DataDir $DataDir
exit $LASTEXITCODE
