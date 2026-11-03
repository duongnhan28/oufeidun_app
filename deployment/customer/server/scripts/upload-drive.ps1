param([Parameter(Mandatory=$true)][string]$DataDir)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'drive-backup-core.ps1')
try {Invoke-DriveUpload $DataDir} catch {Write-Host $_.Exception.Message -ForegroundColor Red;exit 1}
