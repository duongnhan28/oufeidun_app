[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
function PlainText([Security.SecureString]$value){$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($value);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}}
$identity=[Security.Principal.WindowsIdentity]::GetCurrent();$principal=[Security.Principal.WindowsPrincipal]::new($identity)
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Hãy chạy bằng quyền Administrator.'}
$serverFolder=Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'existing-server.ps1')
$dataDir=(Resolve-ExistingServer $serverFolder).DataDir
$dataDir=[IO.Path]::GetFullPath($dataDir)
$envFile=Join-Path $dataDir 'config\server.env'
if(-not(Test-Path -LiteralPath $envFile)){throw "Không tìm thấy $envFile"}
$cfg=@{};Get-Content -LiteralPath $envFile -Encoding UTF8|ForEach-Object{if($_ -match '^([^#=]+)=(.*)$'){$cfg[$matches[1].Trim()]=$matches[2]}}
foreach($key in 'MYSQL_DATABASE','MYSQL_USER','MYSQL_PASSWORD'){if([string]::IsNullOrWhiteSpace([string]$cfg[$key])){throw "Thiếu $key trong server.env"}}
if($cfg.MYSQL_DATABASE -ne 'oufeidun_local' -or $cfg.MYSQL_USER -ne 'oufeidun_app'){throw 'Cấu hình database/user không đúng bộ Oufeidun chuẩn; dừng để tránh sửa nhầm.'}
$mysqlCommand=Get-Command mysql.exe -ErrorAction SilentlyContinue
$mysqlExe=if($mysqlCommand){Get-Item -LiteralPath $mysqlCommand.Source}else{$null}
if(-not $mysqlExe){$mysqlRoots=@($env:ProgramFiles,${env:ProgramFiles(x86)},$env:ProgramData)|Where-Object {$_ -and (Test-Path -LiteralPath $_)};$mysqlExe=$mysqlRoots|ForEach-Object {Get-ChildItem $_ -Filter mysql.exe -Recurse -File -ErrorAction SilentlyContinue}|Select-Object -First 1}
if(-not $mysqlExe){throw 'Không tìm thấy mysql.exe. Hãy cài MySQL Client hoặc thêm thư mục bin của MySQL vào PATH.'}
$rootPassword=PlainText (Read-Host 'Nhập mật khẩu root MySQL (không hiển thị)' -AsSecureString)
$sql=@"
CREATE USER IF NOT EXISTS 'oufeidun_app'@'localhost' IDENTIFIED BY '$($cfg.MYSQL_PASSWORD)';
ALTER USER 'oufeidun_app'@'localhost' IDENTIFIED BY '$($cfg.MYSQL_PASSWORD)';
GRANT ALL PRIVILEGES ON ``oufeidun_local``.* TO 'oufeidun_app'@'localhost';
FLUSH PRIVILEGES;
"@
$oldPassword=$env:MYSQL_PWD
try{
  $env:MYSQL_PWD=$rootPassword
  $sql|& $mysqlExe.FullName --protocol=TCP --host=127.0.0.1 --port=3306 --user=root
  if($LASTEXITCODE-ne 0){throw 'Không sửa được quyền MySQL. Kiểm tra mật khẩu root.'}
}finally{
  $rootPassword=$null
  if($null-eq$oldPassword){Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue}else{$env:MYSQL_PWD=$oldPassword}
}
Write-Host ''
Write-Host 'Đã cấp quyền local cho oufeidun_app@localhost.' -ForegroundColor Green
Write-Host 'DBeaver: Host 127.0.0.1 | Port 3306 | Database oufeidun_local | User oufeidun_app'
Write-Host "Lấy MYSQL_PASSWORD tại: $envFile"
