function Enable-ServerDiscovery([string]$DataDir,[string]$HostName,$AllowedNetworks) {
  $script=Join-Path $DataDir 'app\src\discovery.cjs'
  if(-not(Test-Path -LiteralPath $script)){return}
  & node $script init $DataDir $HostName
  if($LASTEXITCODE-ne 0){throw 'Khong tao duoc nhan dien may chu.'}
  $identity=Join-Path $DataDir 'config\discovery-identity.json'
  $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  & icacls.exe $identity /inheritance:r /grant:r "*${sid}:(F)" '*S-1-5-18:(F)' '*S-1-5-32-544:(F)'|Out-Null
  if($LASTEXITCODE-ne 0){throw 'Khong khoa duoc quyen khoa nhan dien.'}
  if(-not $AllowedNetworks){
    $https=Get-NetFirewallRule -DisplayName 'Oufeidun HTTPS LAN' -ErrorAction SilentlyContinue
    $AllowedNetworks=@($https|Get-NetFirewallAddressFilter|ForEach-Object {$_.RemoteAddress})
  }
  if(-not $AllowedNetworks){$AllowedNetworks=@('LocalSubnet')}
  Get-NetFirewallRule -DisplayName 'Oufeidun LAN Discovery' -ErrorAction SilentlyContinue|Remove-NetFirewallRule
  New-NetFirewallRule -DisplayName 'Oufeidun LAN Discovery' -Direction Inbound -Action Allow -Protocol UDP -LocalPort 47631 -Profile Any -RemoteAddress $AllowedNetworks|Out-Null
}
