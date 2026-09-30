param(
    [string]$ApiBaseUrl = $(if ($env:MOBILE_API_BASE_URL) { $env:MOBILE_API_BASE_URL } else { "http://localhost:3000" }),
    [string]$ReleaseVersion = "v0.0.1",
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

$NexusUser = if ($env:NEXUS_ADMIN_USER) { $env:NEXUS_ADMIN_USER } else { "admin" }
$NexusPass = if ($env:NEXUS_ADMIN_PASSWORD) { $env:NEXUS_ADMIN_PASSWORD } elseif ($env:NEXUS_PASSWORD) { $env:NEXUS_PASSWORD } else { "admin123" }

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

if ($BuildType -eq "release") {
    Write-Host "Building size-optimized ARM64 release APK (API: $ApiBaseUrl)..." -ForegroundColor Yellow
    & $FlutterBin build apk --release --target-platform android-arm64 --tree-shake-icons "--dart-define=API_BASE_URL=$ApiBaseUrl" "--dart-define=ALLOW_CLEARTEXT=true"
    $OutputApk = Join-Path $MobileAppDir "build/app/outputs/flutter-apk/app-release.apk"
} else {
    Write-Host "Building ARM64 debug test APK for internal QA & testing (API: $ApiBaseUrl)..." -ForegroundColor Yellow
    & $FlutterBin build apk --debug --target-platform android-arm64 "--dart-define=API_BASE_URL=$ApiBaseUrl" "--dart-define=ALLOW_CLEARTEXT=true"
    $OutputApk = Join-Path $MobileAppDir "build/app/outputs/flutter-apk/app-debug.apk"
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Flutter APK compilation failed!"
    exit 1
}

$BackofficePublic = Join-Path $ProjectRoot "superapp_backoffice/public"

if (Test-Path $OutputApk) {
    if (Test-Path $BackofficePublic) {
        if ($BuildType -eq "release") {
            Copy-Item -Path $OutputApk -Destination (Join-Path $BackofficePublic "superapp-release.apk") -Force
            Copy-Item -Path $OutputApk -Destination (Join-Path $BackofficePublic "superapp-release-$ReleaseVersion.apk") -Force
            Write-Host "[OK] Copied release APK to backoffice public directory (superapp-release.apk)" -ForegroundColor Cyan
        } else {
            Copy-Item -Path $OutputApk -Destination (Join-Path $BackofficePublic "superapp-test.apk") -Force
            Copy-Item -Path $OutputApk -Destination (Join-Path $BackofficePublic "superapp-debug.apk") -Force
            Copy-Item -Path $OutputApk -Destination (Join-Path $BackofficePublic "superapp-local.apk") -Force
            Copy-Item -Path $OutputApk -Destination (Join-Path $BackofficePublic "superapp-test-$ReleaseVersion.apk") -Force
            Copy-Item -Path $OutputApk -Destination (Join-Path $BackofficePublic "superapp-debug-$ReleaseVersion.apk") -Force
            Write-Host "[OK] Copied debug test APK to backoffice public directory (superapp-test.apk, superapp-debug.apk)" -ForegroundColor Cyan
        }
    }
    $sizeMb = [math]::round((Get-Item $OutputApk).Length / 1MB, 2)
    Write-Host "[OK] Local $BuildType APK generated successfully! Size: $sizeMb MB" -ForegroundColor Green

    # Publish to Nexus if reachable
    try {
        $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${NexusUser}:${NexusPass}"))
        $headers = @{
            Authorization = "Basic $b64"
            "Content-Type" = "application/vnd.android.package-archive"
        }

        if ($BuildType -eq "release") {
            $repoName = "apk-releases"
            $targetName = "app-release.apk"
            $targets = @(
                "apk-releases/$AppName/latest/app-release.apk",
                "apk-releases/$AppName/$ReleaseVersion/app-release.apk"
            )
        } else {
            $repoName = "apk-test-builds"
            $targetName = "app-debug.apk"
            $targets = @(
                "apk-test-builds/$AppName/latest/app-debug.apk",
                "apk-test-builds/$AppName/$ReleaseVersion/app-debug.apk"
            )
        }

        $curlCmd = Get-Command "curl.exe" -ErrorAction SilentlyContinue
        foreach ($target in $targets) {
            $destUrl = "$NexusUrl/repository/$target"
            if ($curlCmd) {
                Write-Host "Streaming $targetName to Nexus with native curl: $destUrl..." -ForegroundColor Cyan
                if ($NexusPass) {
                    & $curlCmd.Source -s -S -f -u "${NexusUser}:${NexusPass}" --upload-file "$OutputApk" "$destUrl"
                } else {
                    & $curlCmd.Source -s -S -f --upload-file "$OutputApk" "$destUrl"
                }
            } else {
                Invoke-RestMethod -Uri $destUrl -Method Put -Headers $headers -InFile $OutputApk -ErrorAction SilentlyContinue | Out-Null
            }
            Write-Host "[OK] Published ($targetName) to Nexus: $destUrl" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "[WARN] Could not publish to Nexus: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "[DONE] Optimized Super App build completed successfully for $ReleaseVersion!" -ForegroundColor Green
