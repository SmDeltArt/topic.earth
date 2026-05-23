param(
  [string]$AudioRoot = "",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $AudioRoot) {
  $AudioRoot = Join-Path $repoRoot "assets\audio\read-messages"
}

if (-not (Test-Path $AudioRoot)) {
  throw "Audio folder not found: $AudioRoot"
}

$resolvedAudioRoot = Resolve-Path $AudioRoot
$files = Get-ChildItem -Path $resolvedAudioRoot -Recurse -File -Filter "*.mp3"
$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
if (-not $totalBytes) {
  $totalBytes = 0
}

Write-Host "topic.earth read-audio MP3 cleanup" -ForegroundColor Cyan
Write-Host "Audio root: $resolvedAudioRoot"
Write-Host ("MP3 files: {0}" -f $files.Count)
Write-Host ("Potential space gain: {0:N2} MB" -f ($totalBytes / 1MB))

if (-not $Apply) {
  Write-Host "Dry run only. Re-run with -Apply to delete these MP3 files." -ForegroundColor Yellow
  $files | Select-Object -First 20 FullName,@{Name="MB";Expression={[math]::Round($_.Length / 1MB, 2)}} | Format-Table -AutoSize
  if ($files.Count -gt 20) {
    Write-Host ("...and {0} more" -f ($files.Count - 20))
  }
  exit 0
}

$files | Remove-Item -Force
Write-Host ("Deleted {0} MP3 file(s)." -f $files.Count) -ForegroundColor Green
