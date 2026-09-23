# superapp_mobile/scripts/build-sandbox.ps1
# Automates compiling Flutter Web and syncing to the Backoffice superapp-sandbox directory

$ErrorActionPreference = "Stop"

$MobileAppDir = Resolve-Path "$PSScriptRoot/.."
$ProjectRoot = Resolve-Path "$MobileAppDir/.."

$BackofficeDir = "$ProjectRoot/superapp_backoffice"
if (-not (Test-Path $BackofficeDir)) {
    $BackofficeDir = "$ProjectRoot/dps_webapp_backoffice"
}

$SandboxDestDir = "$BackofficeDir/public/superapp-sandbox"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "[BUILD] Compiling Flutter Web Super App Sandbox" -ForegroundColor Cyan
Write-Host " Mobile App Dir : $MobileAppDir" -ForegroundColor Gray
Write-Host "=========================================" -ForegroundColor Cyan

Set-Location $MobileAppDir
Write-Host "Running: flutter build web --base-href /superapp-sandbox/" -ForegroundColor Yellow
flutter build web --base-href /superapp-sandbox/

if ($LASTEXITCODE -ne 0) {
    Write-Error "Flutter web build failed!"
    exit 1
}

if (Test-Path $BackofficeDir) {
    Write-Host "Syncing build artifacts to $SandboxDestDir..." -ForegroundColor Yellow
    if (-not (Test-Path $SandboxDestDir)) {
        New-Item -ItemType Directory -Path $SandboxDestDir -Force | Out-Null
    }
    Copy-Item -Path "$MobileAppDir/build/web/*" -Destination $SandboxDestDir -Recurse -Force
    Write-Host "[SUCCESS] Flutter Web Super App Sandbox compiled and synced to Backoffice successfully!" -ForegroundColor Green
} else {
    Write-Host "[SUCCESS] Flutter Web build completed at $MobileAppDir/build/web" -ForegroundColor Green
}
