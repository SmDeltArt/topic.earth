param(
  [switch]$NoWrite,
  [switch]$FailOnNewEnglish
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "tools\track-read-messages.mjs"

if (-not (Test-Path $scriptPath)) {
  throw "Read message tracker not found: $scriptPath"
}

$nodeArgs = @($scriptPath)
if ($NoWrite) {
  $nodeArgs += "--no-write"
}
if ($FailOnNewEnglish) {
  $nodeArgs += "--fail-on-new-en"
}

Write-Host "topic.earth read-message monitor" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"
Write-Host "Command: node $($nodeArgs -join ' ')"
node @nodeArgs
