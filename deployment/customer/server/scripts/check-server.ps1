[CmdletBinding()]
param()
$ErrorActionPreference='Continue'
$node=Get-Command node -ErrorAction SilentlyContinue
$mysqlService=Get-Service -ErrorAction SilentlyContinue | Where-Object {$_.Name -like 'MySQL*'} | Sort-Object Status -Descending | Select-Object -First 1
$mysqlCommand=Get-Command mysql.exe -ErrorAction SilentlyContinue
$mysqlExe=if($mysqlCommand){Get-Item -LiteralPath $mysqlCommand.Source}else{$null}
if(-not $mysqlExe){$mysqlRoots=@($env:ProgramFiles,${env:ProgramFiles(x86)},$env:ProgramData)|Where-Object {$_ -and (Test-Path -LiteralPath $_)};$mysqlExe=$mysqlRoots|ForEach-Object {Get-ChildItem $_ -Filter mysql.exe -Recurse -File -ErrorAction SilentlyContinue}|Select-Object -First 1}
$network=Get-NetIPConfiguration | Where-Object {$_.IPv4DefaultGateway -and $_.IPv4Address.IPAddress -notlike '169.254.*'} | Select-Object -First 1
$isAdmin=([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Host '=== KIỂM TRA MÁY CHỦ OUFEIDUN ===' -ForegroundColor Cyan
Write-Host ('Windows Administrator : ' + $(if($isAdmin){'Có'}else{'Chưa mở quyền Admin'}))
Write-Host ('Node.js              : ' + $(if($node){(& $node.Source --version)}else{'CHƯA CÀI'}))
Write-Host ('MySQL Server         : ' + $(if($mysqlService){"$($mysqlService.Name) - $($mysqlService.Status)"}else{'CHƯA CÀI/CHƯA TẠO SERVICE'}))
Write-Host ('mysql.exe            : ' + $(if($mysqlExe){$mysqlExe.FullName}else{'KHÔNG TÌM THẤY'}))
Write-Host ('IPv4 đề xuất         : ' + $(if($network){$network.IPv4Address.IPAddress}else{'KHÔNG TÌM THẤY'}))
Write-Host ('Card mạng            : ' + $(if($network){$network.InterfaceAlias}else{'KHÔNG TÌM THẤY'}))
if(-not $node -or -not $mysqlService -or -not $mysqlExe -or -not $network){
  Write-Host 'Máy chưa đủ điều kiện. Đọc HUONG-DAN-MAY-CHU.txt rồi cài phần còn thiếu.' -ForegroundColor Red
  exit 1
}
Write-Host 'Máy đã có đủ thành phần cơ bản để chạy CAI-MAY-CHU.cmd.' -ForegroundColor Green
