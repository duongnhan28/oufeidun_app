[CmdletBinding()]
param([ValidateSet('menu','install','server','client','open','lan','status')][string]$Action='menu')
$ErrorActionPreference='Stop'

function Assert-TailscaleIp([string]$Address) {
    $parsed=$null
    if (-not [Net.IPAddress]::TryParse($Address,[ref]$parsed) -or $parsed.AddressFamily -ne 'InterNetwork') {
        throw 'Nhap IPv4 Tailscale dang 100.x.x.x.'
    }
    $bytes=$parsed.GetAddressBytes()
    if ($bytes[0] -ne 100 -or $bytes[1] -lt 64 -or $bytes[1] -gt 127 -or $parsed.ToString() -ne $Address) {
        throw 'IP phai thuoc dai Tailscale 100.64.0.0/10.'
    }
}

function Read-TailscaleStatus {
    $cli=Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
    if (-not (Test-Path -LiteralPath $cli)) {
        $command=Get-Command tailscale.exe -ErrorAction SilentlyContinue
        if (-not $command) { throw 'Chua cai Tailscale. Chon muc 1 truoc.' }
        $cli=$command.Source
    }
    $json=& $cli status --json
    if ($LASTEXITCODE -ne 0) { throw 'Khong doc duoc Tailscale. Mo Tailscale va dang nhap.' }
    $status=($json -join "`n")|ConvertFrom-Json
    if ($status.BackendState -ne 'Running') { throw 'Tailscale chua ket noi. Dang nhap va bat Connect, sau do chay lai.' }
    $ip=@($status.Self.TailscaleIPs|Where-Object { $_ -match '^100\.' })|Select-Object -First 1
    Assert-TailscaleIp $ip
    return [pscustomobject]@{Ip=$ip;Status=$status}
}

function Assert-TailscalePeer($Connection,[string]$Address) {
    Assert-TailscaleIp $Address
    if ($Address -eq $Connection.Ip) { throw 'Can IP cua may con lai, ban dang nhap IP may hien tai.' }
    $peers=@($Connection.Status.Peer.PSObject.Properties|ForEach-Object { $_.Value })
    $peer=$peers|Where-Object { $_.TailscaleIPs -contains $Address }|Select-Object -First 1
    if (-not $peer) { throw 'IP chua xuat hien trong mang Tailscale cua ban. Kiem tra hai may va quyen truy cap.' }
    if (-not $peer.Online) { throw 'May con lai dang offline tren Tailscale. Bat may va ket noi lai.' }
}

function Read-PublicProfile([string]$Path) {
    $profile=Get-Content -LiteralPath $Path -Raw -Encoding UTF8|ConvertFrom-Json
    if ($profile.v -ne 1 -or -not $profile.serverId -or -not $profile.publicKey -or -not $profile.rootCertificatePem -or
        $profile.privateKey -or $profile.hostName -notmatch '^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$' -or
        $profile.httpsPort -ne 443) {
        throw 'Can server-profile.json public hop le cua cua hang, dung HTTPS 443. Lay tu bo may nhan vien do may chu xuat.'
    }
    return $profile
}

function Assert-SameStore($First,$Second) {
    if ($First.serverId -ne $Second.serverId -or $First.publicKey -ne $Second.publicKey -or
        $First.hostName -ne $Second.hostName -or $First.rootCertificatePem -ne $Second.rootCertificatePem) {
        throw 'Nhan dien cua hang khac ban da luu. Kiem tra lai public profile truoc khi doi ket noi.'
    }
}

