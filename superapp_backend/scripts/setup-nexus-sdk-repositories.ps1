<#
.SYNOPSIS
    Provisions and checks the Nexus hosted repositories used by Super App SDKs & builds.
    Idempotent: repositories that already exist are safely skipped.

.DESCRIPTION
    Supports provisioning standard repositories as well as friendly-named aliases:
    - npm (hosted): For Webview MiniApp SDK (@fsasuperapp/miniapp-web-sdk)
    - maven (hosted): For Android Native MiniApp SDK (.aar)
    - raw (hosted): For iOS Podspecs, iOS XCFramework binaries, APK builds, and Core bundles

.EXAMPLE
    .\scripts\setup-nexus-sdk-repositories.ps1 -AdminPassword "admin123"
    .\scripts\setup-nexus-sdk-repositories.ps1 -AdminPassword "admin123" -UseFriendlyNames
#>

[CmdletBinding()]
param (
    [string]$NexusBaseUrl = $(if ($env:NEXUS_BASE_URL) { $env:NEXUS_BASE_URL } else { "https://app.fintechcenterfsa.com/nexus" }),
    [string]$AdminUser = $(if ($env:NEXUS_ADMIN_USER) { $env:NEXUS_ADMIN_USER } else { "admin" }),
    [string]$AdminPassword = $(if ($env:NEXUS_ADMIN_PASSWORD) { $env:NEXUS_ADMIN_PASSWORD } else { "admin123" }),
    [switch]$UseFriendlyNames,
    [switch]$Both
)

# Auto-load .env file from project root or superapp_backend if available
$candidateEnvFiles = @(
    (Join-Path $PSScriptRoot "..\.env.production"),
    (Join-Path $PSScriptRoot "..\.env"),
    (Join-Path (Get-Location) ".env.production"),
    (Join-Path (Get-Location) ".env")
)
foreach ($ef in $candidateEnvFiles) {
    if (Test-Path $ef) {
        Get-Content $ef | Where-Object { $_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$' } | ForEach-Object {
            $k = $matches[1]
            $v = $matches[2].Trim('"').Trim("'")
            if (-not [Environment]::GetEnvironmentVariable($k, "Process")) {
                [Environment]::SetEnvironmentVariable($k, $v, "Process")
            }
        }
        break
    }
}

if (-not $PSBoundParameters.ContainsKey('NexusBaseUrl') -and $env:NEXUS_BASE_URL) { $NexusBaseUrl = $env:NEXUS_BASE_URL }
if (-not $PSBoundParameters.ContainsKey('AdminUser') -and $env:NEXUS_ADMIN_USER) { $AdminUser = $env:NEXUS_ADMIN_USER }
if (-not $PSBoundParameters.ContainsKey('AdminPassword') -and $env:NEXUS_ADMIN_PASSWORD) { $AdminPassword = $env:NEXUS_ADMIN_PASSWORD }

$NexusBaseUrl = $NexusBaseUrl.TrimEnd('/')
$apiUrl = "$NexusBaseUrl/service/rest/v1"

