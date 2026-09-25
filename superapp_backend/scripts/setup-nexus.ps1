# setup-nexus.ps1
# Automates the configuration of Sonatype Nexus 3 for Flutter/Dart Pub packages

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
$adminUser = if ($env:NEXUS_ADMIN_USER) { $env:NEXUS_ADMIN_USER } else { "admin" }
$targetPassword = $env:NEXUS_ADMIN_PASSWORD

Write-Host "Connecting to Nexus at: $baseUrl"

# Function to test credentials
function Test-NexusAuth($user, $pass) {
    try {
        $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$user`:$pass"))
        $res = Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/status" -Headers @{ Authorization = "Basic $b64" } -Method Get -TimeoutSec 5 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Determine working password
$currentPassword = $null
if (Test-NexusAuth $adminUser $targetPassword) {
    Write-Host "Admin is authenticated with target password."
    $currentPassword = $targetPassword
} else {
    Write-Host "Testing initial admin password from container..."
    try {
        $initPass = ((docker exec superapp-nexus cat /nexus-data/admin.password 2>$null), (docker exec dps-nexus cat /nexus-data/admin.password 2>$null), (docker exec nexus cat /nexus-data/admin.password 2>$null) | Where-Object { $_ } | Select-Object -First 1)
        if ($initPass) { $initPass = $initPass.Trim() }
        if ($initPass -and (Test-NexusAuth $adminUser $initPass)) {
            Write-Host "Found initial admin password. Updating password to target..."
            $b64Init = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$adminUser`:$initPass"))
            Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/security/users/admin/change-password" `
                -Headers @{ Authorization = "Basic $b64Init" } `
                -Method Put `
                -ContentType "text/plain" `
                -Body $targetPassword `
                -ErrorAction Stop
            Write-Host "Admin password successfully updated."
            $currentPassword = $targetPassword
        }
    } catch {
        Write-Warning "Could not read or apply initial admin password: $_"
    }
}

if (-not $currentPassword) {
    Write-Error "Failed to authenticate as admin. Please verify Nexus is running and password is correct."
    exit 1
}