function Test-RemoteHealth($Profile,[string]$Address) {
    $curl=Get-Command curl.exe -ErrorAction SilentlyContinue
    if (-not $curl) { throw 'Can curl.exe cua Windows 10/11 de kiem tra HTTPS.' }
    $temp=Join-Path ([IO.Path]::GetTempPath()) ('oufeidun-remote-'+[guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $temp|Out-Null
    $ca=Join-Path $temp 'public-ca.pem'
    $healthFile=Join-Path $temp 'health.json'
    try {
        [IO.File]::WriteAllText($ca,$Profile.rootCertificatePem,[Text.UTF8Encoding]::new($false))
        $resolve='{0}:{1}:{2}' -f $Profile.hostName,$Profile.httpsPort,$Address
        & $curl.Source --silent --show-error --fail --noproxy '*' --connect-timeout 5 --max-time 12 --ssl-revoke-best-effort --cacert $ca --resolve $resolve --output $healthFile ('https://'+$Profile.hostName+':'+$Profile.httpsPort+'/health')
        if ($LASTEXITCODE -ne 0) { throw 'HTTPS chua dat. Kiem tra Tailscale, quyen mang, firewall 443, Caddy va public profile cua cua hang.' }
        $health=Get-Content -LiteralPath $healthFile -Raw -Encoding UTF8|ConvertFrom-Json
        if ($health.ok -ne $true -or $health.service -ne 'oufeidun-local-api') { throw 'Dich vu tra ve chua dung Oufeidun Local API.' }
    } finally {
        # Only these two generated files are removed, with literal paths.
        Remove-Item -LiteralPath $ca,$healthFile -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $temp -ErrorAction SilentlyContinue
    }
}

function Write-ProfileAtomically([string]$Path,$Profile) {
    $directory=Split-Path -Parent $Path
    New-Item -ItemType Directory -Path $directory -Force|Out-Null
    $temporary=Join-Path $directory ([guid]::NewGuid().ToString('N')+'.tmp')
    try {
        [IO.File]::WriteAllText($temporary,($Profile|ConvertTo-Json -Depth 10),[Text.UTF8Encoding]::new($false))
        if (Test-Path -LiteralPath $Path) { [IO.File]::Replace($temporary,$Path,[NullString]::Value) }
        else { [IO.File]::Move($temporary,$Path) }
    } finally { Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue }
}

function Set-RemoteProfile([string]$Cache,[string]$Source,[string]$Address) {
    Assert-TailscaleIp $Address
    $profile=Read-PublicProfile $Source
    if (Test-Path -LiteralPath $Cache) { Assert-SameStore $profile (Read-PublicProfile $Cache) }
    $backup=$Cache+'.before-tailscale.json'
    if (Test-Path -LiteralPath $backup) { Assert-SameStore $profile (Read-PublicProfile $backup) }
    Test-RemoteHealth $profile $Address
    if (-not (Test-Path -LiteralPath $backup)) { Write-ProfileAtomically $backup $profile }
    $profile|Add-Member -NotePropertyName serverIp -NotePropertyValue $Address -Force
    Write-ProfileAtomically $Cache $profile
}

function Restore-LanProfile([string]$Cache) {
    $backup=$Cache+'.before-tailscale.json'
    if (-not (Test-Path -LiteralPath $backup)) { throw 'Chua co ban luu LAN. Chay cau hinh laptop truoc.' }
    $profile=Read-PublicProfile $backup
    if (Test-Path -LiteralPath $Cache) { Assert-SameStore $profile (Read-PublicProfile $Cache) }
    Write-ProfileAtomically $Cache $profile
}

function Enable-RemoteFirewall($Connection,[string]$LaptopIp) {
    Assert-TailscalePeer $Connection $LaptopIp
    $principal=[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Tren MAY CHU, nhap phai KET-NOI-TU-XA.bat va chon Run as administrator, roi chon muc 2.'
    }
    $address=Get-NetIPAddress -AddressFamily IPv4 -IPAddress $Connection.Ip -ErrorAction Stop|Select-Object -First 1
    $name='Oufeidun-Tailscale-'+$LaptopIp.Replace('.','-')
    $parameters=@{DisplayName=('Oufeidun HTTPS Tailscale '+$LaptopIp);Direction='Inbound';Action='Allow';Protocol='TCP';LocalPort=443;LocalAddress=$Connection.Ip;RemoteAddress=$LaptopIp;InterfaceAlias=$address.InterfaceAlias;Profile='Any';Enabled='True'}
    if (Get-NetFirewallRule -Name $name -ErrorAction SilentlyContinue) { Set-NetFirewallRule -Name $name @parameters|Out-Null }
    else { New-NetFirewallRule -Name $name @parameters|Out-Null }
    Write-Host ('Da cho phep laptop '+$LaptopIp+' truy cap HTTPS. IP Tailscale MAY CHU la '+$Connection.Ip) -ForegroundColor Green
}

function Open-RemoteApp([string]$Cache) {
    if (-not (Test-Path -LiteralPath $Cache)) { throw 'Chua co public profile. Chon muc 3 de cau hinh laptop.' }
    $profile=Read-PublicProfile $Cache
    $connection=Read-TailscaleStatus
    Assert-TailscalePeer $connection $profile.serverIp
    Test-RemoteHealth $profile $profile.serverIp
    $updater=Join-Path $env:LOCALAPPDATA 'KinhBanHang\Update.exe'
    if (Test-Path -LiteralPath $updater) {
        Start-Process -FilePath $updater -ArgumentList '--processStart Oufeidun.exe' -WindowStyle Normal|Out-Null
        return
    }
    $executable=(Read-Host 'Nhap duong dan Oufeidun.exe cua ban portable').Trim().Trim('"')
    if (-not (Test-Path -LiteralPath $executable -PathType Leaf) -or [IO.Path]::GetFileName($executable) -ne 'Oufeidun.exe') { throw 'Chua tim thay Oufeidun.exe.' }
    Start-Process -FilePath $executable -ArgumentList ('--server-profile="'+$Cache+'"') -WindowStyle Normal|Out-Null
}

function Invoke-RemoteMenu([string]$Selection) {
    $cache=Join-Path $env:APPDATA 'Oufeidun\server-profile.json'
    if ($Selection -eq 'menu') {
        Write-Host 'OUFEIDUN - TAILSCALE'
        Write-Host '1. Cai / mo Tailscale de dang nhap (ca hai may)'
        Write-Host '2. MAY CHU: cho phep laptop truy cap (Administrator)'
        Write-Host '3. LAPTOP: cau hinh IP may chu va kiem tra HTTPS'
        Write-Host '4. LAPTOP: kiem tra va mo app tu xa'
        Write-Host '5. LAPTOP: chuyen lai ket noi LAN'
        Write-Host '6. Xem IP Tailscale cua may hien tai'
        Write-Host '0. Thoat'
        switch (Read-Host 'Chon muc') {
            '1' {$Selection='install'} '2' {$Selection='server'} '3' {$Selection='client'}
            '4' {$Selection='open'} '5' {$Selection='lan'} '6' {$Selection='status'} '0' {return}
            default {throw 'Muc khong hop le.'}
        }
    }
    if ($Selection -eq 'install') {
        $gui=Join-Path $env:ProgramFiles 'Tailscale\tailscale-ipn.exe'
        if (Test-Path -LiteralPath $gui) { Start-Process -FilePath $gui -WindowStyle Normal|Out-Null }
        else { Start-Process 'https://tailscale.com/download/windows'|Out-Null }
        Write-Host 'Cai Tailscale tu trang chinh thuc, dang nhap va dua hai may vao cung mang Tailscale. Sau do chay lai BAT.'
        return
    }
    if ($Selection -eq 'status') {
        $connection=Read-TailscaleStatus
        Write-Host ('IP Tailscale cua may nay: '+$connection.Ip)
        return
    }
    if ($Selection -eq 'server') {
        $connection=Read-TailscaleStatus
        Write-Host ('IP Tailscale cua MAY CHU nay: '+$connection.Ip)
        $laptop=(Read-Host 'Nhap IP Tailscale cua laptop chu cua hang').Trim()
        Enable-RemoteFirewall $connection $laptop
        return
    }
    if (Get-Process Oufeidun -ErrorAction SilentlyContinue) { throw 'Luu don nhap va dong Oufeidun truoc khi doi ket noi hoac mo lai.' }
    switch ($Selection) {
        'client' {
            $connection=Read-TailscaleStatus
            Write-Host ('IP Tailscale cua LAPTOP nay: '+$connection.Ip)
            $server=(Read-Host 'Nhap IP Tailscale cua MAY CHU').Trim()
            Assert-TailscalePeer $connection $server
            $source=$cache
            if (-not (Test-Path -LiteralPath $source)) {
                $source=(Read-Host 'Nhap duong dan server-profile.json public tu bo may nhan vien cua cua hang').Trim().Trim('"')
            }
            Set-RemoteProfile $cache $source $server
            Write-Host 'HTTPS da dat, ket noi da luu. Chon muc 4 trong lan chay BAT tiep theo de mo app.' -ForegroundColor Green
        }
        'open' { Open-RemoteApp $cache }
        'lan' { Restore-LanProfile $cache; Write-Host 'Da khoi phuc public profile LAN. Mo lai app bang shortcut thong thuong.' -ForegroundColor Green }
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    try { Invoke-RemoteMenu $Action; if ($Action -ne 'open') { [void](Read-Host 'Nhan Enter de dong') } }
    catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
}
