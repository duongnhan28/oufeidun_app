param([ValidateSet('setup','backup','check')][string]$Action='check')
$ErrorActionPreference='Stop'
$principal=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
  # Interactive setup needs a visible console for the Google consent step.
  $process=Start-Process powershell.exe -Verb RunAs -PassThru -Wait -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Action $Action"
  exit $process.ExitCode
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'drive-backup.ps1') -Action $Action
$result=$LASTEXITCODE
Read-Host 'Nhan Enter de dong'
exit $result