$authHeader = @{ Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$adminUser`:$currentPassword")) }

# Accept Community Edition EULA if needed
try {
    $eula = Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/system/eula" -Headers $authHeader -Method Get -ErrorAction SilentlyContinue
    if ($eula -and -not $eula.accepted) {
        $eula.accepted = $true
        $body = $eula | ConvertTo-Json
        Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/system/eula" -Headers $authHeader -Method Post -ContentType "application/json" -Body $body
        Write-Host "Nexus Community Edition EULA accepted."
    }
} catch {
    Write-Warning "EULA acceptance check skipped: $_"
}

# 1. Enable Anonymous Access
Write-Host "Configuring Anonymous Access..."
try {
    $anonBody = @{
        enabled = $true
        userId = "anonymous"
        realmName = "NexusAuthorizingRealm"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/security/anonymous" -Headers $authHeader -Method Put -ContentType "application/json" -Body $anonBody
    Write-Host "Anonymous access enabled."
} catch {
    Write-Warning "Could not configure anonymous access: $_"
}

# 2. Enable Realms (NexusAuthenticatingRealm + PubToken)
Write-Host "Configuring Security Realms..."
try {
    $realmsBody = @("NexusAuthenticatingRealm", "PubToken") | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/security/realms/active" -Headers $authHeader -Method Put -ContentType "application/json" -Body $realmsBody
    Write-Host "Active realms configured with PubToken."
} catch {
    Write-Warning "Could not update active realms: $_"
}

# 2.5 Clean up unused default repositories
Write-Host "Cleaning up unused repositories (nuget-*, maven-*, redundant raw repos)..."
$unusedRepos = @("nuget-group", "nuget-hosted", "nuget.org-proxy", "maven-snapshots", "maven-releases", "maven-public", "maven-central", "miniapp-packages", "miniapp-native-sdks")
foreach ($r in $unusedRepos) {
    try {
        Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/repositories/$r" -Headers $authHeader -Method Delete -ErrorAction SilentlyContinue
        Write-Host "Deleted unused repository: $r"
    } catch {
        # Ignored if already deleted
    }
}

# 2.6 Create raw repositories for Super App APKs and Artifacts
Write-Host "Configuring raw repositories (apk-test-builds, apk-releases, superapp-artifacts, raw-sdk-artifacts)..."
$rawRepoConfigs = @(
    @{ name = "apk-test-builds"; writePolicy = "ALLOW" },
    @{ name = "apk-releases"; writePolicy = "ALLOW_ONCE" },
    @{ name = "superapp-artifacts"; writePolicy = "ALLOW" },
    @{ name = "raw-sdk-artifacts"; writePolicy = "ALLOW" }
)
foreach ($cfg in $rawRepoConfigs) {
    try {
        $rawPayload = @{
            name = $cfg.name
            online = $true
            storage = @{
                blobStoreName = "default"
                strictContentTypeValidation = $false
                writePolicy = $cfg.writePolicy
            }
        } | ConvertTo-Json -Depth 5
        Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/repositories/raw/hosted" -Headers $authHeader -Method Post -ContentType "application/json" -Body $rawPayload
        Write-Host "Created repository: $($cfg.name) (WritePolicy: $($cfg.writePolicy))"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 400 -or $_.Exception.Message -like "*already exists*") {
            Write-Host "Repository $($cfg.name) already exists."
        } else {
            Write-Warning "$($cfg.name) creation response: $_"
        }
    }
}

# 3. Create pub-hosted repository (Immutable Dart Package Artifacts)
Write-Host "Configuring pub-hosted repository (WritePolicy: ALLOW_ONCE)..."
try {
    $hostedPayload = @{
        name = "pub-hosted"
        online = $true
        storage = @{
            blobStoreName = "default"
            strictContentTypeValidation = $true
            writePolicy = "ALLOW_ONCE"
        }
    } | ConvertTo-Json -Depth 5

    Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/repositories/pub/hosted" -Headers $authHeader -Method Post -ContentType "application/json" -Body $hostedPayload
    Write-Host "Created repository: pub-hosted"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400 -or $_.Exception.Message -like "*already exists*") {
        Write-Host "Repository pub-hosted already exists."
    } else {
        Write-Warning "pub-hosted creation response: $_"
    }
}

# 4. Create pub-proxy repository
Write-Host "Configuring pub-proxy repository (https://pub.dev)..."
try {
    $proxyPayload = @{
        name = "pub-proxy"
        online = $true
        storage = @{
            blobStoreName = "default"
            strictContentTypeValidation = $true
        }
        proxy = @{
            remoteUrl = "https://pub.dev"
            contentMaxAge = 1440
            metadataMaxAge = 1440
        }
        negativeCache = @{
            enabled = $true
            timeToLive = 1440
        }
        httpClient = @{
            blocked = $false
            autoBlock = $true
        }
    } | ConvertTo-Json -Depth 5

    Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/repositories/pub/proxy" -Headers $authHeader -Method Post -ContentType "application/json" -Body $proxyPayload
    Write-Host "Created repository: pub-proxy"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400 -or $_.Exception.Message -like "*already exists*") {
        Write-Host "Repository pub-proxy already exists."
    } else {
        Write-Warning "pub-proxy creation response: $_"
    }
}

# 5. Create pub-group repository
Write-Host "Configuring pub-group repository (combining pub-hosted + pub-proxy)..."
try {
    $groupPayload = @{
        name = "pub-group"
        online = $true
        storage = @{
            blobStoreName = "default"
            strictContentTypeValidation = $true
        }
        group = @{
            memberNames = @("pub-hosted", "pub-proxy")
        }
    } | ConvertTo-Json -Depth 5

    Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/repositories/pub/group" -Headers $authHeader -Method Post -ContentType "application/json" -Body $groupPayload
    Write-Host "Created repository: pub-group"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400 -or $_.Exception.Message -like "*already exists*") {
        Write-Host "Repository pub-group already exists."
    } else {
        Write-Warning "pub-group creation response: $_"
    }
}

# 6. Verify Repositories
Write-Host "`n=== Verifying Repositories ==="
$repos = Invoke-RestMethod -Uri "$baseUrl/service/rest/v1/repositories" -Headers $authHeader -Method Get
$pubRepos = $repos | Where-Object { $_.format -eq "pub" }
$pubRepos | Select-Object name, format, type, url | Format-Table -AutoSize

Write-Host "Nexus Pub configuration completed successfully!"
