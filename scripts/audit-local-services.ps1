[CmdletBinding()]
param([string]$OutputFile = '')
. (Join-Path $PSScriptRoot 'local-paths.ps1')
if(-not $OutputFile){$OutputFile=Join-Path (Find-LocalDataDir) 'local-service-status.json'}
$ErrorActionPreference = 'Stop'
$taskNames = @('Oufeidun Local API', 'Oufeidun HTTPS', 'Oufeidun Backup')
$tasks = foreach ($name in $taskNames) {
  $task = Get-ScheduledTask -TaskName $name -ErrorAction Stop
  $info = Get-ScheduledTaskInfo -TaskName $name
  [pscustomobject]@{
    name = $name
    state = [string]$task.State
    last_result = $info.LastTaskResult
    last_run = $info.LastRunTime
    next_run = $info.NextRunTime
  }
}
$listeners = Get-NetTCPConnection -State Listen -LocalPort 3306, 8787, 443 -ErrorAction Stop |
  Select-Object LocalAddress, LocalPort, OwningProcess
$firewall = Get-NetFirewallRule -DisplayName 'Oufeidun HTTPS LAN' -ErrorAction Stop
$profiles = Get-NetConnectionProfile | Select-Object InterfaceAlias, NetworkCategory, IPv4Connectivity
$mysql = Get-Service MySQL80 -ErrorAction Stop
$result = [pscustomobject]@{
  checked_at = (Get-Date).ToString('o')
  tasks = @($tasks)
  listeners = @($listeners)
  firewall = [pscustomobject]@{
    enabled = [string]$firewall.Enabled
    profile = [string]$firewall.Profile
    direction = [string]$firewall.Direction
    action = [string]$firewall.Action
  }
  network_profiles = @($profiles)
  mysql = [pscustomobject]@{ status = [string]$mysql.Status; start_type = [string]$mysql.StartType }
}
$json = $result | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText($OutputFile, $json, [Text.UTF8Encoding]::new($false))
Write-Host "Đã ghi trạng thái service: $OutputFile" -ForegroundColor Green
