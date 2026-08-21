param (
    [string]$PackagePath = ".\dsp_miniapp_trust_regulator",
    [string]$NexusPubHostedUrl = "http://localhost:8081/repository/pub-hosted",
    [switch]$Publish,
    [switch]$Strict
)

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     DSP PLATFORM: SECURITY GATE 1 PRE-PUBLISH SCANNER     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Package Target : $PackagePath"
Write-Host "Nexus Hosted   : $NexusPubHostedUrl"
Write-Host "Publish Flag   : $Publish"
Write-Host "Timestamp      : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

$ResolvedPath = (Resolve-Path $PackagePath).Path
if (!(Test-Path "$ResolvedPath\pubspec.yaml")) {
    Write-Host "ERROR: pubspec.yaml not found at $ResolvedPath" -ForegroundColor Red
    exit 1
}

$GatePassed = $true
$Findings = @()

# 1. Static Analysis
Write-Host "[1/5] Running Static Analysis (dart analyze)..." -ForegroundColor Yellow
Push-Location $ResolvedPath
$AnalyzeOutput = dart analyze 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Static analysis passed with 0 errors." -ForegroundColor Green
} else {
    Write-Host "  [WARN] Static analysis reported warnings." -ForegroundColor Yellow
    if ($Strict -and ($AnalyzeOutput -match "error -")) {
        Write-Host "  [FAIL] Fatal lint/analysis errors detected!" -ForegroundColor Red
        $Findings += "Static Analysis Errors: $AnalyzeOutput"
        $GatePassed = $false
    }
}
Pop-Location

# 2. Automated Unit Tests
Write-Host "[2/5] Running Automated Unit Tests..." -ForegroundColor Yellow
Push-Location $ResolvedPath
if (Test-Path "$ResolvedPath\test") {
    $TestOutput = flutter test 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] All package unit tests passed." -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Unit tests failed!" -ForegroundColor Red
        $Findings += "Test Failures: $TestOutput"
        $GatePassed = $false
    }
} else {
    Write-Host "  [SKIP] No test directory found; skipping unit tests." -ForegroundColor DarkGray
}
Pop-Location

# 3. Secret & Vulnerability Scanning
Write-Host "[3/5] Scanning Source Files for Hardcoded Secrets..." -ForegroundColor Yellow
$DartFiles = Get-ChildItem -Path "$ResolvedPath" -Recurse -Include "*.dart", "*.yaml"
$SecretsFound = 0

foreach ($file in $DartFiles) {
    if ($file.FullName.Contains(".dart_tool") -or $file.FullName.Contains("\build\")) { continue }
    $content = [System.IO.File]::ReadAllText($file.FullName)
    
    if ($content -match "(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}") {
        Write-Host "  [FAIL] Found AWS Access Key in $($file.Name)!" -ForegroundColor Red
        $Findings += "Secret Found: AWS Access Key in $($file.FullName)"
        $SecretsFound++
        $GatePassed = $false
    }

    if ($content -match "-----BEGIN (RSA |EC |DSA |OPENSSH |)PRIVATE KEY-----") {
        Write-Host "  [FAIL] Found Private Key Block in $($file.Name)!" -ForegroundColor Red
        $Findings += "Secret Found: Private Key in $($file.FullName)"
        $SecretsFound++
        $GatePassed = $false
    }
}

if ($SecretsFound -eq 0) {
    Write-Host "  [OK] 0 secret leaks detected." -ForegroundColor Green
}

# 4. SHA-256 Checksum Calculation
Write-Host "[4/5] Computing SHA-256 Checksum & Integrity Digest..." -ForegroundColor Yellow
$Sha256 = (Get-FileHash -Path "$ResolvedPath\pubspec.yaml" -Algorithm SHA256).Hash
Write-Host "  [OK] SHA-256 (pubspec.yaml): $Sha256" -ForegroundColor Green

# 5. Security Gate 1 Verdict
Write-Host "[5/5] Finalizing Security Gate 1 Decision..." -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan

if ($GatePassed) {
    Write-Host "           SECURITY GATE 1: [ PASSED ]                      " -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "Package is verified, secure, and eligible for Nexus release." -ForegroundColor Green
    Write-Host "SHA-256 Digest: $Sha256"

    if ($Publish) {
        Write-Host ""
        Write-Host "Publishing package artifact to Nexus ($NexusPubHostedUrl)..." -ForegroundColor Yellow
        Push-Location $ResolvedPath
        dart pub publish --force
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Successfully published to Nexus pub-hosted!" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] Nexus publish failed." -ForegroundColor Red
            Pop-Location
            exit 1
        }
        Pop-Location
    }
    exit 0
} else {
    Write-Host "           SECURITY GATE 1: [ FAILED ]                      " -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "The package has failed pre-publish security checks:" -ForegroundColor Red
    foreach ($finding in $Findings) {
        Write-Host "  * $finding" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Publication to Nexus registry has been BLOCKED by Security Gate 1." -ForegroundColor Red
    exit 1
}
