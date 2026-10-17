[CmdletBinding()]
param([string]$DataDir='')
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'existing-server.ps1')
Assert-ServerAdmin
$serverFolder=Split-Path -Parent $PSScriptRoot
$profile=Resolve-ExistingServer $serverFolder $DataDir
$sourceApp=Join-Path $serverFolder 'app'
$targetApp=Join-Path $profile.DataDir 'app'
if(-not(Test-Path -LiteralPath (Join-Path $sourceApp 'src\index.cjs'))){throw 'Bo cap nhat thieu Local API.'}
if(-not(Test-Path -LiteralPath (Join-Path $targetApp 'src\index.cjs'))){throw 'Thu muc du lieu cu thieu Local API.'}
if([IO.Path]::GetFullPath($sourceApp)-eq [IO.Path]::GetFullPath($targetApp)){throw 'Bo cap nhat phai nam ngoai thu muc du lieu dang chay.'}
Test-ExistingDatabase $profile
& (Join-Path $PSScriptRoot 'backup-server.ps1') -EnvFile $profile.EnvFile
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$backup=Join-Path $profile.DataDir ('app-before-update-'+$stamp)
$staging=Join-Path $profile.DataDir ('app-update-'+$stamp)
Copy-Item -LiteralPath $sourceApp -Destination $staging -Recurse
$oldVersion=(Get-Content -LiteralPath (Join-Path $targetApp 'package.json') -Raw|ConvertFrom-Json).version
$newVersion=(Get-Content -LiteralPath (Join-Path $sourceApp 'package.json') -Raw|ConvertFrom-Json).version
Write-Host "Cap nhat $oldVersion -> $newVersion; du lieu: $($profile.DataDir)"
if(Get-ScheduledTask -TaskName 'Oufeidun Local API' -ErrorAction SilentlyContinue){Stop-ScheduledTask -TaskName 'Oufeidun Local API' -ErrorAction Stop}
Start-Sleep 2
# Only move the explicitly verified app directory inside the detected data folder.
if((Split-Path -Parent ([IO.Path]::GetFullPath($targetApp)))-ne $profile.DataDir){throw 'Duong dan app khong hop le.'}
Move-Item -LiteralPath $targetApp -Destination $backup
Move-Item -LiteralPath $staging -Destination $targetApp
$oldEnv=$env:OUFEIDUN_SERVER_ENV
try{
  $env:OUFEIDUN_SERVER_ENV=$profile.EnvFile
  & node (Join-Path $targetApp 'src\migrate.cjs')
  if($LASTEXITCODE-ne 0){throw 'Migration that bai. Ban cu va backup du lieu da giu lai; khong tu khoi phuc DB da migration.'}
}finally{if($null-eq$oldEnv){Remove-Item Env:OUFEIDUN_SERVER_ENV -ErrorAction SilentlyContinue}else{$env:OUFEIDUN_SERVER_ENV=$oldEnv}}
Save-ExistingServer $profile
& (Join-Path $PSScriptRoot 'manage-server.ps1') -Action start -DataDir $profile.DataDir
Write-Host "Cap nhat thanh cong. Ban ma cu: $backup" -ForegroundColor Green
