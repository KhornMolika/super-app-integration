param(
    [string]$OutputDir = "."
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Super App Mini App Clean Packaging Utility" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify pubspec.yaml exists
if (-not (Test-Path "pubspec.yaml")) {
    Write-Host "Error: pubspec.yaml not found in the current directory." -ForegroundColor Red
    Write-Host "Please execute this script from the root of your Flutter Mini App project." -ForegroundColor Yellow
    exit 1
}

# 2. Extract Mini App Name & Version
$PubspecContent = Get-Content "pubspec.yaml" -Raw
$AppName = if ($PubspecContent -match '(?m)^name:\s*([a-zA-Z0-9_-]+)') { $Matches[1].Trim() } else { "miniapp" }
$AppVersion = if ($PubspecContent -match '(?m)^version:\s*([^\s#]+)') { $Matches[1].Trim() } else { "1.0.0" }

Write-Host "App Name : $AppName" -ForegroundColor Green
Write-Host "Version  : $AppVersion" -ForegroundColor Green

# 3. Clean local build artifacts
Write-Host "`nStep 1/3: Cleaning local build caches..." -ForegroundColor Yellow
try {
    flutter clean | Out-Null
    Write-Host "   'flutter clean' completed." -ForegroundColor Green
} catch {
    Write-Host "   'flutter' CLI not found in PATH or failed; proceeding with manual file cleanup..." -ForegroundColor Yellow
}

# Remove remaining cache folders manually if still present
$JunkFolders = @("build", ".dart_tool", ".gradle", "android\.gradle", "android\app\build", "ios\Pods", ".idea", ".vscode", "node_modules", "__MACOSX")
foreach ($folder in $JunkFolders) {
    if (Test-Path $folder) {
        Remove-Item -Recurse -Force $folder -ErrorAction SilentlyContinue
    }
}

# 4. Prepare Files for Packaging
Write-Host "`nStep 2/3: Gathering source files..." -ForegroundColor Yellow

$IncludedPaths = @()
$MandatoryItems = @("lib", "pubspec.yaml")
$OptionalItems = @("assets", "pubspec.lock", "README.md", "CHANGELOG.md", "LICENSE", "android", "ios", "test")

foreach ($item in $MandatoryItems) {
    if (Test-Path $item) {
        $IncludedPaths += $item
    } else {
        Write-Host "Missing mandatory item: $item" -ForegroundColor Red
        exit 1
    }
}

foreach ($item in $OptionalItems) {
    if (Test-Path $item) {
        $IncludedPaths += $item
    }
}

Write-Host "   Included components: $($IncludedPaths -join ', ')" -ForegroundColor DarkGray

# 5. Compress Archive
Write-Host "`nStep 3/3: Creating optimized zip archive..." -ForegroundColor Yellow

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$CleanVersion = $AppVersion -replace '[^a-zA-Z0-9.-]', '_'
$ZipFileName = "$AppName-$CleanVersion.zip"
$ZipFilePath = Join-Path $OutputDir $ZipFileName

if (Test-Path $ZipFilePath) {
    Remove-Item -Force $ZipFilePath
}

Compress-Archive -Path $IncludedPaths -DestinationPath $ZipFilePath -CompressionLevel Optimal

$ZipItem = Get-Item $ZipFilePath
$ZipSizeKb = [math]::Round($ZipItem.Length / 1KB, 1)
$ZipSizeMb = [math]::Round($ZipItem.Length / 1MB, 2)

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Mini App Package Successfully Created!" -ForegroundColor Green
Write-Host " Package File: $ZipFilePath" -ForegroundColor Cyan
if ($ZipItem.Length -ge 1MB) {
    Write-Host " Package Size: $ZipSizeMb MB" -ForegroundColor Green
} else {
    Write-Host " Package Size: $ZipSizeKb KB" -ForegroundColor Green
}
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "You can now upload this clean archive in the Super App Backoffice." -ForegroundColor Cyan
