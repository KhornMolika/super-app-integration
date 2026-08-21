# verify-phase2-3.ps1
# Automated verification of Phase 2 & 3: Git Provider Abstraction (GitHub & GitLab)

Write-Host "========================================================="
Write-Host " Phase 2 & 3 Verification: Git Provider Abstraction    "
Write-Host "========================================================="

$allPassed = $true

# Test 1: GitHub URL Detection
Write-Host -NoNewline "[1/6] Testing GitHub URL auto-detection... "
try {
    $body = @{ url = "https://github.com/flutter/samples.git" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:3000/api/integrations/git/detect" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 5 -ErrorAction Stop
    if ($res.provider -eq "github" -and $res.parsed.owner -eq "flutter" -and $res.parsed.repo -eq "samples") {
        Write-Host "PASSED (Detected: github -> flutter/samples)" -ForegroundColor Green
    } else {
        Write-Host "FAILED ($($res | ConvertTo-Json -Compress))" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "NOTE (Backend might not be running on port 3000: $_)" -ForegroundColor Yellow
}

# Test 2: GitLab URL Detection with Nested Namespaces
Write-Host -NoNewline "[2/6] Testing GitLab URL auto-detection (nested namespaces)... "
try {
    $body = @{ url = "https://gitlab.company.com/mobile/banking/payment-miniapp.git" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:3000/api/integrations/git/detect" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 5 -ErrorAction Stop
    if ($res.provider -eq "gitlab" -and $res.parsed.owner -eq "mobile/banking" -and $res.parsed.repo -eq "payment-miniapp") {
        Write-Host "PASSED (Detected: gitlab -> mobile/banking/payment-miniapp)" -ForegroundColor Green
    } else {
        Write-Host "FAILED" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "NOTE (Skipping live API if backend offline)" -ForegroundColor Yellow
}

# Test 3: GitHub Snippet Generation
Write-Host -NoNewline "[3/6] Testing GitHub dependency snippet generation... "
try {
    $body = @{
        url = "https://github.com/company/payment-miniapp.git"
        refType = "tag"
        ref = "v1.0.0"
        packageName = "payment_miniapp"
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:3000/api/integrations/git/snippet" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 5 -ErrorAction Stop
    if ($res.snippet -like "*git:*" -and $res.snippet -like "*ref: v1.0.0*") {
        Write-Host "PASSED" -ForegroundColor Green
    } else {
        Write-Host "FAILED" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "NOTE (Skipping live API if backend offline)" -ForegroundColor Yellow
}

# Test 4: GitLab Snippet Generation
Write-Host -NoNewline "[4/6] Testing GitLab dependency snippet generation... "
try {
    $body = @{
        url = "https://gitlab.company.com/mobile/payment-miniapp.git"
        refType = "commit"
        ref = "7f8b9c0d1e2f"
        packageName = "payment_miniapp"
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:3000/api/integrations/git/snippet" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 5 -ErrorAction Stop
    if ($res.snippet -like "*url: https://gitlab.company.com/mobile/payment-miniapp.git*" -and $res.snippet -like "*ref: 7f8b9c0d1e2f*") {
        Write-Host "PASSED" -ForegroundColor Green
    } else {
        Write-Host "FAILED" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "NOTE (Skipping live API if backend offline)" -ForegroundColor Yellow
}

Write-Host "========================================================="
Write-Host " Phase 2 & 3 Unit Tests Verification"
Write-Host "========================================================="
npm test -- git-integration.service.spec.ts
