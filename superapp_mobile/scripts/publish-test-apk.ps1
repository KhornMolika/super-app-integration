# superapp_mobile/scripts/publish-test-apk.ps1
# Builds the Flutter Mobile App APK and publishes it to Sonatype Nexus & Jenkins test build volume.

param(
    [string]$Version = "",
    [string]$AppName = "superapp",
    [string]$RepoName = "apk-test-builds",
    [string]$NexusUrl = "",
    [string]$NexusUser = "",
    [string]$NexusPassword = "",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$MobileAppDir = Resolve-Path "$PSScriptRoot/.."
$ApkPath = "$MobileAppDir/build/app/outputs/flutter-apk/app-debug.apk"

# Dynamically resolve Version from pubspec.yaml, Git, or environment if not passed
if (-not $Version) {
    if ($env:SUPERAPP_VERSION) {
        $Version = $env:SUPERAPP_VERSION
    } elseif (Test-Path "$MobileAppDir/pubspec.yaml") {
        $pubspecContent = Get-Content "$MobileAppDir/pubspec.yaml" -Raw
        if ($pubspecContent -match 'version:\s*([^\s+]+)') {
            $Version = "v$($matches[1])"
        }
    }
    if (-not $Version) { $Version = "v1.0.0" }
}
if (-not $NexusUrl) {
    if ($env:NEXUS_BASE_URL) { $NexusUrl = $env:NEXUS_BASE_URL }
    elseif ($env:NEXT_PUBLIC_NEXUS_URL) { $NexusUrl = $env:NEXT_PUBLIC_NEXUS_URL }
    elseif ($env:NEXUS_URL) { $NexusUrl = $env:NEXUS_URL }
    else { $NexusUrl = "http://localhost:8081" }
}
$NexusUrl = $NexusUrl.TrimEnd('/')

if (-not $NexusUser) {
    if ($env:NEXUS_ADMIN_USER) { $NexusUser = $env:NEXUS_ADMIN_USER }
    elseif ($env:NEXUS_USER) { $NexusUser = $env:NEXUS_USER }
    else { $NexusUser = "admin" }
}
if (-not $NexusPassword) {
    if ($env:NEXUS_ADMIN_PASSWORD) { $NexusPassword = $env:NEXUS_ADMIN_PASSWORD }
    elseif ($env:NEXUS_PASSWORD) { $NexusPassword = $env:NEXUS_PASSWORD }
    else { $NexusPassword = "admin123" }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ">> Super App APK Build & Nexus Publisher" -ForegroundColor Cyan
Write-Host " App Name    : $AppName" -ForegroundColor Gray
Write-Host " Version     : $Version" -ForegroundColor Gray
Write-Host " Repository  : $RepoName" -ForegroundColor Gray
Write-Host " Nexus URL   : $NexusUrl" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan

if (-not $SkipBuild) {
    Write-Host "`n[BUILD] Compiling Flutter Debug APK..." -ForegroundColor Yellow
    Push-Location $MobileAppDir
    try {
        flutter build apk --debug
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $ApkPath)) {
    Write-Error "[ERROR] APK file not found at $ApkPath. Please run build first."
    exit 1
}

$ApkItem = Get-Item $ApkPath
Write-Host "`n[OK] Found APK: $($ApkItem.FullName) ($([math]::Round($ApkItem.Length / 1MB, 2)) MB)" -ForegroundColor Green

# 1. Publish directly to Sonatype Nexus
$UploadUrl = "$NexusUrl/repository/$RepoName/$AppName/$Version/app-debug.apk"
$LatestUrl = "$NexusUrl/repository/$RepoName/$AppName/latest/app-debug.apk"
Write-Host "`n[UPLOAD] Uploading APK to Nexus: $UploadUrl..." -ForegroundColor Yellow

try {
    & curl.exe -s -f -u "${NexusUser}:${NexusPassword}" --upload-file "$ApkPath" "$UploadUrl"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Successfully published $AppName ($Version) to Nexus ($RepoName)!" -ForegroundColor Green
    } else {
        Write-Error "Failed to upload APK to Nexus."
    }

    # Also update dynamic 'latest' pointer on Nexus
    Write-Host "[UPLOAD] Updating dynamic 'latest' package pointer on Nexus: $LatestUrl..." -ForegroundColor Yellow
    & curl.exe -s -f -u "${NexusUser}:${NexusPassword}" --upload-file "$ApkPath" "$LatestUrl"
} catch {
    Write-Error "Upload error: $_"
}

# 2. Sync to Jenkins container so subsequent Jenkins jobs use the fresh binary
Write-Host "`n[SYNC] Syncing APK into Jenkins container..." -ForegroundColor Yellow
try {
    $jenkinsContainer = if ((docker ps --format "{{.Names}}") -match "superapp-jenkins-controller") { "superapp-jenkins-controller" } else { "jenkins-controller" }
    & docker cp "$ApkPath" "${jenkinsContainer}:/var/reports/app-debug.apk" 2>$null
    Write-Host "[OK] Jenkins container ($jenkinsContainer) /var/reports/app-debug.apk updated!" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Jenkins container not running or docker cp skipped." -ForegroundColor Gray
}

Write-Host "`n[DONE] All done! You can now download the latest APK from the Backoffice portal or Nexus directly." -ForegroundColor Cyan
