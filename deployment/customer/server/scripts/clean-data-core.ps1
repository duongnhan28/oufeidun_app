[CmdletBinding()]
param([string]$DataDir='')
$ErrorActionPreference='Stop'
$stopped=$false;$committed=$false;$moved=$false;$archive=$null;$failed=$false
try{
  . (Join-Path $PSScriptRoot 'existing-server.ps1')
  Assert-ServerAdmin
  $profile=Resolve-ExistingServer (Split-Path -Parent $PSScriptRoot) $DataDir
  $data=[IO.Path]::GetFullPath($profile.DataDir).TrimEnd('\')
  if($data-eq [IO.Path]::GetPathRoot([IO.Path]::GetFullPath($profile.DataDir)).TrimEnd('\')){throw 'Thu muc du lieu khong duoc la goc o dia.'}
  if(-not $profile.Config.OUFEIDUN_DATA_DIR-or[IO.Path]::GetFullPath($profile.Config.OUFEIDUN_DATA_DIR).TrimEnd('\')-ne $data){throw 'Cau hinh dataDir khong khop. Dung thao tac de tranh dung nham du lieu.'}
  $uploads=Join-Path $data 'uploads'
  if(Test-Path -LiteralPath $uploads){
    if((Get-Item -LiteralPath $uploads).Attributes-band[IO.FileAttributes]::ReparsePoint){throw 'uploads la lien ket thu muc; can kiem tra truoc khi don.'}
    if(Get-ChildItem -LiteralPath $uploads -Recurse -Force|Where-Object {$_.Attributes-band[IO.FileAttributes]::ReparsePoint}){throw 'Anh co lien ket thu muc; can kiem tra truoc khi don.'}
  }
  $task=Get-ScheduledTask -TaskName 'Oufeidun Local API' -ErrorAction Stop
  $preview=& node (Join-Path $PSScriptRoot 'clean-database.cjs') preview (Join-Path $data 'app') $profile.EnvFile
  if($LASTEXITCODE-ne 0){throw 'Khong the kiem tra database. Chua xoa gi.'}
  $summary=$preview|ConvertFrom-Json
  Write-Host "THU MUC DU LIEU: $data"
  Write-Host "DATABASE SE DON: $($profile.Config.MYSQL_DATABASE)" -ForegroundColor Yellow
  $summary.counts.PSObject.Properties|ForEach-Object {Write-Host "$($_.Name): $($_.Value)"}
  Write-Host 'Xoa SAN PHAM, HANG KHO, KHACH HANG, DON, THANH TOAN, LICH SU, BANG GIA va anh local.' -ForegroundColor Yellow
  Write-Host 'GIU NGUYEN account/mat khau/quyen, cau hinh, chung chi, backup va migration.'
  Write-Host 'Dong Oufeidun tren TAT CA may truoc khi tiep tuc.'
  $phrase="XOA DU LIEU $($profile.Config.MYSQL_DATABASE)"
  $answer=Read-Host "Nhap nguyen van [$phrase] de xac nhan (Enter de huy)"
  if($answer-cne $phrase){Write-Host 'Da huy. Khong xoa du lieu.';exit 0}
  Stop-ScheduledTask -TaskName 'Oufeidun Local API' -ErrorAction Stop;$stopped=$true
  for($attempt=0;$attempt-lt 20;$attempt++){
    if(-not(Get-NetTCPConnection -LocalPort $profile.Port -State Listen -ErrorAction SilentlyContinue)){break}
    Start-Sleep -Milliseconds 500
  }
  if(Get-NetTCPConnection -LocalPort $profile.Port -State Listen -ErrorAction SilentlyContinue){throw 'API van dang chay. Khong xoa; chay DUNG-MAY-CHU va kiem tra lai.'}
  $backup=& (Join-Path $PSScriptRoot 'backup-server.ps1') -EnvFile $profile.EnvFile -PassThru
  if(-not $backup.Directory-or-not(Test-Path -LiteralPath (Join-Path $backup.Directory 'database.sql'))){throw 'Chua co backup hop le. Khong xoa du lieu.'}
  if((Get-Item -LiteralPath (Join-Path $backup.Directory 'database.sql')).Length-lt 128-or-not(Test-Path -LiteralPath (Join-Path $backup.Directory 'SHA256SUMS.txt'))){throw 'Backup khong day du. Khong xoa du lieu.'}
  $archive=Join-Path $backup.Directory 'uploads-before-clean'
  # Both resolved targets must remain inside the detected data folder.
  foreach($target in @($uploads,$archive)){
    if(-not([IO.Path]::GetFullPath($target).StartsWith($data+'\',[StringComparison]::OrdinalIgnoreCase))){throw 'Duong dan anh/backup nam ngoai folder du lieu.'}
  }
  if(Test-Path -LiteralPath $uploads){Move-Item -LiteralPath $uploads -Destination $archive;$moved=$true}
  New-Item -ItemType Directory -Path (Join-Path $uploads 'products') -Force|Out-Null
  $result=& node (Join-Path $PSScriptRoot 'clean-database.cjs') apply (Join-Path $data 'app') $profile.EnvFile
  if($LASTEXITCODE-ne 0){throw 'Don database that bai; transaction da rollback. Backup van duoc giu.'}
  $committed=$true
  Write-Host 'Da don du lieu nghiep vu. Account/mat khau/quyen giu nguyen.' -ForegroundColor Green
  Write-Host "Backup truoc khi don: $($backup.Directory)"
}catch{
  if($moved-and-not $committed){
    $products=Join-Path $uploads 'products'
    $unexpected=@(Get-ChildItem -LiteralPath $uploads -Force -ErrorAction SilentlyContinue|Where-Object {$_.FullName-ne $products})
    $children=@(Get-ChildItem -LiteralPath $products -Force -ErrorAction SilentlyContinue)
    if($unexpected.Count-eq 0-and$children.Count-eq 0){
      if(Test-Path -LiteralPath $products){Remove-Item -LiteralPath $products -ErrorAction Stop}
      if(Test-Path -LiteralPath $uploads){Remove-Item -LiteralPath $uploads -ErrorAction Stop}
      Move-Item -LiteralPath $archive -Destination $uploads
    }else{Write-Host "Anh cu van nam tai $archive; can kiem tra thu cong." -ForegroundColor Yellow}
  }
  Write-Host $_.Exception.Message -ForegroundColor Red
  $failed=$true
}finally{
  if($stopped){try{Start-ScheduledTask -TaskName 'Oufeidun Local API' -ErrorAction Stop}catch{Write-Host 'Khong khoi dong lai duoc API. Chay CHAY-MAY-CHU.bat.' -ForegroundColor Red;$failed=$true}}
}
Read-Host 'Nhan Enter de dong'
if($failed){exit 1}
exit 0
