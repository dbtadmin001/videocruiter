# Serves the app on http://localhost:8000 and opens it in your browser.
# Camera access requires localhost -- opening index.html directly (file://) will not work.

$port = 8000

Set-Location -LiteralPath $PSScriptRoot

Write-Host ""
Write-Host "  Mock VidCruiter  ->  http://localhost:$port" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor DarkGray
Write-Host ""

Start-Process "http://localhost:$port"
python -m http.server $port
