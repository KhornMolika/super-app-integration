<#
==============================================================================
 Multi-Remote Git Push Automation Script for Super App (PowerShell)
==============================================================================
 Automates: git add ., commit with message, Monorepo push, Frontend subtree (fintech), and Backend subtree (fintech-backend).
==============================================================================
#>

[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$SourceBranch,

    [Parameter(Position=1)]
    [string]$TargetBranch,

    [Parameter(Position=2)]
    [string]$RemoteOption,

    [Parameter(Position=3)]
    [string]$CommitMessage
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " Super App - Multi-Remote Push Automation" -ForegroundColor Cyan
Write-Host "======================================================`n" -ForegroundColor Cyan

# Check if inside git root
$null = git rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Not inside a Git repository!" -ForegroundColor Red
    exit 1
}

$currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()

# ==============================================================================
# 1. Check for Uncommitted Changes & Prompt to Commit (git add . && git commit)
# ==============================================================================
$statusChanges = git status --porcelain
if ($statusChanges) {
    Write-Host "Uncommitted changes detected:" -ForegroundColor Yellow
    git status --short
    Write-Host ""

    if (-not $CommitMessage) {
        $CommitMessage = Read-Host "Enter commit message (or leave blank to skip commit)"
    }

    if (-not [string]::IsNullOrWhiteSpace($CommitMessage)) {
        Write-Host "`n-> Running: git add ." -ForegroundColor Cyan
        git add .
        Write-Host "-> Running: git commit -m `"$CommitMessage`"" -ForegroundColor Cyan
        git commit -m "$CommitMessage"
        Write-Host "[OK] Changes staged and committed successfully!`n" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Skipping commit. Proceeding with existing commits...`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] Working directory clean (no uncommitted changes).`n" -ForegroundColor Green
}

# ==============================================================================
# 2. Select Source Branch
# ==============================================================================
$localBranches = (git for-each-ref --format="%(refname:short)" refs/heads/) | Where-Object { $_ -ne "" }

if (-not $localBranches) {
    Write-Host "[ERROR] No local branches found!" -ForegroundColor Red
    exit 1
}

if (-not $SourceBranch) {
    Write-Host "Select the local branch you want to push:" -ForegroundColor White
    $currentIndex = 1
    for ($i = 0; $i -lt $localBranches.Count; $i++) {
        $bName = $localBranches[$i]
        $num = $i + 1
        if ($bName -eq $currentBranch) {
            Write-Host "  [$num] $bName (current)" -ForegroundColor Cyan
            $currentIndex = $num
        } else {
            Write-Host "  [$num] $bName"
        }
    }

    $inputChoice = Read-Host "Enter number [Default: $currentIndex ($currentBranch)]"
    if ([string]::IsNullOrWhiteSpace($inputChoice)) {
        $inputChoice = $currentIndex
    }

    if ($inputChoice -as [int] -and [int]$inputChoice -ge 1 -and [int]$inputChoice -le $localBranches.Count) {
        $SourceBranch = $localBranches[[int]$inputChoice - 1]
    } elseif ($localBranches -contains $inputChoice) {
        $SourceBranch = $inputChoice
    } else {
        Write-Host "[WARN] Invalid selection. Defaulting to current branch: $currentBranch" -ForegroundColor Yellow
        $SourceBranch = $currentBranch
    }
}

Write-Host "`n[OK] Selected source branch: $SourceBranch" -ForegroundColor Green

# ==============================================================================
# 3. Select Target Branch on Remotes (Numbered Menu to Prevent Mis-typing)
# ==============================================================================
if (-not $TargetBranch) {
    Write-Host "Select target remote branch:" -ForegroundColor White
    Write-Host "  [1] Same as source branch ($SourceBranch) [Default]" -ForegroundColor Cyan
    Write-Host "  [2] development"
    Write-Host "  [3] main"
    Write-Host "  [4] Custom branch name"
    
    $tChoice = Read-Host "Enter choice [Default: 1 ($SourceBranch)]"
    if ([string]::IsNullOrWhiteSpace($tChoice)) {
        $tChoice = "1"
    }

    switch ($tChoice) {
        "1" { $TargetBranch = $SourceBranch }
        "2" { $TargetBranch = "development" }
        "3" { $TargetBranch = "main" }
        "4" {
            $custom = Read-Host "Enter custom target branch name"
            if ([string]::IsNullOrWhiteSpace($custom)) {
                $TargetBranch = $SourceBranch
            } else {
                $TargetBranch = $custom
            }
        }
        Default {
            if ($tChoice -eq $SourceBranch -or $tChoice -eq "development" -or $tChoice -eq "main") {
                $TargetBranch = $tChoice
            } else {
                $TargetBranch = $SourceBranch
            }
        }
    }
}

Write-Host "[OK] Target branch on remotes: $TargetBranch`n" -ForegroundColor Green

# ==============================================================================
# 4. Select Remotes
# ==============================================================================
if (-not $RemoteOption) {
    Write-Host "Select destination remote(s):" -ForegroundColor White
    Write-Host "  [1] All Remotes (origin + fintech + fintech-backend) [Recommended]" -ForegroundColor Cyan
    Write-Host "  [2] GitLab Both (fintech Frontend + fintech-backend Backend)"
    Write-Host "  [3] GitLab Frontend only (fintech -> super-app-manager.git)"
    Write-Host "  [4] GitLab Backend only (fintech-backend -> super-app.git)"
    Write-Host "  [5] GitHub Monorepo only (origin -> super-app-integration.git)"
    
    $userRemote = Read-Host "Enter choice [Default: 1]"
    if ([string]::IsNullOrWhiteSpace($userRemote)) {
        $RemoteOption = "1"
    } else {
        $RemoteOption = $userRemote
    }
}

# Summary confirmation
Write-Host "`n------------------------------------------------------" -ForegroundColor Yellow
Write-Host " Push Summary:" -ForegroundColor Yellow
Write-Host "  - Source Branch:   $SourceBranch" -ForegroundColor Cyan
Write-Host "  - Target Branch:   $TargetBranch" -ForegroundColor Cyan
switch ($RemoteOption) {
    "1" { Write-Host "  - Destinations:    origin (Monorepo), fintech (Frontend), fintech-backend (Backend)" -ForegroundColor Green }
    "2" { Write-Host "  - Destinations:    fintech (Frontend), fintech-backend (Backend)" -ForegroundColor Green }
    "3" { Write-Host "  - Destinations:    fintech (Frontend)" -ForegroundColor Green }
    "4" { Write-Host "  - Destinations:    fintech-backend (Backend)" -ForegroundColor Green }
    "5" { Write-Host "  - Destinations:    origin (Monorepo)" -ForegroundColor Green }
    Default { Write-Host "[ERROR] Invalid remote choice!" -ForegroundColor Red; exit 1 }
}
Write-Host "------------------------------------------------------`n" -ForegroundColor Yellow

$confirm = Read-Host "Proceed with push? [Y/n]"
if ($confirm -match "^[nN]") {
    Write-Host "Push cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

function Push-ToOrigin {
    Write-Host "[1/3] Pushing Monorepo to origin ($TargetBranch)..." -ForegroundColor Blue
    git push origin ("{0}:{1}" -f $SourceBranch, $TargetBranch)
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Monorepo successfully pushed to origin/$TargetBranch!`n" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to push to origin/$TargetBranch.`n" -ForegroundColor Red
    }
}

function Push-ToFintech {
    Write-Host "[2/3] Splitting and Pushing superapp_backoffice to fintech ($TargetBranch)..." -ForegroundColor Blue
    Write-Host "  -> Computing subtree split for superapp_backoffice..." -ForegroundColor Cyan
    $splitCommit = (git subtree split --prefix=superapp_backoffice "$SourceBranch").Trim()
    if (-not $splitCommit) {
        Write-Host "[ERROR] Subtree split failed for superapp_backoffice!`n" -ForegroundColor Red
        return
    }
    Write-Host "  -> Split commit: $splitCommit" -ForegroundColor Cyan
    git push fintech ("{0}:{1}" -f $splitCommit, $TargetBranch)
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Frontend successfully pushed to fintech/$TargetBranch!`n" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to push to fintech/$TargetBranch.`n" -ForegroundColor Red
    }
}

