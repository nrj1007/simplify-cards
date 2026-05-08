$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$node = Join-Path $root "tools\node\node.exe"
$next = Join-Path $root "node_modules\next\dist\bin\next"

& $node $next build
