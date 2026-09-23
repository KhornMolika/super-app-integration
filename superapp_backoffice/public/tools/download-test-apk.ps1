# =============================================================================
# Super App Test Build APK Downloader (Dynamic Nexus Package Fetcher - PowerShell)
# =============================================================================
# Dynamically resolves and downloads the hosted Super App APK package from
# Sonatype Nexus repository without hardcoding static versions.
#
# Usage:
#   .\download-test-apk.ps1 [-Version "latest"] [-NexusUrl "http://localhost:8081"]
# =============================================================================

param(
    [string]$Version = "latest",
    [string]$NexusUrl = "",
    [string]$RepoName = "apk-test-builds",
    [string]$AppName = "superapp"
)

$ErrorActionPreference = "Stop"

if (-not $NexusUrl) {
    if ($env:NEXUS_BASE_URL) { $NexusUrl = $env:NEXUS_BASE_URL }
    elseif ($env:NEXT_PUBLIC_NEXUS_URL) { $NexusUrl = $env:NEXT_PUBLIC_NEXUS_URL }
    elseif ($env:NEXUS_URL) { $NexusUrl = $env:NEXUS_URL }
    else { $NexusUrl = "http://localhost:8081" }
}
$NexusUrl = $NexusUrl.TrimEnd('/')

$outputDir = "$HOME\Downloads"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ">> Super App Dynamic Nexus Package Downloader" -ForegroundColor Cyan
Write-Host " Nexus Host : $NexusUrl" -ForegroundColor Gray
Write-Host " Repository : $RepoName" -ForegroundColor Gray
Write-Host " Target     : $Version" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$resolvedUrl = ""
$outputFile = ""

if ($Version -eq "latest" -or -not $Version) {
    # Dynamically query Nexus REST API for latest asset in repository
    try {
        $user = if ($env:NEXUS_ADMIN_USER) { $env:NEXUS_ADMIN_USER } else { "admin" }
        $pass = if ($env:NEXUS_ADMIN_PASSWORD) { $env:NEXUS_ADMIN_PASSWORD } else { "admin123" }
        $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${user}:${pass}"))
        
        $apiRes = Invoke-RestMethod -Uri "$NexusUrl/service/rest/v1/assets?repository=$RepoName" -Headers @{ Authorization = "Basic $b64" } -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($apiRes.items -and $apiRes.items.Count -gt 0) {
            $sorted = $apiRes.items | Sort-Object { [DateTime]($_.lastModified) } -Descending
            $resolvedUrl = $sorted[0].downloadUrl
        }
    } catch {}

    if (-not $resolvedUrl) {
        $resolvedUrl = "$NexusUrl/repository/$RepoName/$AppName/latest/app-debug.apk"
    }
    $outputFile = "$outputDir\superapp-latest.apk"
} else {
    $normVersion = if ($Version.StartsWith("v")) { $Version } else { "v$Version" }
    $resolvedUrl = "$NexusUrl/repository/$RepoName/$AppName/$normVersion/app-debug.apk"
    $outputFile = "$outputDir\superapp-$normVersion.apk"
}

Write-Host " Fetching remote package from: $resolvedUrl..." -ForegroundColor Yellow

try {
    curl.exe -fSL --progress-bar -o "$outputFile" "$resolvedUrl"
    if ((Test-Path $outputFile) -and ((Get-Item $outputFile).Length -gt 0)) {
        $fileObj = Get-Item $outputFile
        $sizeMb = [math]::Round($fileObj.Length / 1MB, 2)
        Write-Host "`n[SUCCESS] Successfully downloaded hosted Nexus package!" -ForegroundColor Green
        Write-Host " Saved to: $outputFile ($sizeMb MB)" -ForegroundColor Yellow
    } else {
        Write-Host "`n[ERROR] Download failed from $resolvedUrl." -ForegroundColor Red
        Write-Host "Please ensure Sonatype Nexus is running and $RepoName contains $AppName artifacts." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n[ERROR] Download error: $_" -ForegroundColor Red
    exit 1
}
