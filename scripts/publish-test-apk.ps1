# scripts/publish-test-apk.ps1
# Builds the Flutter Mobile App APK and publishes it to Sonatype Nexus & Jenkins test build volume.

param(
    [string]$Version = "v0.0.1",
    [string]$AppName = "superapp",
    [string]$RepoName = "apk-test-builds",
    [string]$NexusUrl = "http://localhost:8081",
    [string]$NexusUser = "admin",
    [string]$NexusPassword = "admin123",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path "$PSScriptRoot/.."
$MobileAppDir = "$ProjectRoot/dps_mobile_app"
$ApkPath = "$MobileAppDir/build/app/outputs/flutter-apk/app-debug.apk"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Super App APK Build & Nexus Publisher" -ForegroundColor Cyan
Write-Host " App Name    : $AppName" -ForegroundColor Gray
Write-Host " Version     : $Version" -ForegroundColor Gray
Write-Host " Repository  : $RepoName" -ForegroundColor Gray
Write-Host " Nexus URL   : $NexusUrl" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan

if (-not $SkipBuild) {
    Write-Host "`n📦 Compiling Flutter Debug APK..." -ForegroundColor Yellow
    Push-Location $MobileAppDir
    try {
        flutter build apk --debug
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $ApkPath)) {
    Write-Error "❌ APK file not found at $ApkPath. Please run build first."
    exit 1
}

$ApkItem = Get-Item $ApkPath
Write-Host "`n✓ Found APK: $($ApkItem.FullName) ($([math]::Round($ApkItem.Length / 1MB, 2)) MB)" -ForegroundColor Green

# 1. Publish directly to Sonatype Nexus
$UploadUrl = "$NexusUrl/repository/$RepoName/$AppName/$Version/app-debug.apk"
Write-Host "`n📤 Uploading APK to Nexus: $UploadUrl..." -ForegroundColor Yellow

try {
    & curl.exe -s -f -u "${NexusUser}:${NexusPassword}" --upload-file "$ApkPath" "$UploadUrl"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully published $AppName ($Version) to Nexus ($RepoName)!" -ForegroundColor Green
    } else {
        Write-Error "Failed to upload APK to Nexus."
    }
} catch {
    Write-Error "Upload error: $_"
}

# 2. Sync to Jenkins container so subsequent Jenkins jobs use the fresh binary
Write-Host "`n🔄 Syncing APK into Jenkins container (/var/reports/app-debug.apk)..." -ForegroundColor Yellow
try {
    & docker cp "$ApkPath" "jenkins-controller:/var/reports/app-debug.apk"
    Write-Host "✅ Jenkins container /var/reports/app-debug.apk updated!" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ (Optional) Jenkins container not running or docker cp skipped." -ForegroundColor Gray
}

Write-Host "`n🎉 All done! You can now download the latest APK from the Backoffice portal or Nexus directly." -ForegroundColor Cyan
