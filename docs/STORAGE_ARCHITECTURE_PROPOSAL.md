# SuperApp MinIO Object Storage Architecture Proposal

**Document Reference**: `SEC-OPS-2026-STORAGE-01`  
**Target Environment**: Staging & Production (`app.fintechcenterfsa.com`)  
**Proposed Bucket Name**: `superapp-storage`  
**Service Account**: `super-app-svc`  
**Status**: Ready for Implementation  

---

## 1. Executive Summary & Recommended Approach

This proposal recommends consolidating the SuperApp platform's object storage from multiple fragmented buckets into **one unified, 100% private bucket named `superapp-storage`**, managed via **virtual folder prefixes** and **backend proxy access**.

### Why This Approach (Single Private Bucket with Backend Proxy)?
1. **Maximum Security (Zero Public MinIO Exposure)**:
   * The bucket has **no anonymous or public read policy**.
   * Unvetted source code (`quarantine/`) and sensitive customer data (`users/`) are physically impossible to scrape or download from the internet.
2. **Built-in Backend Proxy & Caching**:
   * Public assets (app icons, hero banners) are served through the NestJS backend streaming proxy (`/api/storage/asset`, `/api/logos/...`).
   * The backend validates file paths, strips directory traversals (`../`), and attaches standard HTTP cache headers (`Cache-Control: public, max-age=86400, immutable`).
3. **Zero Maintenance Burden for DevOps**:
   * DevOps only needs to manage and monitor **one bucket** rather than provisioning separate buckets every time a new feature is launched.
   * MinIO creates virtual subfolders on-the-fly when files are uploaded; no manual folder creation is needed.

---

## 2. Action Required by MinIO Administrator

The MinIO administrator only needs to perform **two simple steps**:

### Step 1: Create the Bucket
* **Bucket Name**: `superapp-storage`
* **Access Policy**: **Private** (Disable anonymous public read)
* **Versioning**: Optional (Recommended: Enabled or Object Locking off)

### Step 2: Attach IAM Policy to User `super-app-svc`
Attach the following standard IAM policy to the existing service user **`super-app-svc`**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SuperAppBackendFullAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::superapp-storage",
        "arn:aws:s3:::superapp-storage/*"
      ]
    }
  ]
}
```

> **Note**: The administrator does **not** need to create any subfolders. The backend application automatically creates and manages all prefixes as objects are uploaded.

---

## 3. Directory Layout & Virtual Prefix Hierarchy

Inside `superapp-storage`, all files are automatically partitioned into distinct, collision-free prefixes:

```text
superapp-storage/
│
├── platform/                               <-- Host SuperApp Core Shell Media
│   ├── branding/                           <-- Header logo, launcher icon, splash graphic
│   └── banners/                            <-- Mobile Home screen hero carousel banners
│
├── miniapps/                               <-- Third-Party MiniApp Public Assets
│   ├── {miniAppId}/logos/                  <-- App store logos (logo.png)
│   ├── {miniAppId}/screenshots/            <-- Marketplace preview screenshots
│   └── {miniAppId}/legal/                  <-- Custom Terms of Service & Privacy Policy PDFs
│
├── organizations/                          <-- Partner & Vendor Media
│   └── {orgId}/branding/                   <-- Partner bank/company logos
│
├── users/                                  <-- User Profiles
│   ├── backoffice/{userId}/                <-- Admin / Reviewer avatars (internal)
│   └── end-users/{endUserId}/              <-- Mobile consumer avatars (JWT-token protected)
│
├── quarantine/                             <-- Strictly Private Pre-Ingestion Quarantine
│   ├── packages/{miniAppId}/{version}/     <-- Unvetted Flutter package .zip uploads
│   └── sdks/{miniAppId}/{version}/         <-- Unvetted Native Android .aar / iOS .xcframework
│
└── reports/                                <-- Automated Security & Audit Outputs
    └── security/{miniAppId}/{version}/     <-- Jenkins CycloneDX SBOM, Semgrep & Trivy scan JSONs
```

### Explanations of Key Folders

| Prefix | Content | Access Control & Security |
| :--- | :--- | :--- |
| `platform/` | SuperApp core shell logo, app icon, home hero banners | **Public Read** via Backend Proxy (`/api/platform/...`) |
| `miniapps/` | MiniApp logos, promotional banners, legal PDFs | **Public Read** via Backend Proxy (`/api/logos/...`, `/api/legal/...`) |
| `organizations/` | Partner bank and fintech company logos | **Public Read** via Backend Proxy (`/api/organizations/.../logo`) |
| `users/` | Backoffice staff & mobile consumer avatars | 🔒 **Protected**: Backoffice avatars served via `/api/backoffice-user-media/`; Consumer avatars require mobile JWT Bearer token |
| `quarantine/` | Raw Flutter `.zip` packages & native SDK binaries | 🔒 **Strict Quarantine**: Internal backend & Jenkins pipeline only. Never accessible by end users |
| `reports/` | Automated validation artifacts (SBOM, SAST, CVEs) | 🔒 **Audit Only**: Accessible only by security reviewers in BackOffice |

---

## 4. Backend Environment Variable Mapping

Once `superapp-storage` is provisioned, the backend configuration (`.env.production`) will be set as follows:

```ini
# MinIO Object Storage Configuration
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=super-***-***
MINIO_SECRET_KEY=*************

# Consolidated Bucket Configuration
MINIO_BUCKET_NAME=superapp-storage
MINIO_PACKAGE_SUBMISSIONS_BUCKET=superapp-storage
MINIO_SDK_SUBMISSIONS_BUCKET=superapp-storage
MINIO_END_USER_MEDIA_BUCKET=superapp-storage
MINIO_BACKOFFICE_USER_MEDIA_BUCKET=superapp-storage
```

---

## 5. Artifact Storage Note (Nexus vs MinIO)

* **Compiled SuperApp APK Containers** (`superapp-test-v1.0.5.apk` & production APKs) and published packages are hosted in **Sonatype Nexus** (`apk-test-builds`, `apk-releases`, `pub-hosted`, `maven-sdk-hosted`).
* MinIO is dedicated solely to application assets, pre-ingestion quarantine, user media, and security audit reports.

