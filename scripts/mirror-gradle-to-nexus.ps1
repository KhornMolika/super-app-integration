<#
.SYNOPSIS
    Downloads the Gradle 9.1.0 distribution and mirrors it to Sonatype Nexus under superapp-artifacts/gradle/.
.DESCRIPTION
    Fixes the CI/CD Gradle Wrapper network connection reset error by hosting the distribution internally.
.EXAMPLE
    .\scripts\mirror-gradle-to-nexus.ps1 -NexusUser admin -NexusPassword admin123
#>

param (
    [string]$GradleVersion = "9.1.0",
    [string]$GradleType = "all", # "all" or "bin"
    [string]$NexusUrl = "https://app.fintechcenterfsa.com/nexus",
    [string]$RepositoryName = "superapp-artifacts",
    [string]$NexusUser = "admin",
    [string]$NexusPassword
)

$ErrorActionPreference = "Stop"

$zipName = "gradle-$GradleVersion-$GradleType.zip"
$sourceUrl = "https://services.gradle.org/distributions/$zipName"
$targetUrl = "$NexusUrl/repository/$RepositoryName/gradle/$zipName"
$tempPath = [System.IO.Path]::Combine($PSScriptRoot, "..", ".tmp", $zipName)

$tempDir = [System.IO.Path]::GetDirectoryName($tempPath)
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

if (-not (Test-Path $tempPath)) {
    Write-Host "[1/3] Downloading $zipName from $sourceUrl..." -ForegroundColor Cyan
    curl.exe -fL "$sourceUrl" -o "$tempPath" --progress-bar
    if (-not (Test-Path $tempPath) -or ((Get-Item $tempPath).Length -eq 0)) {
        Write-Error "Failed to download $zipName"
    }
    Write-Host "Downloaded successfully ($([math]::Round((Get-Item $tempPath).Length / 1MB, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "[1/3] Using cached local archive: $tempPath" -ForegroundColor Green
}

if (-not $NexusPassword) {
    $NexusPassword = Read-Host "Enter Nexus password for user '$NexusUser'" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($NexusPassword)
    $NexusPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

Write-Host "[2/3] Uploading $zipName to Nexus ($targetUrl)..." -ForegroundColor Cyan
$authHeader = "$($NexusUser):$($NexusPassword)"

$uploadResult = curl.exe -sS -w "%{http_code}" -u "$authHeader" --upload-file "$tempPath" "$targetUrl" -o .upload_resp.txt
$respBody = if (Test-Path .upload_resp.txt) { Get-Content .upload_resp.txt -Raw; Remove-Item .upload_resp.txt -Force } else { "" }

if ($uploadResult -match "^(200|201|204)$") {
    Write-Host "[3/3] Upload successful! (HTTP $uploadResult)" -ForegroundColor Green
} else {
    Write-Error "Upload failed with HTTP status $uploadResult. Response: $respBody"
}

Write-Host "`nVerifying artifact reachability from Nexus..." -ForegroundColor Cyan
$verifyCode = curl.exe -sS -o /dev/null -w "%{http_code}" -u "$authHeader" "$targetUrl"
Write-Host "Verification result: HTTP $verifyCode" -ForegroundColor Green

Write-Host "`nAll done! Gradle distribution is now mirrored at:" -ForegroundColor Yellow
Write-Host "$targetUrl`n" -ForegroundColor Yellow

