$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
. (Join-Path $root 'deployment\customer\remote\remote-access.ps1')
function Assert-Fails([scriptblock]$Operation,[string]$Label) {
    $failed=$false
    try { & $Operation } catch { $failed=$true }
    if (-not $failed) { throw ('Expected failure '+$Label) }
}
foreach ($ip in @('100.64.0.1','100.127.255.254')) { Assert-TailscaleIp $ip }
foreach ($ip in @('127.0.0.1','192.168.1.10','100.63.255.255','100.128.0.1','100.100.1.1;whoami','::1','')) {
    Assert-Fails {Assert-TailscaleIp $ip} $ip
}
$connection=[pscustomobject]@{Ip='100.64.0.1';Status=[pscustomobject]@{Peer=[pscustomobject]@{Laptop=[pscustomobject]@{TailscaleIPs=@('100.64.0.2');Online=$true};Offline=[pscustomobject]@{TailscaleIPs=@('100.64.0.3');Online=$false}}}}
Assert-TailscalePeer $connection '100.64.0.2'
Assert-Fails {Assert-TailscalePeer $connection '100.64.0.1'} 'self'
Assert-Fails {Assert-TailscalePeer $connection '100.64.0.3'} 'offline'
Assert-Fails {Assert-TailscalePeer $connection '100.64.0.4'} 'unknown peer'
Write-Host 'PASS Tailscale range, self address, offline peer and unknown peer'

$sandbox=Join-Path $root ('.local\remote access & spaces '+[guid]::NewGuid().ToString('N'))
$cache=Join-Path $sandbox 'Oufeidun\server-profile.json'
$public=[pscustomobject]@{v=1;serverId='fixture-store';publicKey='fixture-public-key';rootCertificatePem='fixture-public-ca';hostName='fixture.home.arpa';httpsPort=443;discoveryPort=47631;serverIp='192.168.1.8'}
Write-ProfileAtomically $cache $public
$originalHash=(Get-FileHash -LiteralPath $cache).Hash
function Test-RemoteHealth { param($Profile,[string]$Address) throw 'fixture HTTPS failure' }
Assert-Fails {Set-RemoteProfile $cache $cache '100.64.0.2'} 'HTTPS failure'
if ((Get-FileHash -LiteralPath $cache).Hash -ne $originalHash -or (Test-Path -LiteralPath ($cache+'.before-tailscale.json'))) { throw 'Failed check changed configuration' }
function Test-RemoteHealth { param($Profile,[string]$Address) }
Set-RemoteProfile $cache $cache '100.64.0.2'
$backupHash=(Get-FileHash -LiteralPath ($cache+'.before-tailscale.json')).Hash
Set-RemoteProfile $cache $cache '100.64.0.4'
if ((Get-FileHash -LiteralPath ($cache+'.before-tailscale.json')).Hash -ne $backupHash) { throw 'Retry overwrote original LAN backup' }
$remote=Read-PublicProfile $cache
if ($remote.serverIp -ne '100.64.0.4' -or $remote.publicKey -ne $public.publicKey -or $remote.rootCertificatePem -ne $public.rootCertificatePem) { throw 'Identity changed' }
Restore-LanProfile $cache
if ((Read-PublicProfile $cache).serverIp -ne '192.168.1.8') { throw 'LAN restore failed' }
$different=Join-Path $sandbox 'different.json'
$public.serverId='different-store'
Write-ProfileAtomically $different $public
Assert-Fails {Set-RemoteProfile $cache $different '100.64.0.2'} 'store mismatch'
if ((Read-PublicProfile $cache).serverIp -ne '192.168.1.8') { throw 'Store mismatch changed cache' }
Write-Host 'PASS HTTPS failure preserves cache, atomic save, repeat configuration, store identity and LAN restore'

# Firewall boundaries are mocked so this test never changes Windows settings.
. (Join-Path $root 'deployment\customer\remote\remote-access.ps1')
$functionText=(Get-Item Function:Enable-RemoteFirewall).ScriptBlock.ToString()
$adminStart=$functionText.IndexOf('    $principal=')
$adminEnd=$functionText.IndexOf('    $address=', $adminStart)
if ($adminStart -lt 0 -or $adminEnd -le $adminStart) { throw 'Firewall test admin boundary missing' }
# Bypass only elevation in a disposable function copy; retain all scope/rule logic.
Set-Item Function:Enable-RemoteFirewall ([scriptblock]::Create($functionText.Remove($adminStart,$adminEnd-$adminStart)))
function Get-NetIPAddress { param($AddressFamily,$IPAddress,$ErrorAction) return [pscustomobject]@{InterfaceAlias='Tailscale'} }
function Get-NetFirewallRule { param($Name,$ErrorAction) return $null }
function New-NetFirewallRule { param($Name,$DisplayName,$Direction,$Action,$Protocol,$LocalPort,$LocalAddress,$RemoteAddress,$InterfaceAlias,$Profile,$Enabled) $script:rule=$PSBoundParameters }
Enable-RemoteFirewall $connection '100.64.0.2'
if ($script:rule.RemoteAddress -ne '100.64.0.2' -or $script:rule.LocalAddress -ne '100.64.0.1' -or $script:rule.LocalPort -ne 443 -or $script:rule.InterfaceAlias -ne 'Tailscale' -or $script:rule.Protocol -ne 'TCP') { throw 'Firewall scope too broad' }
function Get-NetFirewallRule { param($Name,$ErrorAction) return [pscustomobject]@{Name=$Name} }
function Set-NetFirewallRule { param($Name,$DisplayName,$Direction,$Action,$Protocol,$LocalPort,$LocalAddress,$RemoteAddress,$InterfaceAlias,$Profile,$Enabled) $script:updatedRule=$PSBoundParameters }
Enable-RemoteFirewall $connection '100.64.0.2'
if ($script:updatedRule.RemoteAddress -ne '100.64.0.2') { throw 'Firewall retry scope changed' }
Write-Host 'PASS firewall limited to laptop IP, server VPN address, Tailscale adapter and HTTPS 443; retry updates owned rule'
