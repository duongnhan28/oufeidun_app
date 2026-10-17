[CmdletBinding()]
param([string]$NewRoot='')
$ErrorActionPreference='Stop'
try{
  $principal=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
  if(-not$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
    $process=Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit $process.ExitCode
  }
  . (Join-Path $PSScriptRoot 'relocate-windows.ps1')
  if(-not$NewRoot){$suggested=Join-Path ($env:SystemDrive+'\') 'Oufeidun';$entered=Read-Host "Folder goc moi [$suggested]";$NewRoot=if($entered){$entered.Trim().Trim('"')}else{$suggested}}
  $result=Invoke-ServerRelocationRecovery $NewRoot (Get-WindowsRelocationAdapter)
  if($result.Status-eq'rolled-back'){
    Write-Host 'Da tra dich vu ve folder cu. Giu ca hai ban, kiem tra lai tren may ban hang.' -ForegroundColor Green
  }else{Write-Host 'Da huy.'}
  Read-Host 'Nhan Enter de dong';exit 0
}catch{
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host 'Giu ca hai ban va .relocation de ho tro; khong restore database cu.'
  Read-Host 'Nhan Enter de dong';exit 1
}
