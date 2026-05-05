$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

$backendVenvPython = Join-Path $backend ".venv\Scripts\python.exe"
$rootVenvPython = Join-Path (Split-Path -Parent $root) ".venv\Scripts\python.exe"

if (Test-Path $backendVenvPython) {
  $python = $backendVenvPython
} elseif (Test-Path $rootVenvPython) {
  $python = $rootVenvPython
} else {
  $python = "python"
}

Write-Host "Starting Seed IQ backend and frontend..."
Write-Host "Backend:  http://127.0.0.1:8000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Login:    admin / admin123"
Write-Host ""
Write-Host "Press Ctrl+C in this terminal to stop both services."

$backendJob = Start-Job -Name "seed-iq-backend" -ScriptBlock {
  param($backendPath, $pythonPath)
  Set-Location $backendPath
  & $pythonPath -m uvicorn app.main:app --reload --port 8000 --app-dir $backendPath
} -ArgumentList $backend, $python

$frontendJob = Start-Job -Name "seed-iq-frontend" -ScriptBlock {
  param($frontendPath)
  Set-Location $frontendPath
  npm run dev -- --host 127.0.0.1
} -ArgumentList $frontend

try {
  while ($true) {
    Receive-Job $backendJob, $frontendJob
    Start-Sleep -Seconds 1
  }
} finally {
  Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
  Remove-Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
}
