param([string]$Rclone='')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
. (Join-Path $root 'deployment\customer\server\scripts\drive-backup-core.ps1')
function Assert($Value,[string]$Message){if(-not$Value){throw $Message}}
function Reject([scriptblock]$Block,[string]$Message){$failed=$false;try{&$Block|Out-Null}catch{$failed=$true};Assert $failed $Message}
if(-not$Rclone){$Rclone=Join-Path $root '.local\drive-tool-fixture\tools\drive-backup\rclone.exe'}
if(-not(Test-Path -LiteralPath $Rclone)){throw 'Test requires downloaded official rclone fixture.'}
$fixture=Join-Path $root ('.local\drive test & store '+[guid]::NewGuid().ToString('N'))
$data=Join-Path $fixture 'data';$remote=Join-Path $fixture 'remote'
$paths=Get-DrivePaths $data
Protect-DriveDirectory $paths.Private;Protect-DriveDirectory $paths.Tools
Copy-Item -LiteralPath $Rclone -Destination $paths.Exe
New-Item -ItemType Directory -Path $remote -Force|Out-Null
[IO.File]::WriteAllText($paths.Config,"[oufeidun-drive]`ntype = alias`nremote = $remote`n",[Text.UTF8Encoding]::new($false))
Save-DriveJson $paths.Settings @{remoteFolder='Oufeidun-Backup/test-store'}
function New-Backup([string]$Name,[string]$Kind='daily'){
 $folder=Join-Path $data "backups\$Kind\$Name";New-Item -ItemType Directory -Path $folder -Force|Out-Null
 'test SQL data'|Set-Content (Join-Path $folder 'database.sql')
 'test photo archive'|Set-Content (Join-Path $folder 'uploads.zip')
 Get-ChildItem -LiteralPath $folder -File|Get-FileHash|ForEach-Object {"$($_.Hash)  $($_.Path|Split-Path -Leaf)"}|Set-Content (Join-Path $folder 'SHA256SUMS.txt') -Encoding ascii
 return $folder
}
Assert ((Get-DriveFolderId '')-eq'') 'Default folder failed'
Assert ((Get-DriveFolderId 'https://drive.google.com/drive/u/0/folders/abcDEFG_123-456?usp=sharing')-eq'abcDEFG_123-456') 'Folder link failed'
foreach($link in @('http://drive.google.com/drive/folders/abcDEFG_123-456','https://evil.example/folders/abcDEFG_123-456','https://drive.google.com/file/d/abcDEFG_123-456/view')){Reject {Get-DriveFolderId $link} 'Invalid link accepted'}
$archive=Join-Path $fixture 'tool.zip';'fixture'|Set-Content $archive
$checks=Join-Path $fixture 'SHA256SUMS';"$((Get-FileHash $archive).Hash)  tool.zip"|Set-Content $checks
Assert-DriveArchive $archive $checks 'tool.zip';'corrupt'|Add-Content $archive;Reject {Assert-DriveArchive $archive $checks 'tool.zip'} 'Corrupt download accepted'
$one=New-Backup 'one';$weekly=New-Backup 'week-one' 'weekly'
$partial=Join-Path $data 'backups\daily\in-progress';New-Item -ItemType Directory -Path $partial -Force|Out-Null;'incomplete'|Set-Content (Join-Path $partial 'database.sql')
Invoke-DriveUpload $data
Assert (Test-Path (Join-Path $remote 'Oufeidun-Backup\test-store\daily\one\database.sql')) 'Daily upload missing'
Assert (Test-Path (Join-Path $remote 'Oufeidun-Backup\test-store\weekly\week-one\uploads.zip')) 'Weekly upload missing'
Assert (-not(Test-Path (Join-Path $remote 'Oufeidun-Backup\test-store\daily\in-progress'))) 'Incomplete backup uploaded'
$state=Get-Content $paths.State -Raw|ConvertFrom-Json;Assert ($state.ok-and@($state.uploaded.PSObject.Properties).Count-eq2) 'Upload state incorrect'
$remoteFile=Join-Path $remote 'Oufeidun-Backup\test-store\daily\one\database.sql';$firstWrite=(Get-Item $remoteFile).LastWriteTimeUtc
Invoke-DriveUpload $data;Assert ((Get-Item $remoteFile).LastWriteTimeUtc-eq$firstWrite) 'Repeat upload rewrote completed file'
# copy never deletes cloud-only files, including older backups no longer present locally.
'keep'|Set-Content (Join-Path $remote 'cloud-only.txt');Invoke-DriveUpload $data;Assert (Test-Path (Join-Path $remote 'cloud-only.txt')) 'Cloud data deleted'
$lock=[IO.File]::Open((Join-Path $paths.Private 'upload.lock'),'OpenOrCreate','ReadWrite','None')
try{Invoke-DriveUpload $data}finally{$lock.Dispose()}
$two=New-Backup 'two'
$actualInvoke=${function:Invoke-DriveRclone}
function Invoke-DriveRclone($Paths,[string[]]$Arguments){throw 'Simulated network/quota/token failure'}
Reject {Invoke-DriveUpload $data} 'Offline upload reported success'
$state=Get-Content $paths.State -Raw|ConvertFrom-Json;Assert (-not$state.ok-and-not$state.uploaded.'daily/two') 'Failure marked upload complete'
Assert (Test-Path (Join-Path $two 'database.sql')) 'Local backup was removed on failure'
Set-Item Function:Invoke-DriveRclone $actualInvoke
Invoke-DriveUpload $data;Assert (Test-Path (Join-Path $remote 'Oufeidun-Backup\test-store\daily\two\database.sql')) 'Retry did not recover'
$bad=New-Backup 'broken';'tampered'|Add-Content (Join-Path $bad 'database.sql');Reject {Invoke-DriveUpload $data} 'Corrupt local backup accepted'
Assert (-not(Test-Path (Join-Path $remote 'Oufeidun-Backup\test-store\daily\broken'))) 'Corrupt backup uploaded'
'0000000000000000000000000000000000000000000000000000000000000000  ..\secret'|Set-Content (Join-Path $bad 'SHA256SUMS.txt');Assert (@(Get-CompletedDriveBackups $data|Where-Object Invalid).Count-eq1) 'Manifest traversal accepted'
$good=New-Backup 'still-good';Reject {Invoke-DriveUpload $data} 'Corrupt backup not reported';Assert (Test-Path (Join-Path $remote 'Oufeidun-Backup\test-store\daily\still-good\database.sql')) 'Corrupt old backup blocked valid backups'
$settings=Get-Content $paths.Settings -Raw;Save-DriveJson $paths.Settings @{remoteFolder='../escape'};Reject {Invoke-DriveUpload $data} 'Invalid remote destination accepted';[IO.File]::WriteAllText($paths.Settings,$settings)
Write-Output 'PASS Drive: real rclone copy/check to isolated local remote, checksums, links, incomplete/corrupt/traversal rejection, retry, status, no cloud deletion, lock, paths with spaces/ampersand.'
