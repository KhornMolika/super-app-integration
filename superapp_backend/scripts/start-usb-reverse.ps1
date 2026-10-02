<#
.SYNOPSIS
  Enables USB ADB Reverse Port Forwarding for Physical Android Phone Testing.
.DESCRIPTION
  Forwards physical device port 3000 (Backend API) and port 3002 (Backoffice)
  over the USB cable directly to the developer's laptop localhost.
  Works anywhere (cafe, home, airplane mode) with zero Wi-Fi required.
#>

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [USB ADB] Initializing Physical Phone USB Port Forwarding" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Locate ADB binary
$AdbBin = "adb"
$commonAdbPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "$env:ProgramFiles\Android\Sdk\platform-tools\adb.exe",
    "C:\Android\platform-tools\adb.exe",
    "C:\platform-tools\adb.exe"
)

try {
    $found = Get-Command "adb" -ErrorAction SilentlyContinue
    if ($found) {
        $AdbBin = $found.Source
    } else {
        foreach ($p in $commonAdbPaths) {
            if (Test-Path $p) {
                $AdbBin = $p
                break
            }
        }
    }
} catch {}

# Verify ADB exists
try {
    & $AdbBin version | Out-Null
} catch {
    Write-Host "[ERROR] Android Debug Bridge (adb) was not found in PATH or Android SDK platform-tools." -ForegroundColor Red
    Write-Host "Please ensure Android SDK Platform Tools is installed and 'adb' is in your PATH." -ForegroundColor Yellow
    exit 1
}

# Check connected Android devices
Write-Host "Scanning for connected physical Android devices over USB..." -ForegroundColor Yellow
$devicesOutput = & $AdbBin devices
$deviceLines = ($devicesOutput -split "`n" | Where-Object { $_ -match "\s+device$" })

if (-not $deviceLines or $deviceLines.Count -eq 0) {
    Write-Host "[WARNING] No physical Android device detected in 'device' state." -ForegroundColor Red
    Write-Host "Steps to fix:" -ForegroundColor Yellow
    Write-Host " 1. Plug in your Android phone using a USB data cable." -ForegroundColor White
    Write-Host " 2. Enable 'Developer options' -> 'USB debugging' on your phone." -ForegroundColor White
    Write-Host " 3. Accept the 'Allow USB debugging?' RSA prompt on the phone screen." -ForegroundColor White
    exit 1
}

Write-Host "Device detected: $($deviceLines[0].Trim())" -ForegroundColor Green

# Set up port reverse
Write-Host "Forwarding device tcp:3000 -> host tcp:3000 (NestJS API)..." -ForegroundColor Yellow
& $AdbBin reverse tcp:3000 tcp:3000

Write-Host "Forwarding device tcp:3002 -> host tcp:3002 (Next.js Backoffice)..." -ForegroundColor Yellow
& $AdbBin reverse tcp:3002 tcp:3002

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] USB ADB Reverse Tunnel is Active!" -ForegroundColor Green
Write-Host " Physical Phone Target: http://127.0.0.1:3000" -ForegroundColor Green
Write-Host " No Wi-Fi, No Hotspot, and No Cloud required!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
