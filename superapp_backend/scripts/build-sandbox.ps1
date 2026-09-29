# scripts/build-sandbox.ps1
# Automates compiling Flutter Web and syncing to the Backoffice superapp-sandbox directory

$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
while ($ProjectRoot -and -not (Test-Path (Join-Path $ProjectRoot "super-app"))) {
    $parent = Split-Path -Parent $ProjectRoot
    if (-not $parent -or $parent -eq $ProjectRoot) { break }
    $ProjectRoot = $parent
}

$MobileAppDir = $env:MOBILE_APP_DIR
if ($MobileAppDir -and (Test-Path $MobileAppDir)) {
    $MobileAppDir = (Resolve-Path $MobileAppDir).Path
} elseif (Test-Path (Join-Path $ProjectRoot "super-app")) {
    $MobileAppDir = Join-Path $ProjectRoot "super-app"
} else {
    $MobileAppDir = Join-Path $ProjectRoot "super-app"
}

$BackofficeDir = Join-Path $ProjectRoot "superapp_backoffice"
if (-not (Test-Path $BackofficeDir)) {
    $BackofficeDir = Join-Path $ProjectRoot "dps_webapp_backoffice"
}

$SandboxDestDir = Join-Path $BackofficeDir "public/superapp-sandbox"

$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')

$FlutterBin = "flutter"
try {
    $found = Get-Command "flutter" -ErrorAction SilentlyContinue
    if ($found) {
        $FlutterBin = $found.Source
    }
} catch {}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "[BUILD] Compiling Flutter Web Super App Sandbox" -ForegroundColor Cyan
Write-Host " Flutter Executable : $FlutterBin" -ForegroundColor Cyan
Write-Host " Working Directory  : $MobileAppDir" -ForegroundColor Cyan
if ($env:GIT_SSH_COMMAND) {
    Write-Host " Git SSH Command    : Configured (Deploy Keys Active)" -ForegroundColor Cyan
}
Write-Host "=========================================" -ForegroundColor Cyan

Set-Location $MobileAppDir
Write-Host "Resolving Flutter dependencies..." -ForegroundColor Yellow
& $FlutterBin pub get
if ($LASTEXITCODE -ne 0) {
    Write-Error "Flutter dependencies resolution failed (exit code: $LASTEXITCODE)!"
    exit 1
}

Write-Host "Running: flutter build web --base-href /superapp-sandbox/ --release --no-tree-shake-icons" -ForegroundColor Yellow
& $FlutterBin build web --base-href /superapp-sandbox/ --release --no-tree-shake-icons

if ($LASTEXITCODE -ne 0) {
    Write-Error "Flutter web build failed!"
    exit 1
}

Write-Host "Syncing build artifacts to $SandboxDestDir..." -ForegroundColor Yellow
if (-not (Test-Path $SandboxDestDir)) {
    New-Item -ItemType Directory -Path $SandboxDestDir -Force | Out-Null
}
Copy-Item -Path "$MobileAppDir/build/web/*" -Destination $SandboxDestDir -Recurse -Force

Write-Host "[SUCCESS] Flutter Web Super App Sandbox compiled and synced successfully!" -ForegroundColor Green
