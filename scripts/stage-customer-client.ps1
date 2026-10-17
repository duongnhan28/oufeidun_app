param([string]$OutputRoot='E:\outputt')
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$version=(Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw -Encoding UTF8|ConvertFrom-Json).version
$config=Get-Content -LiteralPath (Join-Path $repo 'dist/server-config.json') -Raw -Encoding UTF8|ConvertFrom-Json
if($version-ne '0.2.16'-or$config.environment-ne 'local'-or$config.backend-ne 'api'-or$config.lookupApiUrl-ne 'https://oufeidun.vn/api/glass-lookup'){throw 'Sai version/profile client.'}
& node (Join-Path $repo 'scripts/audit-local-package.cjs')
if($LASTEXITCODE-ne 0){throw 'Package audit khong dat.'}
$target=Join-Path $OutputRoot "Oufeidun-Client-$version"
$zip=$target+'.zip'
if((Test-Path -LiteralPath $target)-or(Test-Path -LiteralPath $zip)){throw 'Bo ban giao da ton tai; khong ghi de.'}
New-Item -ItemType Directory -Path $target|Out-Null
Copy-Item -LiteralPath (Join-Path $repo 'out/Oufeidun-win32-x64') -Destination (Join-Path $target 'App') -Recurse
Copy-Item -LiteralPath (Join-Path $repo 'out/make/squirrel.windows/x64/Oufeidun-Setup.exe') -Destination $target
foreach($name in @('CAP-NHAT.bat','MO-APP.bat','KIEM-TRA-KET-NOI.bat','manage-client.ps1')){
  Copy-Item -LiteralPath (Join-Path $repo "deployment/customer/client/$name") -Destination $target
}
Copy-Item -LiteralPath (Join-Path $repo 'deployment/customer/CLIENT-UPDATE-0.2.16.txt') -Destination (Join-Path $target 'BAT-DAU-O-DAY.txt')
$files=Get-ChildItem -LiteralPath $target -Recurse -File
$forbidden=$files|Where-Object {$_.Name-match '^\.env|^server-profile\.json$|^root\.crt$|\.key$|^server-config\.txt$'}
if($forbidden){throw 'Bo ban giao chua cau hinh rieng.'}
$hashLines=$files|Sort-Object FullName|ForEach-Object {"$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)  $($_.FullName.Substring($target.Length+1))"}
$hashLines|Set-Content -LiteralPath (Join-Path $target 'SHA256SUMS.txt') -Encoding UTF8
Compress-Archive -LiteralPath $target -DestinationPath $zip -CompressionLevel Optimal
Get-FileHash -LiteralPath $zip -Algorithm SHA256
Get-FileHash -LiteralPath (Join-Path $target 'Oufeidun-Setup.exe') -Algorithm SHA256
Write-Host "Bo client: $target"
