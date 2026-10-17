function Find-LocalMySqlTool([string]$Name) {
  $command=Get-Command $Name -ErrorAction SilentlyContinue
  if($command){return $command.Source}
  $roots=@($env:ProgramFiles,${env:ProgramFiles(x86)},$env:ProgramData)|Where-Object {$_-and(Test-Path -LiteralPath $_)}
  $file=$roots|ForEach-Object {Get-ChildItem -LiteralPath $_ -Filter $Name -Recurse -File -ErrorAction SilentlyContinue}|Select-Object -First 1
  if(-not $file){throw "Khong tim thay $Name; them MySQL bin vao PATH."}
  return $file.FullName
}
function Find-LocalDataDir {
  $task=Get-ScheduledTask -TaskName 'Oufeidun Local API' -ErrorAction SilentlyContinue
  if($task){foreach($action in $task.Actions){if($action.WorkingDirectory-and(Test-Path -LiteralPath (Join-Path $action.WorkingDirectory 'config\server.env'))){return $action.WorkingDirectory}}}
  return Join-Path (Split-Path -Parent $PSScriptRoot) 'OufeidunServerData'
}
