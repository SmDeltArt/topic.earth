param(
  [string]$Lg = "",
  [string]$Ids = "",
  [switch]$DryRun,
  [switch]$Force,
  [switch]$NoWebm
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "tools\generate-read-audio.mjs"
$ffmpegPath = $env:FFMPEG_PATH

if (-not $ffmpegPath) {
  $ffmpegPath = "C:\ffmpeg\bin\ffmpeg.exe"
}

if (-not (Test-Path $scriptPath)) {
  throw "Audio generator not found: $scriptPath"
}

if (-not (Test-Path $ffmpegPath)) {
  Write-Warning "ffmpeg not found at $ffmpegPath. MP3 generation can still run, but WEBM conversion will be skipped by the Node script."
}

if (-not $DryRun -and -not $env:OPENAI_API_KEY -and -not $env:OPENAI_APIKEY) {
  Write-Host "OPENAI_API_KEY is not set. Running dry-run preview instead." -ForegroundColor Yellow
  $DryRun = $true
}

$nodeArgs = @($scriptPath)

if ($DryRun) {
  $nodeArgs += "--dry-run"
}

if ($Force) {
  $nodeArgs += "--force"
}

if ($NoWebm) {
  $nodeArgs += "--no-webm"
}

if ($Lg) {
  $nodeArgs += "--lg=$Lg"
}

if ($Ids) {
  $nodeArgs += "--ids=$Ids"
}

Write-Host "topic.earth read-audio batch" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"
Write-Host "ffmpeg: $ffmpegPath"
Write-Host "Command: node $($nodeArgs -join ' ')"

node @nodeArgs
