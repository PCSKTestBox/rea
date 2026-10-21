# Passive read-only REA capture for the selected PokéBonk browser target.
# Usage: powershell -ExecutionPolicy Bypass -File .\Capture-PokeBonkREA.ps1 -TargetId 'TARGET_ID'
# Captured script sources may be copyrighted. Never commit the generated files.
param(
  [Parameter(Mandatory=$true)][string]$TargetId,
  [int]$Port = 9222
)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command rea -ErrorAction SilentlyContinue)) { throw 'REA CLI not installed.' }
$endpoint = "http://127.0.0.1:$Port"
$root = Join-Path $HOME 'PCSKTestBox\pokebonk-rea'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$folder = Join-Path $root ("captures\" + $timestamp)
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function Save-ReaJson {
  param([string[]]$Arguments, [string]$Destination)
  Write-Host ('rea ' + ($Arguments -join ' '))
  $lines = & rea @Arguments
  if ($LASTEXITCODE -ne 0) { throw "REA exited with code $LASTEXITCODE; capture stopped." }
  [System.IO.File]::WriteAllText($Destination, ($lines -join [Environment]::NewLine), $utf8NoBom)
  Write-Host "Saved $Destination"
}

Save-ReaJson -Arguments @(
  'inspect-web-page',$endpoint,$TargetId,'--observation-ms','2500',
  '--include-script-sources','--include-json-body-shapes',
  '--include-websocket-shapes','--json'
) -Destination (Join-Path $folder 'page-evidence.json')

Save-ReaJson -Arguments @('analyze-web-bundle',$endpoint,$TargetId,'--json') -Destination (Join-Path $folder 'bundle-analysis.json')

$export = Join-Path $folder 'exported-scripts'
Save-ReaJson -Arguments @('export-web-scripts',(Join-Path $folder 'page-evidence.json'),$export,'--json') -Destination (Join-Path $folder 'script-export.json')

$files = Join-Path $export 'files'
if (Test-Path $files) {
  Save-ReaJson -Arguments @('analyze-javascript-application',$files,'--json') -Destination (Join-Path $folder 'javascript-analysis.json')
} else {
  Write-Warning 'No script files available for offline JS analysis. Inspect coverage and export results.'
}
Write-Host "Completed. Evidence stored only on this computer at: $folder"
Write-Host 'Review and redact any evidence before sharing; do not upload it to the public repo.'