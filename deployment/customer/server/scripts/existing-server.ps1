$ExistingServerScriptRoot=$PSScriptRoot
function Read-ServerEnv([string]$Path) {
  $values=@{}
  foreach($line in (Get-Content -LiteralPath $Path -Encoding UTF8)) {
    if($line -match '^([^#=]+)=(.*)$'){$values[$matches[1].Trim()]=$matches[2].Trim()}
  }
  return $values
}
function Resolve-ExistingServer([string]$ServerFolder,[string]$DataDir='',[switch]$NoPrompt) {
  $infoFile=Join-Path $ServerFolder 'server-info.json'
  $info=if(Test-Path -LiteralPath $infoFile){Get-Content -LiteralPath $infoFile -Raw -Encoding UTF8|ConvertFrom-Json}else{[pscustomobject]@{}}
  $candidates=@()
  if($DataDir){$candidates+= $DataDir}
  else {
    if($info.dataDir){$candidates+= [string]$info.dataDir}
    $task=Get-ScheduledTask -TaskName 'Oufeidun Local API' -ErrorAction SilentlyContinue
    if($task){foreach($action in $task.Actions){if($action.WorkingDirectory){$candidates+=$action.WorkingDirectory};if($action.Execute){$candidates+=Split-Path -Parent $action.Execute}}}
    $candidates+=Join-Path (Split-Path -Parent $ServerFolder) 'OufeidunServerData'
  }
  $found=@($candidates|Where-Object {$_ -and (Test-Path -LiteralPath (Join-Path $_ 'config\server.env'))}|Select-Object -Unique)
  if($found.Count-eq 0 -and -not $NoPrompt){
    $entered=Read-Host 'Nhap thu muc du lieu CU (chua config/server.env); khong phai thu muc bo cap nhat'
    if($entered){$found=@($entered.Trim().Trim('"'))}
  }
  if($found.Count-eq 0){throw 'Khong tim thay cau hinh cu. Chon thu muc du lieu da cai; khong can cai lai database.'}
  $resolved=[IO.Path]::GetFullPath($found[0])
  $envFile=Join-Path $resolved 'config\server.env'
  if(-not(Test-Path -LiteralPath $envFile)){throw 'Thu muc da chon khong co config/server.env.'}
  $cfg=Read-ServerEnv $envFile
  $hostName=if($info.hostName){[string]$info.hostName}else{'oufeidun.home.arpa'}
  $caddyFile=Join-Path $resolved 'Caddyfile'
  if(Test-Path -LiteralPath $caddyFile){$match=[regex]::Match((Get-Content -LiteralPath $caddyFile -Raw),'(?m)^\s*([a-zA-Z0-9.-]+\.home\.arpa)\s*\{');if($match.Success){$hostName=$match.Groups[1].Value}}
  return [pscustomobject]@{DataDir=$resolved;EnvFile=$envFile;Config=$cfg;Info=$info;InfoFile=$infoFile;HostName=$hostName;Port=$(if($cfg.OUFEIDUN_PORT){[int]$cfg.OUFEIDUN_PORT}else{8787})}
}
function Save-ExistingServer($Profile) {
  $Profile.Info|Add-Member -NotePropertyName dataDir -NotePropertyValue $Profile.DataDir -Force
  $Profile.Info|Add-Member -NotePropertyName hostName -NotePropertyValue $Profile.HostName -Force
  $Profile.Info|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $Profile.InfoFile -Encoding UTF8
}
function Assert-ServerAdmin {
  $principal=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
  if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Hay mo file BAT bang quyen Administrator.'}
}
function Test-ExistingDatabase($Profile,[string]$EnvFile='') {
  if(-not $EnvFile){$EnvFile=$Profile.EnvFile}
  $old=$env:OUFEIDUN_SERVER_ENV
  try {
    $env:OUFEIDUN_SERVER_ENV=$EnvFile
    & node (Join-Path $ExistingServerScriptRoot 'test-database.cjs') (Join-Path $Profile.DataDir 'app')
    if($LASTEXITCODE-ne 0){throw 'Khong ket noi duoc database; cau hinh cu chua bi thay doi.'}
  } finally {if($null-eq$old){Remove-Item Env:OUFEIDUN_SERVER_ENV -ErrorAction SilentlyContinue}else{$env:OUFEIDUN_SERVER_ENV=$old}}
}
