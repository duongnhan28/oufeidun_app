[CmdletBinding()]
param([string]$OutputRoot='')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$version=(Get-Content -LiteralPath (Join-Path $root 'server\package.json') -Raw|ConvertFrom-Json).version
if(-not $OutputRoot){$OutputRoot=Join-Path $root 'BAN-GIAO'}
$OutputRoot=[IO.Path]::GetFullPath($OutputRoot)
$bundle=Join-Path $OutputRoot "Oufeidun-Server-Update-$version"
if((Test-Path -LiteralPath $bundle)-or(Test-Path -LiteralPath ($bundle+'.zip'))){throw 'Bo cap nhat da ton tai; chon OutputRoot moi, khong ghi de.'}
$template=Join-Path $root 'deployment\customer\server'
$guide=Join-Path $root "deployment\customer\SERVER-UPDATE-$version.txt"
if(-not(Test-Path -LiteralPath $guide)){throw 'Thieu huong dan cap nhat server.'}
New-Item -ItemType Directory -Path (Join-Path $bundle 'scripts'),(Join-Path $bundle 'app') -Force|Out-Null
foreach($file in @('CAP-NHAT.bat','KIEM-TRA-TON-DU-KIEN.bat','KHOI-DONG-LAI.bat','SAO-LUU.bat')){Copy-Item -LiteralPath (Join-Path $template $file) -Destination $bundle}
foreach($file in @('run-menu-action.ps1','existing-server.ps1','update-server.ps1','manage-server.ps1','backup-server.ps1','test-database.cjs','discovery-server.ps1','drive-backup-core.ps1','upload-drive.ps1','check-stock-forecast.ps1')){Copy-Item -LiteralPath (Join-Path $template "scripts\$file") -Destination (Join-Path $bundle 'scripts')}
foreach($file in @('src','mysql','node_modules','package.json','package-lock.json')){Copy-Item -LiteralPath (Join-Path $root "server\$file") -Destination (Join-Path $bundle 'app') -Recurse}
Copy-Item -LiteralPath $guide -Destination (Join-Path $bundle 'HUONG-DAN.txt')
$forbidden=@(Get-ChildItem -LiteralPath $bundle -File -Recurse|Where-Object {$_.Name-like '.env*'-or $_.Name-in @('server-info.json','server.env','connection.json','server-profile.json','discovery-identity.json','rclone.conf','drive-settings.json','upload-state.json')})
if($forbidden.Count){throw 'Dung: bo cap nhat co file cau hinh rieng.'}
Get-ChildItem -LiteralPath $bundle -File -Recurse|Get-FileHash -Algorithm SHA256|ForEach-Object {"$($_.Hash)  $($_.Path.Substring($bundle.Length+1))"}|Set-Content -LiteralPath (Join-Path $bundle 'SHA256SUMS.txt') -Encoding ascii
Compress-Archive -LiteralPath $bundle -DestinationPath ($bundle+'.zip') -CompressionLevel Optimal
Get-FileHash -LiteralPath ($bundle+'.zip') -Algorithm SHA256|Select-Object Hash,Path
Write-Host "Bo cap nhat server: $bundle"
