<#
.SYNOPSIS
    Unified Local Pre-Flight Container Testing, Verification, and Harbor Publishing Script.
.DESCRIPTION
    Runs local quality gates (Jest unit tests, TypeScript typechecks, linting) and sequentially
    compiles and pushes production container images directly to Harbor (registry.fintechcenterfsa.com).

    Sequential Execution Policy:
    Images are built sequentially by default rather than concurrently. Concurrent builds
    trigger 100% CPU thrashing, memory exhaustion (OOM), and network congestion during multi-GB
    layer pushes. Sequential builds allow deterministic fail-fast behavior (e.g. aborting if backend
    unit tests fail before building frontend assets).
.PARAMETER Target
    Component to build: 'all', 'backend', 'manager' (backoffice), or 'client' (Flutter web).
.PARAMETER Tag
    Docker image tag (default: 'latest').
.PARAMETER HarborRegistry
    Harbor host (default: 'registry.fintechcenterfsa.com').
.PARAMETER HarborProject
    Harbor project namespace (default: 'super-app').
.PARAMETER SkipTests
    Bypass pre-flight test suites (use with caution).
.PARAMETER SkipPush
    Build Docker images locally without pushing to Harbor (dry-run).
#>

[CmdletBinding()]
param(
    [ValidateSet('all', 'backend', 'api', 'frontend', 'backoffice', 'manager', 'mobile', 'client')]
    [string]$Target = 'all',

    [string]$Tag = 'latest',
    [string]$HarborRegistry = 'registry.fintechcenterfsa.com',
    [string]$HarborProject = 'super-app',
    [switch]$SkipTests,
    [switch]$SkipPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Normalize target aliases to core components
switch ($Target.ToLower()) {
    'api'        { $Target = 'backend' }
    'frontend'   { $Target = 'manager' }
    'backoffice' { $Target = 'manager' }
    'mobile'     { $Target = 'client' }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = (Resolve-Path "$scriptDir\..").Path
$backendDir = Join-Path $rootDir "superapp_backend"
$backofficeDir = Join-Path $rootDir "superapp_backoffice"
$clientDir = Join-Path $rootDir "super-app"

function Write-Step {
    param([string]$Title)
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host " >> $Title" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Msg)
    Write-Host " [OK] $Msg" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Msg)
    Write-Host " [FAILED] $Msg" -ForegroundColor Red
}

function Check-DockerStatus {
    Write-Host "Verifying Docker Daemon status..." -ForegroundColor Gray
    try {
        $dockerVer = docker version --format '{{.Server.Version}}' 2>$null
        if (-not $dockerVer) {
            throw "Docker daemon is not running. Please start Docker Desktop before running this script."
        }
        Write-Success "Docker Daemon is active (v$dockerVer)."
    } catch {
        Write-Failure "Docker error: $_"
        exit 1
    }
}

function Ensure-HarborLogin {
    param([string]$Registry)
    Write-Host "Verifying Harbor Registry authentication for $Registry..." -ForegroundColor Gray
    
    # Check if credentials exist in docker config
    $dockerConfigFile = "$env:USERPROFILE\.docker\config.json"
    $hasAuth = $false
    if (Test-Path $dockerConfigFile) {
        $rawConfig = Get-Content $dockerConfigFile -Raw
        if ($rawConfig -like "*$Registry*") {
            $hasAuth = $true
        }
    }

    if (-not $hasAuth) {
        Write-Host "Harbor credentials not cached for $Registry." -ForegroundColor Yellow
        Write-Host "Please log in to Harbor below:" -ForegroundColor Yellow
        docker login $Registry
        if ($LASTEXITCODE -ne 0) {
            Write-Failure "Harbor authentication failed. Aborting."
            exit 1
        }
    }
    Write-Success "Harbor authentication confirmed."
}

