# Super App Build & Harbor Release Guide

This document defines the official procedure for building and pushing the three core Super App container images to Harbor registry (`registry.fintechcenterfsa.com`), running TypeORM database migrations, and executing rolling restarts on the Kubernetes cluster (`super-app` namespace).

> [!IMPORTANT]
> **Architecture Target**: All images **MUST** be built for `--platform linux/amd64`. Cluster worker nodes run on `x86_64/amd64` architecture.

---

## 0. One-Time Harbor Registry Authentication

Before building and pushing images, authenticate Docker against the private Harbor registry:

```bash
docker login registry.fintechcenterfsa.com
```
*Prompt: Enter your Harbor username/robot-account secret.*

---

## 1. `super-app-backend` (NestJS API & Database Migrator)

The backend `Dockerfile` uses multi-stage targets to produce two distinct artifacts:
1. **Runtime API Image (`runner`)**: Serves HTTP & WebSocket traffic on port 3000.
2. **Database Migrator Image (`migrator`)**: Used as a Kubernetes `initContainer` to execute `typeorm migration:run` before the main application starts. Both images must be updated in lockstep.

### Build & Push Commands:

```bash
# Navigate to the backend directory
cd superapp_backend

# 1. Build and push the main runtime API image
docker build --platform linux/amd64 \
  -t registry.fintechcenterfsa.com/super-app/backend:latest \
  .
docker push registry.fintechcenterfsa.com/super-app/backend:latest

# 2. Build and push the database migrator initContainer image
docker build --platform linux/amd64 \
  --target migrator \
  -t registry.fintechcenterfsa.com/super-app/backend:migrator \
  .
docker push registry.fintechcenterfsa.com/super-app/backend:migrator
```

---

## 2. `super-app-manager-client` (Next.js Backoffice Manager)

> [!WARNING]
> `NEXT_PUBLIC_*` environment variables are **inlined into the JavaScript bundle at build time**. Changing them in a Kubernetes ConfigMap will have **no effect** without rebuilding the image. All build arguments must be explicitly provided.

### Build & Push Commands:

```bash
# Navigate to the backoffice directory
cd superapp_backoffice

# Build and push the Next.js standalone container
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

---

## 3. `super-app-client` (Flutter Web Preview)

The Flutter SuperApp web release is hosted under the path prefix `/preview/` on the main domain.
- `BASE_HREF` **must** be `/preview/`.
- `API_BASE_URL` is baked into the compiled Dart web assembly.

### Build & Push Commands:

```bash
# Navigate to the Flutter mobile / client directory
cd super-app

# Build and push the Flutter Web container
docker build --platform linux/amd64 \
  --build-arg BASE_HREF=/preview/ \
  --build-arg API_BASE_URL=https://app.fintechcenterfsa.com/api \
  -t registry.fintechcenterfsa.com/super-app/client:latest \
  .
docker push registry.fintechcenterfsa.com/super-app/client:latest
```

---

## 4. Kubernetes Rolling Deployment & Status Verification

Since all Kubernetes deployments are configured with `imagePullPolicy: Always`, restarting the deployments will immediately pull the new `:latest` and `:migrator` tags:

```bash
# 1. Trigger rolling restart across all three deployments
kubectl rollout restart deployment/super-app-backend -n super-app
kubectl rollout restart deployment/super-app-manager-client -n super-app
kubectl rollout restart deployment/super-app-client -n super-app

# 2. Monitor rollout status until complete
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
| **Flutter Web Preview**| `https://app.fintechcenterfsa.com/preview/` | Interactive SuperApp Client |
| **Nexus Registry** | `https://app.fintechcenterfsa.com/nexus/` | Package & SDK Artifact Repository |
| **Jenkins CI/CD** | `https://app.fintechcenterfsa.com/jenkins/` | Pipeline Automation Engine |
