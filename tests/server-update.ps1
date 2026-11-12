$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$sandbox=Join-Path $root ('.local\update server '+[guid]::NewGuid().ToString('N'))
foreach($case in @('success','backup-failure')) {
  $fixture=Join-Path $sandbox $case
  $bundle=Join-Path $fixture 'kit & spaces'
  $data=Join-Path $fixture 'old data & spaces'
  New-Item -ItemType Directory -Path (Join-Path $bundle 'scripts'),(Join-Path $bundle 'app\src'),(Join-Path $data 'app\src'),(Join-Path $data 'config'),(Join-Path $data 'uploads') -Force|Out-Null
  '{"version":"0.2.17"}'|Set-Content -LiteralPath (Join-Path $data 'app\package.json')
  'old code fixture'|Set-Content -LiteralPath (Join-Path $data 'app\src\index.cjs')
  '{"version":"0.1.4"}'|Set-Content -LiteralPath (Join-Path $bundle 'app\package.json')
  'new code fixture'|Set-Content -LiteralPath (Join-Path $bundle 'app\src\index.cjs')
  'process.exit(0);'|Set-Content -LiteralPath (Join-Path $bundle 'app\src\migrate.cjs')
  'MYSQL_DATABASE=update_fixture_test'|Set-Content -LiteralPath (Join-Path $data 'config\server.env')
  'unchanged image fixture'|Set-Content -LiteralPath (Join-Path $data 'uploads\original.txt')
  $envHash=(Get-FileHash -LiteralPath (Join-Path $data 'config\server.env')).Hash
  $imageHash=(Get-FileHash -LiteralPath (Join-Path $data 'uploads\original.txt')).Hash
  foreach($name in @('update-server.ps1','existing-server.ps1')){Copy-Item -LiteralPath (Join-Path $root "deployment\customer\server\scripts\$name") -Destination (Join-Path $bundle 'scripts')}
  # Mock OS/service boundaries only in the disposable copy. Production updater is unchanged.
  Add-Content -LiteralPath (Join-Path $bundle 'scripts\existing-server.ps1') -Value @'
function Assert-ServerAdmin {}
function Test-ExistingDatabase {param($Profile) if(-not(Test-Path -LiteralPath $Profile.EnvFile)){throw 'Missing existing config'}}
function Get-ScheduledTask {param($TaskName,$ErrorAction) return $null}
'@
  $backup=if($case-eq 'backup-failure'){'param($EnvFile); throw "fixture backup failure"'}else{'param($EnvFile); "backup completed" | Set-Content -LiteralPath (Join-Path (Split-Path -Parent $EnvFile) "backup-complete.txt")'}
  $backup|Set-Content -LiteralPath (Join-Path $bundle 'scripts\backup-server.ps1')
  'param($Action,$DataDir); if((Get-Content -LiteralPath (Join-Path $DataDir "app\src\index.cjs") -Raw).Trim()-ne "new code fixture"){throw "Wrong API started"}; "started"|Set-Content -LiteralPath (Join-Path $DataDir "started.txt")'|Set-Content -LiteralPath (Join-Path $bundle 'scripts\manage-server.ps1')
  $failed=$false
  try{& (Join-Path $bundle 'scripts\update-server.ps1') -DataDir $data}catch{if($case-eq 'success'){throw};$failed=$true}
  if($case-eq 'success'){
    if(-not(Test-Path -LiteralPath (Join-Path $data 'started.txt'))){throw 'Updated API not started'}
    $old=@(Get-ChildItem -LiteralPath $data -Directory -Filter 'app-before-update-*')
    if($old.Count-ne 1-or(Get-Content -LiteralPath (Join-Path $old[0].FullName 'src\index.cjs') -Raw).Trim()-ne 'old code fixture'){throw 'Old app not preserved'}
  }else{if(-not$failed-or(Get-Content -LiteralPath (Join-Path $data 'app\src\index.cjs') -Raw).Trim()-ne 'old code fixture'){throw 'Backup failure did not preserve installed app'}}
  if((Get-FileHash -LiteralPath (Join-Path $data 'config\server.env')).Hash-ne$envHash-or(Get-FileHash -LiteralPath (Join-Path $data 'uploads\original.txt')).Hash-ne$imageHash){throw 'Config or image changed'}
  Write-Host "PASS $case : paths with spaces/ampersand; original config/images and old code preserved"
}
