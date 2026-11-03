$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$source=Join-Path $root 'deployment\customer\server\scripts\manage-server.ps1'
$tokens=$null;$errors=$null
$tree=[Management.Automation.Language.Parser]::ParseFile($source,[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'PowerShell parse error'}
$function=$tree.Find({param($node) $node-is[Management.Automation.Language.FunctionDefinitionAst]-and$node.Name-eq'Wait-Api'},$true)
Invoke-Expression $function.Extent.Text
$fixture=Join-Path $root ('.local\health version '+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $fixture 'app') -Force|Out-Null
function Invoke-RestMethod {param($Uri,$TimeoutSec) return $script:Response}
function Start-Sleep {param($Seconds) $script:Retries++}
foreach($case in @(
 @{Expected='0.1.1';Actual='0.1.1';OK=$true;Ready=$true},
 @{Expected='0.1.1';Actual='0.2.18';OK=$true;Ready=$false},
 @{Expected='0.2.18';Actual='0.1.1';OK=$true;Ready=$false},
 @{Expected='0.1.1';Actual='0.1.1';OK=$false;Ready=$false},
 @{Expected='0.1.1';Actual=$null;OK=$true;Ready=$false},
 @{Expected='0.2.18';Actual=$null;OK=$true;Ready=$false},
 @{Expected='0.2.11';Actual=$null;OK=$true;Ready=$true;Legacy=$true}
)){
 $caseDir=Join-Path $fixture ([guid]::NewGuid().ToString('N'))
 New-Item -ItemType Directory -Path (Join-Path $caseDir 'app\src') -Force|Out-Null
 $profile=[pscustomobject]@{DataDir=$caseDir;Port=1}
 if(-not$case.Legacy){'test capability marker'|Set-Content (Join-Path $caseDir 'app\src\discovery.cjs')}
 @{version=$case.Expected}|ConvertTo-Json|Set-Content (Join-Path $caseDir 'app\package.json')
 $script:Response=[pscustomobject]@{version=$case.Actual;ok=$case.OK};$script:Retries=0
 $ready=$true;try{Wait-Api}catch{$ready=$false}
 if($ready-ne$case.Ready){throw 'Readiness accepted the wrong API/version'}
 if(-not$ready-and$script:Retries-ne30){throw 'Readiness retry count changed'}
}
Write-Output 'PASS health versions: 0.1.1 accepts only matching live API, rejects stale 0.2.18/failures; legacy missing-version compatibility retained.'
