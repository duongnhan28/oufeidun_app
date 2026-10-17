[CmdletBinding()]
param(
  [string]$HostName='oufeidun.home.arpa',
  [string]$LookupUrl='https://oufeidun.vn/api/glass-lookup'
)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$envFile=Join-Path $root '.env.local-mysql.local'
$content=@"
VITE_SERVER_ENV=local
VITE_DEMO_MODE=false
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=https://$HostName/api/app/v1
VITE_GLASS_LOOKUP_API_URL=$LookupUrl
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
"@
[IO.File]::WriteAllText($envFile,$content,[Text.UTF8Encoding]::new($false))
Push-Location $root
try{& npm.cmd run make:local;if($LASTEXITCODE-ne 0){throw 'Build client local thất bại.'}}
finally{Pop-Location}
Write-Host 'Đã tạo bộ cài client local.' -ForegroundColor Green
