$ErrorActionPreference='Stop'
& (Join-Path $PSScriptRoot 'manage-server.ps1') -Action restart
