# Super App Build & Harbor Release Guide

This document defines the official procedure for building, testing, and pushing the three core SuperApp container images to the Harbor registry (`registry.fintechcenterfsa.com`), running TypeORM database migrations, and executing rolling restarts on the Kubernetes cluster (`super-app` namespace).

> [!IMPORTANT]
> **Core Architectural Targets & Tag Policy**:
> - **Architecture Target**: All images **MUST** be built for `--platform linux/amd64` (Cluster worker nodes run on `x86_64/amd64`).
> - **Tag Policy**: Container tags are **always `:latest`** (`:migrator` for the database migration initContainer). Kubernetes deployments use `imagePullPolicy: Always` and automatically pull the updated `:latest` tag upon rollout.

---

## Quick Reference: Targeted Build & Push Matrix

All commands run pre-flight quality checks (Jest unit tests, TypeScript typechecks, linting) before building to guarantee zero broken images reach production.

| Component | Target Alias | Harbor Image & Tag | PowerShell Command | pnpm Shortcut (from `superapp_backend/`) |
| :--- | :--- | :--- | :--- | :--- |
| **All Components** | `all` | *All 3 images sequentially* | `.\scripts\publish-containers-to-harbor.ps1 -Target all` | `pnpm publish:containers` |
| **Backend API & Migrator** | `backend` *(or `api`)* | `super-app/backend:latest`<br>`super-app/backend:migrator` | `.\scripts\publish-containers-to-harbor.ps1 -Target backend` | `pnpm publish:backend` |
| **Backoffice Manager** | `frontend` *(or `manager`, `backoffice`)* | `super-app/manager-client:latest` | `.\scripts\publish-containers-to-harbor.ps1 -Target frontend` | `pnpm publish:frontend` |
| **Flutter Web Client** | `mobile` *(or `client`)* | `super-app/client:latest` | `.\scripts\publish-containers-to-harbor.ps1 -Target mobile` | `pnpm publish:mobile` |

---

## 1. Automated Pre-Flight Release Script (`scripts/publish-containers-to-harbor.ps1`)

The release script is located at `scripts/publish-containers-to-harbor.ps1` at the monorepo root.

### Sequential Execution Policy
Docker builds run **sequentially by default** rather than concurrently. This prevents CPU core thrashing (100% saturation) and memory exhaustion (OOM) on development machines when running SWC, Dart, and Jest compilers simultaneously. It also ensures **fail-fast safety**: if unit tests fail, the build halts immediately before wasting time building frontend images.

### Command Examples:

```powershell
# 1. Build and push ALL three containers (Sequential):
.\scripts\publish-containers-to-harbor.ps1 -Target all

# 2. Build and push ONLY Backend (NestJS runtime + DB migrator):
.\scripts\publish-containers-to-harbor.ps1 -Target backend

# 3. Build and push ONLY Backoffice Frontend (Next.js):
.\scripts\publish-containers-to-harbor.ps1 -Target frontend

# 4. Build and push ONLY Mobile Client (Flutter Web):
.\scripts\publish-containers-to-harbor.ps1 -Target mobile

# Dry Run / Test build locally without pushing to Harbor:
.\scripts\publish-containers-to-harbor.ps1 -Target backend -SkipPush

# Emergency bypass tests:
.\scripts\publish-containers-to-harbor.ps1 -Target backend -SkipTests
```

---

## 2. One-Time Harbor Registry Authentication

Before running Docker commands, ensure your local Docker daemon is authenticated with Harbor:

```bash
docker login registry.fintechcenterfsa.com
```
*Prompt: Enter your Harbor username / robot account token.*

---

## 3. Manual Docker Build & Push Fallback

If you need to run standard Docker CLI commands manually without the script:

### A. Backend API & Database Migrator
```bash
cd superapp_backend

# 1. Build & push NestJS Runtime API (port 3000)
docker build --platform linux/amd64 \
  -t registry.fintechcenterfsa.com/super-app/backend:latest \
  .
docker push registry.fintechcenterfsa.com/super-app/backend:latest

# 2. Build & push Database Migrator (Kubernetes initContainer)
docker build --platform linux/amd64 \
  --target migrator \
  -t registry.fintechcenterfsa.com/super-app/backend:migrator \
  .
docker push registry.fintechcenterfsa.com/super-app/backend:migrator
```

