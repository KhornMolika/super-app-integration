# scripts/analyze-apk-size.ps1
# Analyzes Android APK / Bundle size metrics and benchmarks Universal vs Split-per-ABI APKs

$ErrorActionPreference = "Stop"

$MobileAppDir = Resolve-Path "$PSScriptRoot/.."

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "📉 Super App Mobile Container: APK & Binary Size Analysis" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location $MobileAppDir

# 1. Clean build artifacts
Write-Host "`n[1/3] Cleaning previous build cache..." -ForegroundColor Yellow
flutter clean

# 2. Build with ABI split and icon tree shaking
Write-Host "`n[2/3] Compiling split-per-ABI release APKs with icon tree-shaking..." -ForegroundColor Yellow
flutter build apk --split-per-abi --tree-shake-icons --release

if ($LASTEXITCODE -ne 0) {
    Write-Error "Flutter APK build failed!"
    exit 1
}

# 3. Inspect generated APK sizes
Write-Host "`n[3/3] Inspecting compiled binary artifacts in build/app/outputs/flutter-apk/:" -ForegroundColor Green
$ApkDir = "$MobileAppDir/build/app/outputs/flutter-apk"

if (Test-Path $ApkDir) {
    Get-ChildItem -Path $ApkDir -Filter "*.apk" | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        $color = if ($sizeMB -lt 25) { "Green" } else { "Yellow" }
        Write-Host ("  - {0,-35} : {1,6} MB" -f $_.Name, $sizeMB) -ForegroundColor $color
    }
}

Write-Host "`n✅ Binary size analysis completed!" -ForegroundColor Cyan
Write-Host "💡 Optimization Tip: Distributing per-ABI APKs or Android App Bundles (.aab) reduces download sizes by 60-70% compared to universal fat APKs." -ForegroundColor DarkCyan
