[CmdletBinding()]
param([ValidateRange(1,14)][int]$Days=3,[string]$OutputDirectory='')
$ErrorActionPreference='Stop'
# Read-only investigation: no config/DB/token reads, task changes or restarts.
if(-not $OutputDirectory){$OutputDirectory=Join-Path (Split-Path -Parent $PSScriptRoot) 'logs'}
New-Item -ItemType Directory -Path $OutputDirectory -Force|Out-Null
$lines=[Collections.Generic.List[string]]::new()
$lines.Add('Oufeidun session investigation - '+(Get-Date -Format o))
$lines.Add('Local timezone: '+[TimeZoneInfo]::Local.Id)
$lines.Add('Read-only. No passwords, tokens, database, task arguments or event message bodies collected.')
$since=(Get-Date).AddDays(-$Days)
try{
  $tasks=@(Get-ScheduledTask -TaskName '*Oufeidun*' -ErrorAction Stop)
  if(-not $tasks.Count){$lines.Add('No Oufeidun server tasks on this machine (normal for employee clients).')}
  foreach($task in $tasks){
    $info=Get-ScheduledTaskInfo -InputObject $task
    $lines.Add("TASK $($task.TaskName) state=$($task.State) last=$($info.LastRunTime.ToString('o')) result=$($info.LastTaskResult) next=$($info.NextRunTime.ToString('o'))")
    $s=$task.Settings
    $lines.Add("  limit=$($s.ExecutionTimeLimit) stopOnBattery=$($s.StopIfGoingOnBatteries) disallowBattery=$($s.DisallowStartIfOnBatteries) restartCount=$($s.RestartCount)")
    foreach($trigger in $task.Triggers){$lines.Add("  trigger=$($trigger.CimClass.CimClassName) start=$($trigger.StartBoundary) end=$($trigger.EndBoundary) repeat=$($trigger.Repetition.Interval)")}
  }
}catch{$lines.Add('Task metadata unavailable (no matching tasks or insufficient access).')}
try{
  $events=Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-TaskScheduler/Operational';StartTime=$since} -MaxEvents 3000 -ErrorAction Stop
  foreach($event in $events){
    [xml]$xml=$event.ToXml()
    $taskName=($xml.Event.EventData.Data|Where-Object {$_.Name-eq'TaskName'}).'#text'
    if($taskName-like'*Oufeidun*'){
      $lines.Add("TASK-EVENT $($event.TimeCreated.ToString('o')) id=$($event.Id) task=$taskName record=$($event.RecordId)")
    }
  }
}catch{$lines.Add('Task event history unavailable (history disabled, no events or insufficient access).')}
foreach($log in @('System','Application')){
  try{
    $events=Get-WinEvent -FilterHashtable @{LogName=$log;StartTime=$since} -MaxEvents 3000 -ErrorAction Stop
    foreach($event in $events){
      if($event.TimeCreated.Hour-lt 16-or$event.TimeCreated.Hour-ge 18){continue}
      $component=''
      if($log-eq'System'-and$event.ProviderName-match'Kernel-Power|Power-Troubleshooter|Kernel-General|Time-Service|WLAN|NDIS|Tcpip|Service Control Manager|EventLog'){$component=$event.ProviderName}
      if($log-eq'Application'-and$event.Id-in@(1000,1001,1002)){
        $match=[regex]::Match([string]$event.Message,'(?i)Oufeidun|node\.exe|caddy\.exe|mysqld(?:\.exe)?')
        if($match.Success){$component=$match.Value}
      }
      if($component){$lines.Add("$log $($event.TimeCreated.ToString('o')) id=$($event.Id) component=$component record=$($event.RecordId)")}
    }
  }catch{$lines.Add("$log event metadata unavailable.")}
}
$lines.Add('NETWORK (current adapter state; no SSID, IP, MAC or connection profile collected)')
try{
  foreach($adapter in @(Get-NetAdapter -ErrorAction Stop)){
    $lines.Add("ADAPTER status=$($adapter.Status) media=$($adapter.MediaType) physical=$($adapter.PhysicalMediaType) speed=$($adapter.LinkSpeed)")
  }
}catch{$lines.Add('Network adapter metadata unavailable.')}
foreach($log in @('Microsoft-Windows-WLAN-AutoConfig/Operational','Microsoft-Windows-NetworkProfile/Operational')){
  try{
    foreach($event in @(Get-WinEvent -FilterHashtable @{LogName=$log;StartTime=$since} -MaxEvents 1000 -ErrorAction Stop)){
      if($event.TimeCreated.Hour-ge 16-and$event.TimeCreated.Hour-lt 18){
        $lines.Add("NETWORK-EVENT $($event.TimeCreated.ToString('o')) log=$log id=$($event.Id) record=$($event.RecordId)")
      }
    }
  }catch{$lines.Add("$log metadata unavailable.")}
}
$lines.Add('POWER (current active plan; AC/DC standby and hibernate settings)')
foreach($setting in @('STANDBYIDLE','HIBERNATEIDLE')){
  try{$lines.AddRange([string[]]@(& powercfg.exe /query SCHEME_CURRENT SUB_SLEEP $setting 2>$null))}catch{$lines.Add('Power metadata unavailable.')}
}
$file=Join-Path $OutputDirectory ('session-diagnostic-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
$lines|Set-Content -LiteralPath $file -Encoding UTF8
Write-Host "Da tao bao cao: $file"
Write-Host 'Gui file nay va thoi diem bi dang xuat cho ho tro. Khong gui server.env hoac folder config.'
