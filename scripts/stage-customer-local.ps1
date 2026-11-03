param([string]$OutputRoot='', [switch]$SkipZip)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$version=(Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw|ConvertFrom-Json).version
$guide=Join-Path $root "deployment\customer\BAT-DAU-$version.txt"
if(-not(Test-Path -LiteralPath $guide)){throw "Thieu huong dan ban giao cho version $version."}
if(-not $OutputRoot){$OutputRoot=Join-Path $root 'BAN-GIAO'}
$bundle=Join-Path $OutputRoot "Oufeidun-Local-$version"
if(Test-Path -LiteralPath $bundle){throw 'Folder ban giao da ton tai. Chon OutputRoot khac de tranh ghi de.'}
$setup=Join-Path $root 'out\make\squirrel.windows\x64\Oufeidun-Setup.exe'
if(-not(Test-Path -LiteralPath $setup)){throw 'Chua build installer LOCAL.'}
$runtime=Get-Content -LiteralPath (Join-Path $root 'dist\server-config.json') -Raw|ConvertFrom-Json
if($runtime.environment-ne 'local'-or$runtime.backend-ne 'api'-or$runtime.apiBaseUrl-ne 'https://oufeidun.home.arpa/api/app/v1'){throw 'Profile build khong dung ban LOCAL ban giao.'}
$server=Join-Path $bundle '01-MAY-CHU';$client=Join-Path $bundle '02-MAY-CLIENT'
New-Item -ItemType Directory -Path $bundle -Force|Out-Null
Copy-Item -LiteralPath (Join-Path $root 'deployment\customer\server') -Destination $server -Recurse
Copy-Item -LiteralPath (Join-Path $root 'deployment\customer\client') -Destination $client -Recurse
foreach($folder in @($server,$client)){
  foreach($legacyFile in @(Get-ChildItem -LiteralPath $folder -File|Where-Object {$_.Extension-in @('.cmd','.txt')})){
    Remove-Item -LiteralPath $legacyFile.FullName -Force
  }
  Copy-Item -LiteralPath $guide -Destination (Join-Path $folder 'HUONG-DAN.txt')
}
'May nhan vien moi: tao bo client tu may chu truoc khi cai. May da cai: chay CAP-NHAT.bat.'|Set-Content (Join-Path $client 'CHUA-CAU-HINH.txt') -Encoding UTF8
foreach($unused in @('reset-server.ps1')){
  $file=Join-Path $server "scripts\$unused"
  if(Test-Path -LiteralPath $file){Remove-Item -LiteralPath $file -Force}
}
$app=Join-Path $server 'app';New-Item -ItemType Directory -Path $app -Force|Out-Null
foreach($name in @('src','mysql','node_modules','package.json','package-lock.json')){Copy-Item -LiteralPath (Join-Path $root "server\$name") -Destination $app -Recurse}
$tools=Join-Path $server 'tools';New-Item -ItemType Directory -Path $tools -Force|Out-Null
$caddy=Get-Command caddy.exe -ErrorAction SilentlyContinue
if($caddy){Copy-Item -LiteralPath $caddy.Source -Destination (Join-Path $tools 'caddy.exe')}
else{
  $oldTools=Get-ChildItem -LiteralPath $OutputRoot -Filter caddy.exe -Recurse -File -ErrorAction SilentlyContinue|Select-Object -First 1
  if(-not $oldTools){throw 'Khong tim thay caddy.exe trong cac bo ban giao cu.'}
  Copy-Item -LiteralPath $oldTools.FullName -Destination (Join-Path $tools 'caddy.exe')
}
Copy-Item -LiteralPath $setup -Destination (Join-Path $client 'Oufeidun-Setup.exe')
Copy-Item -LiteralPath (Join-Path $root 'out\Oufeidun-win32-x64') -Destination (Join-Path $client 'App') -Recurse
Copy-Item -LiteralPath $guide -Destination (Join-Path $bundle 'BAT-DAU-O-DAY.txt')
# Deliberately exclude installed credentials, customer data and developer certificates.
$forbidden=@(Get-ChildItem -LiteralPath $bundle -Recurse -File|Where-Object {$_.Name-in @('server-info.json','server.env','root.crt','connection.json','server-profile.json','discovery-identity.json','rclone.conf','drive-settings.json','upload-state.json')-or$_.Name-like '.env*'})
if($forbidden.Count){throw 'Bundle co cau hinh rieng hoac bi mat; dung ban giao.'}
Get-ChildItem -LiteralPath $bundle -Recurse -File|Get-FileHash -Algorithm SHA256|ForEach-Object {"$($_.Hash)  $($_.Path.Substring($bundle.Length+1))"}|Set-Content (Join-Path $bundle 'SHA256SUMS.txt') -Encoding ascii
if(-not $SkipZip){
  Compress-Archive -LiteralPath $bundle -DestinationPath ($bundle+'.zip') -CompressionLevel Optimal
  Get-FileHash -LiteralPath ($bundle+'.zip') -Algorithm SHA256|Select-Object Hash,Path
}
Write-Host "Folder ban giao: $bundle"
