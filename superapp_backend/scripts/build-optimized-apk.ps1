param(
    [string]$ApiBaseUrl = "https://app.fintechcenterfsa.com/api"
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
Write-Host " Compilation Mode    : Release (AOT + Tree Shaking)" -ForegroundColor Cyan
Write-Host " API Base URL        : $ApiBaseUrl" -ForegroundColor Cyan
Write-Host " Working Directory   : $MobileAppDir" -ForegroundColor Cyan
Write-Host " Nexus URL           : $NexusUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location $MobileAppDir

$FlutterBin = "flutter"
if (Test-Path "C:\flutter\flutter\bin\flutter.bat") {
    $FlutterBin = "C:\flutter\flutter\bin\flutter.bat"
}

Write-Host "Resolving Flutter dependencies..." -ForegroundColor Yellow
& $FlutterBin pub get

Write-Host "Building size-optimized ARM64 release APK (API: $ApiBaseUrl)..." -ForegroundColor Yellow
& $FlutterBin build apk --release --target-platform android-arm64 --tree-shake-icons "--dart-define=API_BASE_URL=$ApiBaseUrl"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Flutter APK compilation failed!"
    exit 1
}

$ReleaseApk = Join-Path $MobileAppDir "build/app/outputs/flutter-apk/app-release.apk"
$DebugApk = Join-Path $MobileAppDir "build/app/outputs/flutter-apk/app-debug.apk"

if (Test-Path $ReleaseApk) {
    Copy-Item -Path $ReleaseApk -Destination $DebugApk -Force
    $sizeMb = [math]::round((Get-Item $ReleaseApk).Length / 1MB, 2)
    Write-Host "✅ Local APK generated successfully! Size: $sizeMb MB" -ForegroundColor Green

    # Publish to Nexus if reachable
    try {
        $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${NexusUser}:${NexusPass}"))
        $headers = @{
            Authorization = "Basic $b64"
            "Content-Type" = "application/vnd.android.package-archive"
        }

        $targets = @(
            "apk-test-builds/superapp/latest/app-debug.apk",
            "apk-test-builds/superapp/v0.0.1/app-debug.apk",
            "apk-releases/superapp/latest/app-release.apk",
            "apk-releases/superapp/v0.0.1/app-release.apk"
        )

        foreach ($target in $targets) {
            $destUrl = "$NexusUrl/repository/$target"
            Invoke-RestMethod -Uri $destUrl -Method Put -Headers $headers -InFile $ReleaseApk -ErrorAction SilentlyContinue | Out-Null
            Write-Host "🚀 Published to Nexus: $destUrl" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "⚠️ Could not publish to Nexus: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "✨ Optimized Super App build completed successfully!" -ForegroundColor Green