# -------------------------------------------------------------
# 1. Initialization & Verification
# -------------------------------------------------------------
Write-Step "SuperApp Container Release Pre-Flight [Target: $Target, Tag: $Tag]"
Write-Host "Root Directory      : $rootDir" -ForegroundColor Gray
Write-Host "Harbor Registry     : $HarborRegistry/$HarborProject" -ForegroundColor Gray
Write-Host "Execution Policy    : Sequential (Prevents CPU/RAM thrashing & OOM)" -ForegroundColor Gray

Check-DockerStatus
if (-not $SkipPush) {
    Ensure-HarborLogin -Registry $HarborRegistry
}

$summaryResults = @()

# -------------------------------------------------------------
# 2. Build Component: Backend
# -------------------------------------------------------------
if ($Target -eq 'all' -or $Target -eq 'backend') {
    Write-Step "Component: SuperApp Backend (NestJS + TypeORM)"
    
    if (-not $SkipTests) {
        Write-Host "Running pre-flight tests & verification..." -ForegroundColor Yellow
        Push-Location $backendDir
        try {
            # Run unit tests
            Write-Host "Running Jest test suites..." -ForegroundColor Gray
            pnpm exec jest --runInBand --forceExit
            if ($LASTEXITCODE -ne 0) { throw "Backend Jest test suites failed." }
            Write-Success "All backend Jest tests passed."

            # Run TypeScript type check
            Write-Host "Verifying TypeScript compilation..." -ForegroundColor Gray
            pnpm exec tsc -p tsconfig.build.json --noEmit
            if ($LASTEXITCODE -ne 0) { throw "Backend TypeScript type-check failed." }
            Write-Success "Backend TypeScript typecheck passed."
        } finally {
            Pop-Location
        }
    }

    $imgBackend = "$HarborRegistry/$HarborProject/backend:$Tag"
    $imgBackendLatest = "$HarborRegistry/$HarborProject/backend:latest"
    $imgMigrator = "$HarborRegistry/$HarborProject/backend:migrator"

    Write-Host "Building Docker Image: $imgBackend" -ForegroundColor Yellow
    docker build --platform linux/amd64 -t $imgBackend -t $imgBackendLatest $backendDir
    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Failed to build backend Docker image."
        exit 1
    }
    Write-Success "Backend runtime image built successfully."

    Write-Host "Building Database Migrator Image: $imgMigrator" -ForegroundColor Yellow
    docker build --platform linux/amd64 --target migrator -t $imgMigrator $backendDir
    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Failed to build backend migrator image."
        exit 1
    }
    Write-Success "Backend migrator image built successfully."

    if (-not $SkipPush) {
        Write-Host "Pushing backend images to Harbor..." -ForegroundColor Yellow
        docker push $imgBackend
        if ($Tag -ne 'latest') { docker push $imgBackendLatest }
        docker push $imgMigrator
        if ($LASTEXITCODE -ne 0) {
            Write-Failure "Failed to push backend images to Harbor."
            exit 1
        }
        Write-Success "Backend images pushed to Harbor."
    }

    $summaryResults += [PSCustomObject]@{
        Component = 'Backend (API)'
        Tag = $Tag
        Pushed = (-not $SkipPush)
        Status = 'SUCCESS'
    }
    $summaryResults += [PSCustomObject]@{
        Component = 'Backend (Migrator)'
        Tag = 'migrator'
        Pushed = (-not $SkipPush)
        Status = 'SUCCESS'
    }
}

