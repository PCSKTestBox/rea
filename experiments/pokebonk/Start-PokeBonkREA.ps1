# Start a dedicated Chrome instance for passive PokéBonk analysis.
# Run on YOUR Windows PC, not in GitHub Actions.
param([int]$Port = 9222)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Install a supported Node.js runtime first (recommend 24.11+ LTS).'
}
if (-not (Get-Command rea -ErrorAction SilentlyContinue)) {
  throw 'Install the official CLI first: npm install --global rea-agents'
}
$nodeText = (& node --version).Trim().TrimStart('v')
$nodeVersion = [version]($nodeText -replace '-.*$', '')
$supported = (($nodeVersion.Major -eq 22 -and $nodeVersion -ge [version]'22.19.0') -or
              ($nodeVersion.Major -eq 24 -and $nodeVersion -ge [version]'24.11.0') -or
              ($nodeVersion.Major -ge 26))
if (-not $supported) { throw "Unsupported Node.js version: $nodeText" }

$chromePaths = @()
if ($env:ProgramFiles) { $chromePaths += (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe') }
$pf86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
if ($pf86) { $chromePaths += (Join-Path $pf86 'Google\Chrome\Application\chrome.exe') }
if ($env:LOCALAPPDATA) { $chromePaths += (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe') }
$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw 'Chrome not found. Install Chrome or edit the candidate executable paths.' }

$work = Join-Path $HOME 'PCSKTestBox\pokebonk-rea'
$profile = Join-Path $work 'chrome-profile'
New-Item -ItemType Directory -Path $profile -Force | Out-Null
$endpoint = "http://127.0.0.1:$Port"
Write-Host 'Starting a separate, logged-out Chrome profile (no automation).'
$chromeArgs = @(
  '--remote-debugging-address=127.0.0.1',
  "--remote-debugging-port=$Port",
  ('--user-data-dir="' + $profile + '"'),
  'https://pokebonk.com/'
)
Start-Process -FilePath $chrome -ArgumentList $chromeArgs
Start-Sleep -Seconds 3
try {
  Invoke-WebRequest -Uri "$endpoint/json/version" -UseBasicParsing -TimeoutSec 10 | Out-Null
} catch {
  throw "CDP not available on $endpoint. Check that the port is free and Chrome started with this profile."
}
Write-Host "Connected to $endpoint. Find the PokéBonk page's target ID:"
& rea --version
& rea list-browser-targets $endpoint --json
Write-Host "Captures must stay outside GitHub: $work"
Write-Host 'Close this Chrome profile when finished and never expose the CDP port.'