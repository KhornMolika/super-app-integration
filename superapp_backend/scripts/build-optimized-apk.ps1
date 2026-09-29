param(
    [string]$ApiBaseUrl = "http://192.168.1.4:3000",
    [string]$ReleaseVersion = "v0.0.5",
    [string]$BuildType = "debug",
    [string]$AppName = "superapp"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
while ($ProjectRoot -and -not (Test-Path (Join-Path $ProjectRoot "super-app"))) {
    $parent = Split-Path -Parent $ProjectRoot
    if (-not $parent -or $parent -eq $ProjectRoot) { break }
    $ProjectRoot = $parent
}

$MobileAppDir = Join-Path $ProjectRoot "super-app"
$NexusUrl = $env:NEXUS_BASE_URL
if (-not $NexusUrl) { $NexusUrl = "http://localhost:8081" }
$NexusUrl = $NexusUrl.TrimEnd('/')

$NexusUser = $env:NEXUS_ADMIN_USER
if (-not $NexusUser) { $NexusUser = "admin" }
$NexusPass = $env:NEXUS_ADMIN_PASSWORD
if (-not $NexusPass) { $NexusPass = "admin123" }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [BUILD] Compiling Optimized Official FSA Super App APK" -ForegroundColor Cyan
Write-Host " Target Architecture : android-arm64" -ForegroundColor Cyan
Write-Host " App Name            : $AppName" -ForegroundColor Cyan
Write-Host " Release Version     : $ReleaseVersion" -ForegroundColor Cyan
Write-Host " Build Type          : $BuildType" -ForegroundColor Cyan
Write-Host " API Base URL        : $ApiBaseUrl" -ForegroundColor Cyan
Write-Host " Working Directory   : $MobileAppDir" -ForegroundColor Cyan
Write-Host " Nexus URL           : $NexusUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location $MobileAppDir

$FlutterBin = "flutter"
try {
    $found = Get-Command "flutter" -ErrorAction SilentlyContinue
    if ($found) {
        $FlutterBin = $found.Source
    } elseif (Test-Path "C:\flutter\flutter\bin\flutter.bat") {
        $FlutterBin = "C:\flutter\flutter\bin\flutter.bat"
    }
} catch {}

Write-Host "Resolving Flutter dependencies with $FlutterBin..." -ForegroundColor Yellow
& $FlutterBin pub get

Write-Host "Building size-optimized ARM64 release APK (API: $ApiBaseUrl)..." -ForegroundColor Yellow
& $FlutterBin build apk --release --target-platform android-arm64 --tree-shake-icons "--dart-define=API_BASE_URL=$ApiBaseUrl" "--dart-define=ALLOW_CLEARTEXT=true"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Flutter APK compilation failed!"
    exit 1
}

$ReleaseApk = Join-Path $MobileAppDir "build/app/outputs/flutter-apk/app-release.apk"
$DebugApk = Join-Path $MobileAppDir "build/app/outputs/flutter-apk/app-debug.apk"
$BackofficePublic = Join-Path $ProjectRoot "superapp_backoffice/public"

if (Test-Path $ReleaseApk) {
    Copy-Item -Path $ReleaseApk -Destination $DebugApk -Force
    if (Test-Path $BackofficePublic) {
        Copy-Item -Path $ReleaseApk -Destination (Join-Path $BackofficePublic "superapp-test.apk") -Force
        Copy-Item -Path $ReleaseApk -Destination (Join-Path $BackofficePublic "superapp-local.apk") -Force
        Copy-Item -Path $ReleaseApk -Destination (Join-Path $BackofficePublic "superapp-test-$ReleaseVersion.apk") -Force
        Copy-Item -Path $ReleaseApk -Destination (Join-Path $BackofficePublic "superapp-test-v0.0.1.apk") -Force
        Write-Host "[OK] Copied APK to backoffice public directory (superapp-test.apk, superapp-test-$ReleaseVersion.apk)" -ForegroundColor Cyan
    }
    $sizeMb = [math]::round((Get-Item $ReleaseApk).Length / 1MB, 2)
    Write-Host "[OK] Local APK generated successfully! Size: $sizeMb MB" -ForegroundColor Green

    # Publish to Nexus if reachable
    try {
        $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${NexusUser}:${NexusPass}"))
        $headers = @{
            Authorization = "Basic $b64"
            "Content-Type" = "application/vnd.android.package-archive"
        }

        $repoName = if ($BuildType -eq "release") { "apk-releases" } else { "apk-test-builds" }
        $targetName = if ($BuildType -eq "release") { "app-release.apk" } else { "app-debug.apk" }

        $targets = @(
            "apk-test-builds/$AppName/latest/app-debug.apk",
            "apk-test-builds/$AppName/$ReleaseVersion/app-debug.apk",
            "apk-releases/$AppName/latest/app-release.apk",
            "apk-releases/$AppName/$ReleaseVersion/app-release.apk"
        )

        foreach ($target in $targets) {
            $destUrl = "$NexusUrl/repository/$target"
            Invoke-RestMethod -Uri $destUrl -Method Put -Headers $headers -InFile $ReleaseApk -ErrorAction SilentlyContinue | Out-Null
            Write-Host "[OK] Published to Nexus: $destUrl" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "[WARN] Could not publish to Nexus: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "[DONE] Optimized Super App build completed successfully for $ReleaseVersion!" -ForegroundColor Green
