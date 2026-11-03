# Shared by setup, scheduled upload and isolated tests. No database writes here.
function Protect-DriveDirectory([string]$Path) {
  New-Item -ItemType Directory -Path $Path -Force|Out-Null
  $ownerSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  & icacls.exe $Path /inheritance:r /grant:r "*${ownerSid}:(OI)(CI)(F)" '*S-1-5-18:(OI)(CI)(F)' '*S-1-5-32-544:(OI)(CI)(F)'|Out-Null
  if($LASTEXITCODE-ne 0){throw 'Khong bao ve duoc thu muc cau hinh Drive.'}
}
function Get-DrivePaths([string]$DataDir) {
  $data=[IO.Path]::GetFullPath($DataDir)
  $private=Join-Path $data 'config\drive-backup'
  $tools=Join-Path $data 'tools\drive-backup'
  return [pscustomobject]@{Data=$data;Private=$private;Tools=$tools;Config=(Join-Path $private 'rclone.conf');Settings=(Join-Path $private 'drive-settings.json');State=(Join-Path $private 'upload-state.json');Log=(Join-Path $private 'upload.log');Exe=(Join-Path $tools 'rclone.exe')}
}
function Get-DriveFolderId([string]$Link) {
  if(-not $Link.Trim()){return ''}
  $parsed=$null
  if(-not[Uri]::TryCreate($Link.Trim(),[UriKind]::Absolute,[ref]$parsed)-or$parsed.Scheme-ne'https'-or$parsed.Host-ne'drive.google.com'){throw 'Hay dan link thu muc https://drive.google.com/drive/folders/...'}
  if($parsed.AbsolutePath-match '/folders/([A-Za-z0-9_-]{10,200})(?:/|$)'){return $matches[1]}
  throw 'Link khong phai thu muc Google Drive.'
}
function Assert-DriveArchive([string]$Zip,[string]$Checksums,[string]$Filename) {
  $entry=@(Get-Content -LiteralPath $Checksums|Where-Object {$_-match ('^([A-Fa-f0-9]{64})\s+\*?'+[regex]::Escape($Filename)+'$')})
  if($entry.Count-ne 1){throw 'Khong tim thay SHA256 chinh thuc cua rclone.'}
  $hash=($entry[0]-split '\s+')[0]
  if((Get-FileHash -LiteralPath $Zip -Algorithm SHA256).Hash-ne $hash){throw 'Checksum rclone sai; khong cai tool.'}
}
function Install-DriveTool($Paths) {
  if(Test-Path -LiteralPath $Paths.Exe){return}
  [Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol-bor[Net.SecurityProtocolType]::Tls12
  $version=(Invoke-WebRequest -UseBasicParsing -Uri 'https://downloads.rclone.org/version.txt').Content.Trim()
  if($version-notmatch '^rclone (v\d+\.\d+\.\d+)$'){throw 'Khong doc duoc phien ban rclone.'}
  $tag=$matches[1]
  $arch=if($env:PROCESSOR_ARCHITECTURE-eq'ARM64'-or$env:PROCESSOR_ARCHITEW6432-eq'ARM64'){'arm64'}elseif([Environment]::Is64BitOperatingSystem){'amd64'}else{'386'}
  $filename="rclone-$tag-windows-$arch.zip"
  $temp=Join-Path $Paths.Tools ('download-'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $temp|Out-Null
  $zip=Join-Path $temp $filename;$checksum=Join-Path $temp 'SHA256SUMS'
  Invoke-WebRequest -UseBasicParsing -Uri "https://downloads.rclone.org/$tag/SHA256SUMS" -OutFile $checksum
  Invoke-WebRequest -UseBasicParsing -Uri "https://downloads.rclone.org/$tag/$filename" -OutFile $zip
  Assert-DriveArchive $zip $checksum $filename
  Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $temp 'unpacked')
  $binary=Join-Path $temp "unpacked\rclone-$tag-windows-$arch\rclone.exe"
  if(-not(Test-Path -LiteralPath $binary)){throw 'Bo rclone khong hop le.'}
  Copy-Item -LiteralPath $binary -Destination $Paths.Exe
}
function Invoke-DriveRclone($Paths,[string[]]$Arguments) {
  & $Paths.Exe @Arguments --config $Paths.Config
  if($LASTEXITCODE-ne 0){throw "Rclone that bai (exit $LASTEXITCODE); kiem tra mang, quyen Drive va dung luong."}
}
function Get-CompletedDriveBackups([string]$DataDir) {
  $backupRoot=Join-Path $DataDir 'backups'
  foreach($kind in @('daily','weekly')) {
    $folder=Join-Path $backupRoot $kind
    if(-not(Test-Path -LiteralPath $folder)){continue}
    foreach($backup in Get-ChildItem -LiteralPath $folder -Directory|Sort-Object Name) {
      if($backup.Attributes-band[IO.FileAttributes]::ReparsePoint){continue}
      $manifest=Join-Path $backup.FullName 'SHA256SUMS.txt'
      if(-not(Test-Path -LiteralPath $manifest)){continue}
      try {
      $files=[Collections.Generic.List[string]]::new()
      foreach($line in Get-Content -LiteralPath $manifest) {
        if($line-notmatch '^([A-Fa-f0-9]{64})  ([^\\/:\r\n]+)$'){throw 'Manifest backup khong hop le.'}
        $hash=$matches[1];$name=$matches[2]
        if($name-in@('.','..','SHA256SUMS.txt')){throw 'Ten file backup khong hop le.'}
        $file=Join-Path $backup.FullName $name
        if(-not(Test-Path -LiteralPath $file -PathType Leaf)-or((Get-Item -LiteralPath $file).Attributes-band[IO.FileAttributes]::ReparsePoint)){throw 'File backup thieu hoac la lien ket.'}
        if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash-ne$hash){throw 'Checksum backup sai; khong tai ban hong len Drive.'}
        $files.Add($name)
      }
      if(-not $files.Contains('database.sql')){throw 'Backup thieu database.sql.'}
      $files.Add('SHA256SUMS.txt')
      [pscustomobject]@{Directory=$backup.FullName;Relative="$kind/$($backup.Name)";ManifestHash=(Get-FileHash -LiteralPath $manifest).Hash;Files=$files.ToArray()}
      } catch {[pscustomobject]@{Relative="$kind/$($backup.Name)";Invalid=$true}}
    }
  }
}
function Save-DriveJson([string]$Path,$Value) {
  $temporary=$Path+'.tmp'
  [IO.File]::WriteAllText($temporary,($Value|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporary -Destination $Path -Force
}
function Invoke-DriveUpload([string]$DataDir) {
  $paths=Get-DrivePaths $DataDir
  if(-not(Test-Path -LiteralPath $paths.Settings)-or-not(Test-Path -LiteralPath $paths.Config)-or-not(Test-Path -LiteralPath $paths.Exe)){throw 'Chua cai backup Drive. Chay CAI-BACKUP-GOOGLE-DRIVE.bat truoc.'}
  $lock=$null
  try{$lock=[IO.File]::Open((Join-Path $paths.Private 'upload.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)}catch [IO.IOException]{Write-Host 'Dang co tac vu tai Drive; bo qua luot trung.';return}
  try {
    $settings=Get-Content -LiteralPath $paths.Settings -Raw -Encoding UTF8|ConvertFrom-Json
    if($settings.remoteFolder-notmatch '^Oufeidun-Backup/[A-Za-z0-9_-]{1,80}$'){throw 'Thu muc Drive trong cau hinh khong hop le.'}
    $uploaded=@{};$lastSuccess=''
    if(Test-Path -LiteralPath $paths.State){$old=Get-Content -LiteralPath $paths.State -Raw -Encoding UTF8|ConvertFrom-Json;foreach($prop in $old.uploaded.PSObject.Properties){$uploaded[$prop.Name]=$prop.Value};$lastSuccess=$old.lastSuccess}
    $listFile=Join-Path $paths.Private 'upload-files.txt'
    try {
      $invalidFound=$false
      foreach($backup in @(Get-CompletedDriveBackups $paths.Data)) {
        if($backup.Invalid){$invalidFound=$true;Write-Warning "Bo qua backup sai checksum: $($backup.Relative)";continue}
        if($uploaded[$backup.Relative]-eq$backup.ManifestHash){continue}
        [IO.File]::WriteAllLines($listFile,$backup.Files,[Text.UTF8Encoding]::new($false))
        $target='oufeidun-drive:'+$settings.remoteFolder+'/'+$backup.Relative
        $flags=@('--files-from-raw',$listFile,'--checksum','--retries','3','--low-level-retries','3','--contimeout','15s','--timeout','2m','--max-duration','1h','--log-file',$paths.Log,'--log-level','NOTICE')
        Invoke-DriveRclone $paths (@('copy',$backup.Directory,$target)+$flags)|Out-Null
        Invoke-DriveRclone $paths (@('check',$backup.Directory,$target,'--one-way')+$flags)|Out-Null
        $uploaded[$backup.Relative]=$backup.ManifestHash;$lastSuccess=(Get-Date -Format o)
        Save-DriveJson $paths.State @{uploaded=$uploaded;lastSuccess=$lastSuccess;lastAttempt=(Get-Date -Format o);ok=$true}
        Write-Host "Da tai va kiem tra: $($backup.Relative)" -ForegroundColor Green
      }
      if($invalidFound){throw 'Co backup hong/manifest khong hop le da bo qua; cac ban hop le van duoc tai. Kiem tra backup local.'}
      Save-DriveJson $paths.State @{uploaded=$uploaded;lastSuccess=$lastSuccess;lastAttempt=(Get-Date -Format o);ok=$true}
    } catch {
      Save-DriveJson $paths.State @{uploaded=$uploaded;lastSuccess=$lastSuccess;lastAttempt=(Get-Date -Format o);ok=$false}
      throw
    }
  } finally {if($lock){$lock.Dispose()}}
}
