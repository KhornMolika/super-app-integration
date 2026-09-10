# scripts/build-sandbox.ps1
# Automates compiling Flutter Web and syncing to the Backoffice superapp-sandbox directory

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path "$PSScriptRoot/.."
$MobileAppDir = "$ProjectRoot/dps_mobile_app"
$SandboxDestDir = "$ProjectRoot/dps_webapp_backoffice/public/superapp-sandbox"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🚀 Compiling Flutter Web Super App Sandbox" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Set-Location $MobileAppDir
Write-Host "Running: flutter build web --base-href /superapp-sandbox/" -ForegroundColor Yellow
flutter build web --base-href /superapp-sandbox/

if ($LASTEXITCODE -ne 0) {
    Write-Error "Flutter web build failed!"
    exit 1
}

Write-Host "Syncing build artifacts to $SandboxDestDir..." -ForegroundColor Yellow
if (-not (Test-Path $SandboxDestDir)) {
    New-Item -ItemType Directory -Path $SandboxDestDir -Force | Out-Null
}

Copy-Item -Path "$MobileAppDir/build/web/*" -Destination $SandboxDestDir -Recurse -Force

Write-Host "✅ Flutter Web Super App Sandbox compiled and synced successfully!" -ForegroundColor Green