function Push-ToFintechBackend {
    Write-Host "[3/3] Splitting and Pushing superapp_backend to fintech-backend ($TargetBranch)..." -ForegroundColor Blue
    Write-Host "  -> Computing subtree split for superapp_backend..." -ForegroundColor Cyan
    $splitCommit = (git subtree split --prefix=superapp_backend "$SourceBranch").Trim()
    if (-not $splitCommit) {
        Write-Host "[ERROR] Subtree split failed for superapp_backend!`n" -ForegroundColor Red
        return
    }
    Write-Host "  -> Split commit: $splitCommit" -ForegroundColor Cyan
    git push fintech-backend ("{0}:{1}" -f $splitCommit, $TargetBranch)
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Backend successfully pushed to fintech-backend/$TargetBranch!`n" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to push to fintech-backend/$TargetBranch.`n" -ForegroundColor Red
    }
}

switch ($RemoteOption) {
    "1" {
        Push-ToOrigin
        Push-ToFintech
        Push-ToFintechBackend
    }
    "2" {
        Push-ToFintech
        Push-ToFintechBackend
    }
    "3" {
        Push-ToFintech
    }
    "4" {
        Push-ToFintechBackend
    }
    "5" {
        Push-ToOrigin
    }
}

Write-Host "======================================================" -ForegroundColor Green
Write-Host " All selected operations completed!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
