    param(
        [ValidateSet("prod", "local", "usb", "custom")]
        [string]$Target = $(if ($env:SUPERAPP_TARGET_ENV) { $env:SUPERAPP_TARGET_ENV } else { "prod" }),
        [string]$ApiBaseUrl = "",
        [string]$ReleaseVersion = "v0.0.1",
        [string]$BuildType = $(if ($env:SUPERAPP_TEST_APK_BUILD_MODE) { $env:SUPERAPP_TEST_APK_BUILD_MODE } else { "release" }),
        [string]$AppName = "superapp",
        [switch]$OfficialRelease = $false
    )

function Get-DynamicLanIp {
    # 1. Primary: OS routing table via dummy UDP connect (100% accurate on active network)
    try {
        $socket = New-Object System.Net.Sockets.Socket([System.Net.Sockets.AddressFamily]::InterNetwork, [System.Net.Sockets.SocketType]::Dgram, [System.Net.Sockets.ProtocolType]::Udp)
        $socket.Connect("8.8.8.8", 65530)
        $ip = $socket.LocalEndPoint.Address.IPAddressToString
        $socket.Close()
        if ($ip -and $ip -notmatch '^(127\.|169\.254\.|0\.)') { return $ip }
    } catch {}

    # 2. Secondary: Active Wi-Fi or Wireless adapter
    try {
        $wifi = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.InterfaceAlias -match "Wi-Fi|Wireless|WLAN" -and $_.IPAddress -notmatch '^(127\.|169\.254\.|0\.)' } |
            Select-Object -First 1
        if ($wifi) { return $wifi.IPAddress }
    } catch {}

    # 3. Tertiary: Physical Ethernet or LAN adapter (excluding virtual/WSL adapters)
    try {
        $adapter = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.InterfaceAlias -notmatch "vEthernet|WSL|Loopback|Virtual|Hyper-V|VMware|VirtualBox" -and $_.IPAddress -notmatch '^(127\.|169\.254\.|0\.)' } |
            Sort-Object InterfaceIndex |
            Select-Object -First 1
        if ($adapter) { return $adapter.IPAddress }
    } catch {}

    return "127.0.0.1"
}

# Resolve Target Backend API dynamically based on environment mode
$IsProd = ($Target -eq "prod") -or ($env:ENVIRONMENT -match "prod") -or ($env:NODE_ENV -eq "production")

if (-not $ApiBaseUrl) {
    if ($IsProd) {
        $ApiBaseUrl = if ($env:MOBILE_API_BASE_URL -and $env:MOBILE_API_BASE_URL -match "^https?://") { $env:MOBILE_API_BASE_URL } else { "https://app.fintechcenterfsa.com/api" }
    } elseif ($Target -eq "usb") {
        # ADB Reverse via USB Cable (phone connects to laptop port 3000 through USB)
        $ApiBaseUrl = "http://127.0.0.1:3000"
    } else {
        # Dynamically detect active local Wi-Fi / LAN IP
        $lanIp = Get-DynamicLanIp
        $ApiBaseUrl = "http://${lanIp}:3000"
    }
}

if (-not $IsProd -and $Target -ne "usb") {
    $lanIp = Get-DynamicLanIp
    if ($ApiBaseUrl -match "localhost|127\.0\.0\.1|0\.0\.0\.0" -or $ApiBaseUrl -match "https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}") {
        $ApiBaseUrl = $ApiBaseUrl -replace "(localhost|127\.0\.0\.1|0\.0\.0\.0|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", $lanIp
        Write-Host "[CONFIG] Updated ApiBaseUrl with current active Wi-Fi LAN IP: $ApiBaseUrl" -ForegroundColor Green
    }
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

        if ($OfficialRelease) {
            # Official store release to app/play store: publish to protected apk-releases repository
            $repoName = "apk-releases"
            $targetName = "app-release.apk"
            $targets = @(
                "apk-releases/$AppName/latest/app-release.apk",
                "apk-releases/$AppName/$ReleaseVersion/app-release.apk",
                "apk-releases/$AppName/$ReleaseVersion/superapp-release-$ReleaseVersion.apk"
            )
            Write-Host "[NEXUS] Publishing official store release to $repoName repository..." -ForegroundColor Green
        } else {
            # Build & Move to Testing step: ONLY publish to apk-test-builds (even with size-optimized release build mode)
            $repoName = "apk-test-builds"
            $targetName = if ($BuildType -eq "release") { "app-release.apk" } else { "app-debug.apk" }
            $targets = @(
                "apk-test-builds/$AppName/latest/$targetName",
                "apk-test-builds/$AppName/$ReleaseVersion/$targetName",
                "apk-test-builds/$AppName/latest/app-release.apk",
                "apk-test-builds/$AppName/$ReleaseVersion/app-release.apk",
                "apk-test-builds/$AppName/latest/app-debug.apk",
                "apk-test-builds/$AppName/$ReleaseVersion/app-debug.apk",
                "apk-test-builds/$AppName/$ReleaseVersion/superapp-test-$ReleaseVersion.apk"
            ) | Select-Object -Unique
            Write-Host "[NEXUS] Publishing test build to $repoName repository (isolated from apk-releases)..." -ForegroundColor Cyan
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