# -------------------------------------------------------------
# 3. Build Component: Manager (Backoffice)
# -------------------------------------------------------------
if ($Target -eq 'all' -or $Target -eq 'manager') {
    Write-Step "Component: SuperApp Manager / Backoffice (Next.js 16)"

    if (-not $SkipTests) {
        Write-Host "Running pre-flight backoffice type-check..." -ForegroundColor Yellow
        Push-Location $backofficeDir
        try {
            pnpm exec tsc --noEmit
            if ($LASTEXITCODE -ne 0) { throw "Backoffice TypeScript compilation failed." }
            Write-Success "Backoffice TypeScript check passed."
        } finally {
            Pop-Location
        }
    }

    $imgManager = "$HarborRegistry/$HarborProject/manager-client:$Tag"
    $imgManagerLatest = "$HarborRegistry/$HarborProject/manager-client:latest"

    Write-Host "Building Docker Image: $imgManager" -ForegroundColor Yellow
    docker build --platform linux/amd64 `
        --build-arg NEXT_PUBLIC_SOCKET_URL=https://app.fintechcenterfsa.com `
        --build-arg NEXT_PUBLIC_ENVIRONMENT=PROD `
        --build-arg NEXT_PUBLIC_NEXUS_URL=https://app.fintechcenterfsa.com/nexus `
        --build-arg NEXT_PUBLIC_MINIO_URL=https://app.fintechcenterfsa.com/api/storage `
        --build-arg NEXT_PUBLIC_JENKINS_URL=https://app.fintechcenterfsa.com/jenkins `
        --build-arg NEXT_PUBLIC_MOBILE_GIT_REPO_URL=https://git.fintechcenterfsa.com/frontend/super-app.git `
        --build-arg NEXT_PUBLIC_SUPERAPP_GIT_REPO_URL=https://git.fintechcenterfsa.com/frontend/super-app.git `
        --build-arg NEXT_PUBLIC_SUPERAPP_SANDBOX_URL=/superapp-sandbox/index.html `
        --build-arg NEXT_PUBLIC_PREVIEW_ENABLED=true `
        --build-arg NEXT_PUBLIC_PREVIEW_ALLOW_LOCALHOST=false `
        --build-arg NEXT_PUBLIC_PREVIEW_REQUIRE_HTTPS=true `
        --build-arg NEXT_PUBLIC_PREVIEW_SESSION_TIMEOUT=3600 `
        -t $imgManager -t $imgManagerLatest $backofficeDir

    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Failed to build manager-client Docker image."
        exit 1
    }
    Write-Success "Manager-client image built successfully."

    if (-not $SkipPush) {
        Write-Host "Pushing manager-client image to Harbor..." -ForegroundColor Yellow
        docker push $imgManager
        if ($Tag -ne 'latest') { docker push $imgManagerLatest }
        if ($LASTEXITCODE -ne 0) {
            Write-Failure "Failed to push manager-client image to Harbor."
            exit 1
        }
        Write-Success "Manager-client image pushed to Harbor."
    }

    $summaryResults += [PSCustomObject]@{
        Component = 'Manager (Backoffice)'
        Tag = $Tag
        Pushed = (-not $SkipPush)
        Status = 'SUCCESS'
    }
}

# -------------------------------------------------------------
# 4. Build Component: Client (Flutter Web)
# -------------------------------------------------------------
if ($Target -eq 'all' -or $Target -eq 'client') {
    Write-Step "Component: SuperApp Client (Flutter Web)"

    $imgClient = "$HarborRegistry/$HarborProject/client:$Tag"
    $imgClientLatest = "$HarborRegistry/$HarborProject/client:latest"

    # The image copies build/web from this machine: the Docker build cannot fetch
    # the private Git packages in pubspec.yaml (no credentials inside Docker).
    # Build it fresh here, with this machine's Git access, so the image never
    # ships a stale or missing build.
    # Mini app packages come from the /pub gateway (pubspec.yaml hosted url).
    # Check it first, so a gateway problem is reported as itself and not as
    # pub's "badly formatted response".
    $pubspecText = Get-Content (Join-Path $clientDir 'pubspec.yaml') -Raw
    $hosted = [regex]::Matches($pubspecText, '(?m)^\s+name:\s*([a-z0-9_]+)\s*\r?\n\s+url:\s*(https?://\S+?)/?\s*$')
    if ($hosted.Count -gt 0) {
        # Build token: this terminal's RELEASE_CALLBACK_TOKEN, else the one in
        # superapp_backend/.env.production (git-ignored). Never printed.
        $buildToken = $env:RELEASE_CALLBACK_TOKEN
        $prodEnv = Join-Path $backendDir '.env.production'
        if (-not $buildToken -and (Test-Path $prodEnv)) {
            $line = Get-Content $prodEnv | Where-Object { $_ -match '^\s*RELEASE_CALLBACK_TOKEN\s*=' } | Select-Object -Last 1
            if ($line) { $buildToken = ($line -replace '^\s*RELEASE_CALLBACK_TOKEN\s*=\s*', '').Trim().Trim('"').Trim("'") }
        }
        if ($buildToken) { $env:FSA_PUB_TOKEN = $buildToken }
        $tokenAdded = @{}
        foreach ($m in $hosted) {
            $pkg = $m.Groups[1].Value
            $gateway = $m.Groups[2].Value.TrimEnd('/')
            if ($env:FSA_PUB_TOKEN -and -not $tokenAdded[$gateway]) {
                flutter pub token add $gateway --env-var FSA_PUB_TOKEN | Out-Null
                $tokenAdded[$gateway] = $true
            }
            $auth = if ($env:FSA_PUB_TOKEN) { @('-H', "Authorization: Bearer $($env:FSA_PUB_TOKEN)") } else { @() }
            $code = & curl.exe -s -o NUL -w '%{http_code}' --max-time 30 @auth `
                -H 'Accept: application/vnd.pub.v2+json' "$gateway/api/packages/$pkg"
            $problem = switch -Regex ($code) {
                '^200$' { $null }
                '^30\d$' { "$gateway answers with a redirect (HTTP $code), the Backoffice login page. The Backoffice with the /pub route is not deployed yet: deploy the manager image first (-Target manager), then run -Target client." }
                '^(401|403)$' { "$gateway refused the login (HTTP $code). RELEASE_CALLBACK_TOKEN (terminal or superapp_backend/.env.production) must match the one the production backend runs with (developer tokens only see the SDK packages)." }
                '^404$' { "$pkg is not in the production Nexus pub-hosted repository (HTTP 404). Publish it there after its security scan." }
                default { "$gateway did not answer for $pkg (HTTP $code). Check that the backend is running." }
            }
            if ($problem) {
                Write-Failure "Mini app package $pkg cannot be fetched: $problem"
                exit 1
            }
            Write-Host "  $pkg is available from $gateway" -ForegroundColor DarkGray
        }
    }

    Write-Host "Building Flutter web (base href /preview/)..." -ForegroundColor Yellow
    Push-Location $clientDir
    try {
        flutter pub get
        if ($LASTEXITCODE -eq 0) {
            flutter build web --release `
                --base-href=/preview/ `
                --dart-define=API_BASE_URL=https://app.fintechcenterfsa.com/api
        }
    } finally {
        Pop-Location
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Flutter web build failed (see the pub or build error above: /pub packages or private Git access)."
        exit 1
    }

    Write-Host "Building Docker Image: $imgClient" -ForegroundColor Yellow
    docker build --platform linux/amd64 `
        --build-arg BASE_HREF=/preview/ `
        --build-arg API_BASE_URL=https://app.fintechcenterfsa.com/api `
        -t $imgClient -t $imgClientLatest $clientDir

    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Failed to build client Docker image."
        exit 1
    }
    Write-Success "Client (Flutter Web) image built successfully."

    if (-not $SkipPush) {
        Write-Host "Pushing client image to Harbor..." -ForegroundColor Yellow
        docker push $imgClient
        if ($Tag -ne 'latest') { docker push $imgClientLatest }
        if ($LASTEXITCODE -ne 0) {
            Write-Failure "Failed to push client image to Harbor."
            exit 1
        }
        Write-Success "Client image pushed to Harbor."
    }

    $summaryResults += [PSCustomObject]@{
        Component = 'Client (Flutter Web)'
        Tag = $Tag
        Pushed = (-not $SkipPush)
        Status = 'SUCCESS'
    }
}

# -------------------------------------------------------------
# 5. Final Release Summary
# -------------------------------------------------------------
Write-Step "Container Release Summary"
$summaryResults | Format-Table -AutoSize
Write-Host "All requested containers processed successfully." -ForegroundColor Green
