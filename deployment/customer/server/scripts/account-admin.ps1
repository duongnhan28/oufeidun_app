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
$envFile=Join-Path $dataDir 'config\server.env';$runtimeApp=Join-Path $dataDir 'app'
if(-not(Test-Path -LiteralPath $envFile)-or-not(Test-Path -LiteralPath (Join-Path $runtimeApp 'src\core.cjs'))){throw 'Runtime máy chủ chưa được cài đầy đủ.'}
$node=(Get-Command node -ErrorAction Stop).Source
$env:OUFEIDUN_SERVER_ENV=$envFile;$env:OUFEIDUN_RUNTIME_APP=$runtimeApp
try{
  Write-Host '1. Xem danh sách tài khoản'
  Write-Host '2. Kiểm tra một mật khẩu có đúng không'
  Write-Host '3. Đặt lại mật khẩu và mở khóa tài khoản'
  $choice=Read-Host 'Chọn 1, 2 hoặc 3'
  if($choice-eq '1'){& $node (Join-Path $PSScriptRoot 'account-admin.cjs') list;if($LASTEXITCODE-ne 0){throw 'Không đọc được tài khoản.'};exit 0}
  $login=Read-Host 'Tên đăng nhập [admin]';if([string]::IsNullOrWhiteSpace($login)){$login='admin'}
  $password=PlainText (Read-Host $(if($choice-eq '2'){'Nhập mật khẩu cần kiểm tra (không hiển thị)'}else{'Nhập mật khẩu mới, tối thiểu 12 ký tự (không hiển thị)'}) -AsSecureString)
  if($choice-eq '2'){$env:OUFEIDUN_ACCOUNT_ACTION='verify'}elseif($choice-eq '3'){if($password.Length-lt 12){throw 'Mật khẩu mới phải có ít nhất 12 ký tự.'};$confirm=PlainText (Read-Host 'Nhập lại mật khẩu mới (không hiển thị)' -AsSecureString);if($password-ne $confirm){throw 'Hai mật khẩu không trùng nhau.'};$confirm=$null;$env:OUFEIDUN_ACCOUNT_ACTION='reset'}else{throw 'Lựa chọn không hợp lệ.'}
  $env:OUFEIDUN_ACCOUNT_LOGIN=$login.Trim().ToLowerInvariant();$env:OUFEIDUN_ACCOUNT_PASSWORD=$password
  & $node (Join-Path $PSScriptRoot 'account-admin.cjs');if($LASTEXITCODE-ne 0){throw 'Thao tác tài khoản thất bại.'}
}finally{$password=$null;Remove-Item Env:OUFEIDUN_ACCOUNT_PASSWORD,Env:OUFEIDUN_ACCOUNT_LOGIN,Env:OUFEIDUN_ACCOUNT_ACTION,Env:OUFEIDUN_RUNTIME_APP,Env:OUFEIDUN_SERVER_ENV -ErrorAction SilentlyContinue}
