[CmdletBinding()]
param(
  [string]$MysqlExe = '',
  [string]$Database = 'oufeidun_local',
  [string]$AppUser = 'oufeidun_app'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'local-paths.ps1')
if(-not $MysqlExe){$MysqlExe=Find-LocalMySqlTool 'mysql.exe'}
$taskDataDir=Find-LocalDataDir
if (-not (Test-Path -LiteralPath $MysqlExe)) { throw "Không tìm thấy mysql.exe tại $MysqlExe" }

function PlainText([Security.SecureString]$Secure) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$rootPassword = $env:OUFEIDUN_SETUP_MYSQL_ROOT_PASSWORD
$adminPassword = $env:OUFEIDUN_SETUP_ADMIN_PASSWORD
if ([string]::IsNullOrWhiteSpace($rootPassword)) {
  $rootPasswordSecure = Read-Host 'Nhập mật khẩu root MySQL (không hiển thị)' -AsSecureString
  $rootPassword = PlainText $rootPasswordSecure
}
if ([string]::IsNullOrWhiteSpace($adminPassword)) {
  $adminPasswordSecure = Read-Host 'Tạo mật khẩu admin Oufeidun, tối thiểu 12 ký tự (không hiển thị)' -AsSecureString
  $adminPassword = PlainText $adminPasswordSecure
}
if ($adminPassword.Length -lt 12) { throw 'Mật khẩu admin phải có ít nhất 12 ký tự.' }

$random = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($random) } finally { $rng.Dispose() }
$appPassword = [Convert]::ToBase64String($random).TrimEnd('=').Replace('+','-').Replace('/','_')
$testRandom = New-Object byte[] 24
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($testRandom) } finally { $rng.Dispose() }
$testAdminPassword = 'T!' + [Convert]::ToBase64String($testRandom).TrimEnd('=').Replace('+','-').Replace('/','_')
$sql = @"
CREATE DATABASE IF NOT EXISTS ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS ``${Database}_test`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$AppUser'@'127.0.0.1' IDENTIFIED BY '$appPassword';
ALTER USER '$AppUser'@'127.0.0.1' IDENTIFIED BY '$appPassword';
GRANT ALL PRIVILEGES ON ``$Database``.* TO '$AppUser'@'127.0.0.1';
GRANT ALL PRIVILEGES ON ``${Database}_test``.* TO '$AppUser'@'127.0.0.1';
FLUSH PRIVILEGES;
"@

$oldPassword = $env:MYSQL_PWD
try {
  $env:MYSQL_PWD = $rootPassword
  $sql | & $MysqlExe --default-character-set=utf8mb4 --protocol=TCP --host=127.0.0.1 --user=root
  if ($LASTEXITCODE -ne 0) { throw 'Không thể tạo database/user. Hãy kiểm tra mật khẩu root MySQL.' }
} finally {
  if ($null -eq $oldPassword) { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue } else { $env:MYSQL_PWD = $oldPassword }
  $rootPassword = $null
}

$envFile = Join-Path $root 'server\.env.local'
$content = @"
OUFEIDUN_HOST=127.0.0.1
OUFEIDUN_PORT=8787
OUFEIDUN_DATA_DIR=$taskDataDir
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=$Database
MYSQL_USER=$AppUser
MYSQL_PASSWORD=$appPassword
ADMIN_LOGIN=admin
ADMIN_DISPLAY_NAME=Admin
ADMIN_PASSWORD=$adminPassword
SESSION_IDLE_SECONDS=90
OUFEIDUN_ALLOWED_ORIGINS=shop://app,http://127.0.0.1:5178
"@
[IO.File]::WriteAllText($envFile, $content, [Text.UTF8Encoding]::new($false))
$testEnvFile = Join-Path $root 'server\.env.test.local'
$testContent = $content -replace "MYSQL_DATABASE=$Database", "MYSQL_DATABASE=${Database}_test"
$testContent = $testContent -replace '(?m)^ADMIN_PASSWORD=.*$', "ADMIN_PASSWORD=$testAdminPassword"
[IO.File]::WriteAllText($testEnvFile, $testContent, [Text.UTF8Encoding]::new($false))
$currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
foreach ($secretFile in @($envFile,$testEnvFile)) {
  & icacls.exe $secretFile /inheritance:r /grant:r "*${currentSid}:(F)" '*S-1-5-18:(F)' '*S-1-5-32-544:(F)' | Out-Null
}

Push-Location $root
try {
  & npm.cmd run server:migrate
  if ($LASTEXITCODE -ne 0) { throw 'Migration MySQL thất bại.' }
  $env:OUFEIDUN_SERVER_ENV = $testEnvFile
  & npm.cmd run server:migrate
  Remove-Item Env:OUFEIDUN_SERVER_ENV -ErrorAction SilentlyContinue
  if ($LASTEXITCODE -ne 0) { throw 'Migration database kiểm thử thất bại.' }
  $safeContent = $content -replace '(?m)^ADMIN_PASSWORD=.*$', 'ADMIN_PASSWORD='
  [IO.File]::WriteAllText($envFile, $safeContent, [Text.UTF8Encoding]::new($false))
  Write-Host 'Đã tạo database, user ứng dụng, schema và tài khoản admin.' -ForegroundColor Green
  Write-Host "Cấu hình local: $envFile"
} finally {
  Pop-Location
  $adminPassword = $null
  $appPassword = $null
  $testAdminPassword = $null
}
