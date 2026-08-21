# verify-phase1.ps1
# End-to-end verification of Phase 1: Local Nexus Setup, Package Publishing & Consuming

param (
    [string]$EnvFile = "$PSScriptRoot/../.env"
)

# Load .env file
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $name = $parts[0].Trim()
            $value = $parts[1].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$baseUrl = if ($env:NEXUS_BASE_URL) { $env:NEXUS_BASE_URL } else { "http://localhost:8081" }
$pubHostedUrl = if ($env:NEXUS_PUB_HOSTED_URL) { $env:NEXUS_PUB_HOSTED_URL } else { "$baseUrl/repository/pub-hosted" }
$pubGroupUrl = if ($env:NEXUS_PUB_GROUP_URL) { $env:NEXUS_PUB_GROUP_URL } else { "$baseUrl/repository/pub-group" }

Write-Host "========================================="
Write-Host "  Phase 1 Verification: Nexus Pub Setup  "
Write-Host "========================================="

$allPassed = $true

# Test 1: Nexus Server Health
Write-Host -NoNewline "[1/5] Checking Nexus Server Health... "
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/status" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "PASSED (HTTP 200)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
    $allPassed = $false
}

# Test 2: Nexus Repositories
Write-Host -NoNewline "[2/5] Checking Repositories (pub-hosted, pub-proxy, pub-group)... "
try {
    $repos = Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/repositories" -TimeoutSec 5 -ErrorAction Stop
    $pubRepos = ($repos | Where-Object { $_.format -eq "pub" }).name
    if ($pubRepos -contains "pub-hosted" -and $pubRepos -contains "pub-proxy" -and $pubRepos -contains "pub-group") {
        Write-Host "PASSED (Found: $($pubRepos -join ', '))" -ForegroundColor Green
    } else {
        Write-Host "FAILED (Missing pub repos: $($pubRepos -join ', '))" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
    $allPassed = $false
}

# Test 3: Hosted Package Availability (dps_core_package)
Write-Host -NoNewline "[3/5] Querying dps_core_package on pub-hosted & pub-group... "
try {
    $hostedPkg = Invoke-RestMethod -Uri "$pubHostedUrl/api/packages/dps_core_package" -TimeoutSec 5 -ErrorAction Stop
    $groupPkg = Invoke-RestMethod -Uri "$pubGroupUrl/api/packages/dps_core_package" -TimeoutSec 5 -ErrorAction Stop
    if ($hostedPkg.name -eq "dps_core_package" -and $groupPkg.name -eq "dps_core_package") {
        Write-Host "PASSED (Version $($hostedPkg.latest.version) is indexed)" -ForegroundColor Green
    } else {
        Write-Host "FAILED (Package metadata mismatch)" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
    $allPassed = $false
}

# Test 4: Pub Proxy / pub.dev Caching
Write-Host -NoNewline "[4/5] Testing pub.dev Proxy through pub-group... "
try {
    $proxyPkg = Invoke-RestMethod -Uri "$pubGroupUrl/api/packages/get" -TimeoutSec 10 -ErrorAction Stop
    if ($proxyPkg.name -eq "get") {
        Write-Host "PASSED (Successfully proxied 'get' package from pub.dev)" -ForegroundColor Green
    } else {
        Write-Host "FAILED" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
    $allPassed = $false
}

# Test 5: Super App pubspec.lock Hosted Dependency
Write-Host -NoNewline "[5/5] Verifying Super App pubspec.lock dependency binding... "
$lockPath = "$PSScriptRoot/../../dps_mobile_app/pubspec.lock"
if (Test-Path $lockPath) {
    $lockContent = Get-Content $lockPath -Raw
    if ($lockContent -like "*dps_core_package*" -and $lockContent -like "*pub-group*") {
        Write-Host "PASSED (dps_mobile_app locked to Nexus pub-group)" -ForegroundColor Green
    } else {
        Write-Host "FAILED (pubspec.lock does not reference pub-group for dps_core_package)" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "FAILED (pubspec.lock not found)" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "========================================="
if ($allPassed) {
    Write-Host " All Phase 1 Verification Checks PASSED!" -ForegroundColor Green
} else {
    Write-Host " Some verification checks failed." -ForegroundColor Red
}
Write-Host "========================================="
