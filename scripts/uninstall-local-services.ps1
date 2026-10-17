$ErrorActionPreference='Stop'
foreach($name in @('Oufeidun Local API','Oufeidun HTTPS','Oufeidun Backup')) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
}
Remove-NetFirewallRule -DisplayName 'Oufeidun HTTPS LAN' -ErrorAction SilentlyContinue
Write-Host 'Đã gỡ tác vụ Oufeidun. Database và dữ liệu không bị xóa.'
