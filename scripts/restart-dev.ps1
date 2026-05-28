param(
  [int]$Port = 3000,
  [switch]$KeepNextCache
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$npm = Join-Path $root "tools\node\npm.cmd"
$nextCache = Join-Path $root ".next"

function Stop-ListeningProcess {
  param([int]$LocalPort)

  $connections = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Host "No process is currently listening on port $LocalPort."
    return
  }

  $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    if ($processId -and $processId -ne 0) {
      try {
        $process = Get-Process -Id $processId -ErrorAction Stop
        Write-Host "Stopping process $($process.ProcessName) (PID $processId) on port $LocalPort..."
        Stop-Process -Id $processId -Force -ErrorAction Stop
      } catch {
        Write-Warning ("Could not stop PID {0}: {1}" -f $processId, $_.Exception.Message)
      }
    }
  }

  Start-Sleep -Seconds 1
}

Write-Host "Preparing latest local dev server from $root"
Stop-ListeningProcess -LocalPort $Port

if (-not $KeepNextCache -and (Test-Path $nextCache)) {
  Write-Host "Removing stale .next cache..."
  Remove-Item -LiteralPath $nextCache -Recurse -Force
}

Write-Host "Starting Next dev server with Webpack on port $Port..."
Push-Location $root
try {
  & $npm run dev -- --webpack --port $Port
} finally {
  Pop-Location
}
