[CmdletBinding()]
param([string]$OldData='',[string]$OldBundle='',[string]$NewRoot='')
$ErrorActionPreference='Stop'
try{
  $principal=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
  if(-not$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
    $process=Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit $process.ExitCode
  }
  foreach($item in @(@('OldData','OufeidunServerData','Folder du lieu cu'),@('OldBundle','Oufeidun-Local-0.2.14','Folder bo ban giao cu'),@('NewRoot','Oufeidun','Folder goc moi'))){
    if(-not(Get-Variable $item[0] -ValueOnly)){
      $suggested=Join-Path ($env:SystemDrive+'\') $item[1]
      $entered=Read-Host "$($item[2]) [$suggested]"
      Set-Variable -Name $item[0] -Value $(if($entered){$entered.Trim().Trim('"')}else{$suggested})
    }
  }
  . (Join-Path $PSScriptRoot 'relocate-windows.ps1')
  $result=Invoke-ServerRelocation $OldData $OldBundle $NewRoot (Get-WindowsRelocationAdapter)
  if($result.Status-eq'complete'){
    Write-Host "THANH CONG: $($result.NewRoot)" -ForegroundColor Green
    Write-Host "Backup moi: $($result.Backup)"
    Write-Host 'Mo app tu bo moi/doi shortcut portable. Thu tu may nhan vien va kiem tra backup.'
    Write-Host 'Hai folder cu duoc GIU LAI. Chi xoa thu cong sau khi kiem tra du.'
  }else{Write-Host 'Da huy; khong thay doi.'}
  Read-Host 'Nhan Enter de dong'
  exit 0
}catch{
  Write-Host $_.Exception.Message -ForegroundColor Red
  Read-Host 'Nhan Enter de dong'
  exit 1
}
