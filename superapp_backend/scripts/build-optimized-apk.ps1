param(
    [ValidateSet("prod", "local", "usb", "custom")]
    [string]$Target = $(if ($env:SUPERAPP_TARGET_ENV) { $env:SUPERAPP_TARGET_ENV } else { "prod" }),
    [string]$ApiBaseUrl = "",
    [string]$ReleaseVersion = "v0.0.1",
    [string]$BuildType = $(if ($env:SUPERAPP_TEST_APK_BUILD_MODE) { $env:SUPERAPP_TEST_APK_BUILD_MODE } else { "release" }),
    [string]$AppName = "superapp"
)

# Resolve Target Backend API dynamically
if (-not $ApiBaseUrl) {
    if ($env:MOBILE_API_BASE_URL) {
        $ApiBaseUrl = $env:MOBILE_API_BASE_URL
    } elseif ($Target -eq "usb") {
        # ADB Reverse via USB Cable (phone connects to laptop port 3000 through USB)
        $ApiBaseUrl = "http://127.0.0.1:3000"
    } elseif ($Target -eq "local") {
        # Auto-detect real local Wi-Fi LAN IP or fallback to 192.168.10.35
        try {
            $wifi = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                Where-Object { $_.InterfaceAlias -match "Wi-Fi|Wireless|WLAN" -and $_.IPAddress -notmatch "^169\.254\." } |
                Select-Object -First 1
            if ($wifi) {
                $lanIp = $wifi.IPAddress
            } else {
                $lanIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                    Where-Object { $_.InterfaceAlias -notmatch "vEthernet|WSL|Loopback|Virtual|Hyper-V|VMware|VirtualBox|Ethernet" -and ($_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*") } |
                    Select-Object -First 1).IPAddress
            }
        } catch {}
        if (-not $lanIp) { $lanIp = "192.168.10.35" }
        $ApiBaseUrl = "http://${lanIp}:3000"
    } else {
        # Default to Production Cloud endpoint
        $ApiBaseUrl = "https://app.fintechcenterfsa.com/api"
    }
}

if ($ApiBaseUrl -match "localhost|127\.0\.0\.1") {
    $lanIp = "192.168.10.35"
    $ApiBaseUrl = $ApiBaseUrl -replace "localhost|127\.0\.0\.1", $lanIp
    Write-Host "[CONFIG] Replaced localhost in ApiBaseUrl with LAN IP: $ApiBaseUrl" -ForegroundColor Yellow
}

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
Write-Host " [BUILD] Compiling Size-Optimized FSA Super App APK" -ForegroundColor Cyan
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
    Write-Host "Building size-optimized ARM64 release APK (AOT + Tree-Shaking, API: $ApiBaseUrl)..." -ForegroundColor Yellow
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
    # Keep only 1 active superapp-test.apk cache in public/ to prevent multi-gigabyte accumulation
    if (Test-Path $BackofficePublic) {
        Copy-Item -Path $OutputApk -Destination (Join-Path $BackofficePublic "superapp-test.apk") -Force
        Write-Host "[OK] Updated active superapp-test.apk in backoffice public directory." -ForegroundColor Cyan
    }
    $sizeMb = [math]::round((Get-Item $OutputApk).Length / 1MB, 2)
    Write-Host "[OK] $BuildType APK generated successfully! Size: $sizeMb MB" -ForegroundColor Green

    # Publish to Nexus as Single Source of Truth for all versions
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
                "apk-releases/$AppName/$ReleaseVersion/app-release.apk",
                "apk-test-builds/$AppName/latest/app-release.apk",
                "apk-test-builds/$AppName/$ReleaseVersion/app-release.apk",
                "apk-test-builds/$AppName/latest/app-debug.apk",
                "apk-test-builds/$AppName/$ReleaseVersion/app-debug.apk"
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
        foreach ($destTarget in $targets) {
            $destUrl = "$NexusUrl/repository/$destTarget"
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
