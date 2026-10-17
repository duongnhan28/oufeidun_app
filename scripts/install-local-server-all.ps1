$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
try {
  & (Join-Path $root 'scripts\setup-local-server.ps1')
  & (Join-Path $root 'scripts\install-local-services.ps1')
  Write-Host 'Cài đặt máy chủ Oufeidun Local hoàn tất.' -ForegroundColor Green
  Write-Host 'Có thể khóa màn hình bằng Windows + L; không đặt máy ở chế độ Sleep.'
} catch {
  Write-Host ''
  Write-Host ('Cài đặt chưa hoàn tất: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host ('Vị trí lỗi: ' + $_.InvocationInfo.PositionMessage) -ForegroundColor DarkYellow
}
Read-Host 'Nhấn Enter để đóng cửa sổ'