### B. Backoffice Manager (`super-app-manager-client`)
> [!WARNING]
> `NEXT_PUBLIC_*` variables are inlined into JavaScript assets at build time. All 11 arguments must be passed explicitly:

```bash
cd superapp_backoffice

docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_SOCKET_URL=https://app.fintechcenterfsa.com \
  --build-arg NEXT_PUBLIC_ENVIRONMENT=PROD \
  --build-arg NEXT_PUBLIC_NEXUS_URL=https://app.fintechcenterfsa.com/nexus \
  --build-arg NEXT_PUBLIC_MINIO_URL=https://app.fintechcenterfsa.com/api/storage \
  --build-arg NEXT_PUBLIC_JENKINS_URL=https://app.fintechcenterfsa.com/jenkins \
  --build-arg NEXT_PUBLIC_MOBILE_GIT_REPO_URL=https://git.fintechcenterfsa.com/frontend/super-app.git \
  --build-arg NEXT_PUBLIC_SUPERAPP_GIT_REPO_URL=https://git.fintechcenterfsa.com/frontend/super-app.git \
  --build-arg NEXT_PUBLIC_SUPERAPP_SANDBOX_URL=/superapp-sandbox/index.html \
  --build-arg NEXT_PUBLIC_PREVIEW_ENABLED=true \
  --build-arg NEXT_PUBLIC_PREVIEW_ALLOW_LOCALHOST=false \
  --build-arg NEXT_PUBLIC_PREVIEW_REQUIRE_HTTPS=true \
  --build-arg NEXT_PUBLIC_PREVIEW_SESSION_TIMEOUT=3600 \
  -t registry.fintechcenterfsa.com/super-app/manager-client:latest \
  .
docker push registry.fintechcenterfsa.com/super-app/manager-client:latest
```

### C. Flutter Web Client (`super-app-client`)
```bash
cd super-app

docker build --platform linux/amd64 \
  --build-arg BASE_HREF=/preview/ \
  --build-arg API_BASE_URL=https://app.fintechcenterfsa.com/api \
  -t registry.fintechcenterfsa.com/super-app/client:latest \
  .
docker push registry.fintechcenterfsa.com/super-app/client:latest
```

---

## 4. Kubernetes Rolling Deployment & Status Verification

Because all Kubernetes deployments specify `imagePullPolicy: Always`, triggering a rollout restart immediately pulls the newly published `:latest` and `:migrator` images:

```bash
# 1. Trigger rolling restart on Kubernetes deployments:
kubectl rollout restart deployment/super-app-backend -n super-app
kubectl rollout restart deployment/super-app-manager-client -n super-app
kubectl rollout restart deployment/super-app-client -n super-app

# 2. Monitor rollout status until healthy:
kubectl rollout status deployment/super-app-backend -n super-app
kubectl rollout status deployment/super-app-manager-client -n super-app
kubectl rollout status deployment/super-app-client -n super-app
```

---

## 5. Live Production Endpoints

| Component | Route / Endpoint | Description |
| :--- | :--- | :--- |
| **Backoffice Manager** | `https://app.fintechcenterfsa.com/` | SuperApp Backoffice Portal |
| **Backend REST & WS** | `https://app.fintechcenterfsa.com/api/` | NestJS Core Platform API |
| **Flutter Web Preview** | `https://app.fintechcenterfsa.com/preview/` | Interactive SuperApp Client |
| **Nexus Registry** | `https://app.fintechcenterfsa.com/nexus/` | Package & SDK Artifact Repository |
| **Jenkins CI/CD** | `https://app.fintechcenterfsa.com/jenkins/` | Pipeline Automation Engine (Test builds only) |
| **Harbor Registry** | `https://registry.fintechcenterfsa.com/` | Container Image Registry (`super-app` project) |
