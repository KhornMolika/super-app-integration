# Super App Infrastructure - Server Deployment & Setup Guide

This guide details how to deploy and configure the entire Super App backend infrastructure stack using Docker Compose without needing any custom Dockerfiles or external setup scripts.

---

## 1. System Architecture & Stack Overview

The infrastructure stack runs 8 core services managed under a single unified bridge network (`ci_network`):

| Service | Container Name | Port(s) | Description |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 15** | `superapp-postgres` | `5432` | Core database for users, mini-apps, metadata, and proposals |
| **Nexus 3** | `superapp-nexus` | `8081` | Hosted registry for Flutter Pub, Maven, CocoaPods, & Raw SDKs |
| **MinIO AIStor** | `superapp-minio` | `9000` (API), `9001` (Console) | S3-compatible object storage for package uploads & logos |
| **MinIO Init** | `superapp-minio-init` | *(Ephemeral)* | Auto-creates `mini-app-logos` (public) & `submissions` (quarantine) buckets |
| **Jenkins Controller** | `superapp-jenkins-controller` | `8085` (UI), `50000` (Agent) | CI/CD build engine with automated `pnpm`, `Node.js`, and `jq` |
| **Docker-in-Docker** | `superapp-jenkins-docker-dind`| `2376` | Privileged container engine for isolated CI builds |
| **OWASP ZAP** | `superapp-zap` | `8090` | Dynamic Application Security Testing (DAST) web scanner |
| **testssl.sh** | `superapp-testssl` | *(CLI Engine)* | Automated TLS/SSL security cipher verification |
| **Nuclei** | `superapp-nuclei` | *(CLI Engine)* | Template-based vulnerability, secret leak, and CVE scanner |

---

## 2. Prerequisites on the Host Server

1. **Operating System**: Ubuntu 22.04 LTS / Debian 12 / RHEL 9 (or similar Linux distribution).
2. **Docker Engine**: Docker 24.0+ and Docker Compose v2.20+.
   ```bash
   docker --version
   docker compose version
   ```
3. **Firewall / Security Group Ports**:
   - Inbound: `5432` (DB), `8081` (Nexus), `9000` (MinIO API), `9001` (MinIO Console), `8085` (Jenkins), `8090` (ZAP).

---

## 3. Deployment Directory Structure

Create a deployment folder on your server (e.g. `/opt/superapp-infrastructure`) containing only these two files:

```text
/opt/superapp-infrastructure/
├── docker-compose.yml
└── .env.docker
```

---

## 4. Configuration Files

### A. `.env.docker`
Create `.env.docker` with your server's credentials:

```dotenv
# --- PostgreSQL Database ---
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=dps_db
POSTGRES_PORT=5432

# --- Sonatype Nexus 3 ---
NEXUS_PORT=8081

# --- MinIO (S3 Object Storage) ---
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=admin123
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_IMAGE=quay.io/minio/aistor/minio:RELEASE.2026-09-07T08-39-31Z
MINIO_SUBNET_LICENSE=eyJhbGciOiJFUzM4NCIsInR5cCI6IkpXVCJ9...
```

### B. `docker-compose.yml`
Ensure `docker-compose.yml` is present in the same directory.

---

## 5. Step-by-Step Deployment

### Step 1: Start the Infrastructure
From the deployment directory, run:

```bash
docker compose --env-file .env.docker up -d
```

### Step 2: Verify Running Containers
Check that all containers are running:

```bash
docker compose ps
```

*Expected output: All 7 long-running containers in state `Up` and `superapp-minio-init` in state `Exited (0)`.*

### Step 3: Monitor Logs
```bash
docker compose logs -f
```

---

## 6. Post-Deployment Service Setup

### 1. Sonatype Nexus 3 (`http://<SERVER_IP>:8081`)
1. Obtain the initial admin password:
   ```bash
   docker exec -it superapp-nexus cat /nexus-data/admin.password
   ```
2. Log in at `http://<SERVER_IP>:8081` using username `admin` and the retrieved password.
3. Complete the setup wizard, set your new password (e.g., `admin123`), and enable anonymous access if desired.

### 2. MinIO S3 Object Storage (`http://<SERVER_IP>:9001`)
1. Navigate to `http://<SERVER_IP>:9001`.
2. Log in with `admin` / `admin123`.
3. Under **Buckets**, verify that the following buckets were auto-created:
   - `mini-app-logos` (Access Policy: `Public / Read-Only`)
   - `submissions` (Access Policy: `Private`)

### 3. Jenkins Controller (`http://<SERVER_IP>:8085`)
1. Retrieve the initial setup password:
   ```bash
   docker exec -it superapp-jenkins-controller cat /var/jenkins_home/secrets/initialAdminPassword
   ```
2. Open `http://<SERVER_IP>:8085` in your browser.
3. Paste the password and select **"Install suggested plugins"**.
4. Create your administrator user and configure an API Token:
   - Click `admin (top right) -> Configure -> API Token -> Add new Token`.
   - Save this token for the backend's `JENKINS_API_TOKEN` environment variable.

---

## 7. Connecting `superapp_backend` to Docker Services

When running the backend application on the server, configure its `.env` with the following connection endpoints:

```dotenv
# Database
DB_HOST=localhost       # (or 'postgres' if backend is also dockerized)
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=admin123
DB_DATABASE=dps_db

# Nexus Registry
NEXUS_BASE_URL=http://localhost:8081
NEXUS_ADMIN_USER=admin
NEXUS_ADMIN_PASSWORD=admin123

# MinIO / Object Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=admin123
MINIO_BUCKET_NAME=mini-app-assets
MINIO_PACKAGE_SUBMISSIONS_BUCKET=submissions

# Jenkins Orchestration
JENKINS_URL=http://localhost:8085
JENKINS_USER=admin
JENKINS_API_TOKEN=your_jenkins_api_token
```

---

## 8. Useful Maintenance Commands

| Action | Command |
| :--- | :--- |
| **Stop Stack** | `docker compose --env-file .env.docker stop` |
| **Restart Stack** | `docker compose --env-file .env.docker restart` |
| **Tear Down Stack** | `docker compose --env-file .env.docker down` |
| **Tear Down & Delete Volumes** | `docker compose --env-file .env.docker down -v` *(⚠️ Destroys DB & Storage Data)* |
| **View Service Specific Logs** | `docker compose logs -f superapp-jenkins-controller` |
| **Check Resource Usage** | `docker stats` |
