@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Oufeidun - Ky so bo cai dat
chcp 65001 >nul

cd /d "%~dp0"

rem Co the truyen duong dan EXE o tham so thu nhat.
rem Neu khong truyen, script se uu tien bo cai dat do Electron Forge tao ra.
set "OUFEIDUN_TARGET=%~1"
if not defined OUFEIDUN_TARGET if exist "%~dp0out\make\squirrel.windows\x64\Oufeidun-Setup.exe" set "OUFEIDUN_TARGET=%~dp0out\make\squirrel.windows\x64\Oufeidun-Setup.exe"
if not defined OUFEIDUN_TARGET if exist "%~dp0Oufeidun-Setup.exe" set "OUFEIDUN_TARGET=%~dp0Oufeidun-Setup.exe"

if not defined OUFEIDUN_TARGET (
    echo [ERROR] Khong tim thay Oufeidun-Setup.exe.
    echo Hay build truoc bang lenh: npm run make
    echo Hoac keo file EXE vao setup.bat de ky file do.
    pause
    exit /b 2
)

if not exist "%OUFEIDUN_TARGET%" (
    echo [ERROR] File khong ton tai: "%OUFEIDUN_TARGET%"
    pause
    exit /b 2
)

echo [INFO] File can ky: "%OUFEIDUN_TARGET%"
echo [INFO] Dang tao hoac tai su dung chung thu ky ma noi bo Oufeidun...

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "$target = [IO.Path]::GetFullPath($env:OUFEIDUN_TARGET);" ^
  "$subject = 'CN=Oufeidun Local Code Signing';" ^
  "$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -eq $subject -and $_.NotAfter -gt (Get-Date).AddDays(30) -and $_.HasPrivateKey } | Sort-Object NotAfter -Descending | Select-Object -First 1;" ^
  "if (-not $cert) { $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $subject -FriendlyName 'Oufeidun Local Code Signing' -CertStoreLocation 'Cert:\CurrentUser\My' -KeyAlgorithm RSA -KeyLength 3072 -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(2) };" ^
  "$result = Set-AuthenticodeSignature -LiteralPath $target -Certificate $cert -HashAlgorithm SHA256;" ^
  "$signature = Get-AuthenticodeSignature -LiteralPath $target;" ^
  "if (-not $signature.SignerCertificate -or $signature.SignerCertificate.Thumbprint -ne $cert.Thumbprint) { throw 'Khong the xac minh chu ky vua tao.' };" ^
  "Write-Host ('[OK] Da ky SHA-256. Thumbprint: ' + $cert.Thumbprint) -ForegroundColor Green;" ^
  "Write-Host ('[INFO] Trang thai tin cay tren may nay: ' + $signature.Status);" ^
  "if ($signature.Status -ne 'Valid') { Write-Warning 'Chu ky tu ky chi dung cho noi bo va se khong duoc may khac tu dong tin cay.' }"

if errorlevel 1 (
    echo.
    echo [ERROR] Ky so that bai. File khong duoc bao cao la da ky thanh cong.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Da ky file cai dat Oufeidun.
echo [NOTE] Day la chu ky tu ky dung noi bo; no khong thay the chung thu code-signing do CA cap.
pause
exit /b 0
