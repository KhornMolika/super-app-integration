# dps_mobile_app/scripts/publish-test-apk.ps1
# Builds the Flutter Mobile App APK and publishes it to Sonatype Nexus & Jenkins test build volume.

param(
    [string]$Version = "v0.0.1",
    [string]$AppName = "superapp",
    [string]$RepoName = "apk-test-builds",
    [string]$NexusUrl = (if ($env:NEXUS_BASE_URL) { $env:NEXUS_BASE_URL } elseif ($env:NEXUS_URL) { $env:NEXUS_URL } else { "http://localhost:8081" }),
    [string]$NexusUser = (if ($env:NEXUS_ADMIN_USER) { $env:NEXUS_ADMIN_USER } elseif ($env:NEXUS_USER) { $env:NEXUS_USER } else { "admin" }),
    [string]$NexusPassword = (if ($env:NEXUS_ADMIN_PASSWORD) { $env:NEXUS_ADMIN_PASSWORD } elseif ($env:NEXUS_PASSWORD) { $env:NEXUS_PASSWORD } else { "" }),
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$MobileAppDir = Resolve-Path "$PSScriptRoot/.."
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
Write-Host "`n🔄 Syncing APK into Jenkins container..." -ForegroundColor Yellow
try {
    & docker cp "$ApkPath" "jenkins-controller:/var/reports/app-debug.apk" 2>$null
    Write-Host "✅ Jenkins container /var/reports/app-debug.apk updated!" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ (Optional) Jenkins container not running or docker cp skipped." -ForegroundColor Gray
}

Write-Host "`n🎉 All done! You can now download the latest APK from the Backoffice portal or Nexus directly." -ForegroundColor Cyan