# Prepare Basic Auth header
$pair = "$($AdminUser):$($AdminPassword)"
$encoded = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{
    "Authorization" = "Basic $encoded"
    "Accept"        = "application/json"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Sonatype Nexus Repository Provisioning Script" -ForegroundColor Cyan
Write-Host " Nexus URL: $NexusBaseUrl" -ForegroundColor Gray
Write-Host " User:      $AdminUser" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# Enable TLS 1.2 and handle SSL certificates universally
try {
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls11 -bor [System.Net.SecurityProtocolType]::Tls
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
} catch {}

function Test-RepoExists {
    param ([string]$RepoName)
    try {
        $checkUrl = "$apiUrl/repositories/$RepoName"
        $response = Invoke-WebRequest -Uri $checkUrl -Headers $headers -Method Get -UseBasicParsing -ErrorAction SilentlyContinue
        return ($response.StatusCode -eq 200)
    }
    catch {
        return $false
    }
}

function New-NexusRepo {
    param (
        [string]$Name,
        [string]$Format,
        [string]$WritePolicy = "ALLOW",
        [hashtable]$ExtraProps = @{}
    )

    if (Test-RepoExists -RepoName $Name) {
        Write-Host "  [SKIP]  Repository '$Name' already exists." -ForegroundColor Yellow
        return
    }

    $bodyObj = @{
        name    = $Name
        online  = $true
        storage = @{
            blobStoreName               = "default"
            strictContentTypeValidation = $false
            writePolicy                 = $WritePolicy
        }
    }

    foreach ($key in $ExtraProps.Keys) {
        $bodyObj[$key] = $ExtraProps[$key]
    }

    $jsonBody = $bodyObj | ConvertTo-Json -Depth 5
    $targetUrl = "$apiUrl/repositories/$Format/hosted"

    try {
        $postHeaders = @{
            "Authorization" = "Basic $encoded"
            "Content-Type"  = "application/json"
        }
        $res = Invoke-WebRequest -Uri $targetUrl -Headers $postHeaders -Method Post -Body $jsonBody -UseBasicParsing
        if ($res.StatusCode -in 201, 204) {
            Write-Host "  [CREATED] Repository '$Name' ($Format hosted) successfully created!" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  [ERROR] Failed to create repository '$Name': $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n1. Provisioning Primary SDK & Distribution Repositories..." -ForegroundColor Magenta

# Raw format extra configuration
$rawExtra = @{
    raw = @{ contentDisposition = "ATTACHMENT" }
}

# Maven format extra configuration
$mavenExtra = @{
    maven = @{
        versionPolicy      = "RELEASE"
        layoutPolicy       = "PERMISSIVE"
        contentDisposition = "ATTACHMENT"
    }
}

if (-not $UseFriendlyNames -or $Both) {
    # Default standard repository names
    Write-Host "  >> Checking Standard Repositories <<" -ForegroundColor Cyan
    New-NexusRepo -Name "npm-hosted"        -Format "npm"
    New-NexusRepo -Name "raw-sdk-artifacts" -Format "raw"   -ExtraProps $rawExtra
    New-NexusRepo -Name "cocoapods-specs"   -Format "raw"   -ExtraProps $rawExtra
    New-NexusRepo -Name "apk-test-builds"   -Format "raw"   -ExtraProps $rawExtra
    New-NexusRepo -Name "apk-releases"      -Format "raw"   -ExtraProps $rawExtra
    New-NexusRepo -Name "maven-sdk-hosted"  -Format "maven" -ExtraProps $mavenExtra
    New-NexusRepo -Name "superapp-artifacts"-Format "raw"   -ExtraProps $rawExtra
}

if ($UseFriendlyNames -or $Both) {
    # Friendly self-documenting repository names
    Write-Host "`n  >> Checking Friendly Self-Documenting Repositories <<" -ForegroundColor Cyan
    New-NexusRepo -Name "miniapp-sdk-web-npm"       -Format "npm"
    New-NexusRepo -Name "miniapp-sdk-android-maven" -Format "maven" -ExtraProps $mavenExtra
    New-NexusRepo -Name "miniapp-sdk-ios-specs"     -Format "raw"   -ExtraProps $rawExtra
    New-NexusRepo -Name "miniapp-sdk-ios-binaries"  -Format "raw"   -ExtraProps $rawExtra
    New-NexusRepo -Name "superapp-apk-test-builds"  -Format "raw"   -ExtraProps $rawExtra
    New-NexusRepo -Name "superapp-apk-production"   -Format "raw"   -ExtraProps $rawExtra
    New-NexusRepo -Name "superapp-shell-bundles"    -Format "raw"   -ExtraProps $rawExtra
}

Write-Host "`nProvisioning check completed.`n" -ForegroundColor Green
