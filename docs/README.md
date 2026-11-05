# FSA SuperApp Documentation Hub

Welcome to the centralized documentation repository for the **FSA SuperApp Platform** (FinTech Center, Non-Bank Financial Services Authority).

---

## 📁 Directory Structure & Documentation Index

```text
docs/
├── architecture/                   # Architecture blueprints, ADRs, and master specifications
│   ├── SUPERAPP_MASTER_SPECIFICATION.md
│   ├── DATABASE_SCHEMA_MASTER_PLAN.md
│   ├── ADR-004-CAPABILITY-GENERATOR-AND-SDK-RUNTIME-CONTRACT.md
│   └── EVALUATION-FSA-SUPERAPP-VS-ENTERPRISE-SUPERAPPS.md
│
├── proposals/                      # RFCs and architectural proposals
│   └── STORAGE_ARCHITECTURE_PROPOSAL.md
│
├── deployment/                     # Operational guides, CI/CD, and compilation instructions
│   ├── SUPERAPP_BUILD_GUIDE.md
│   └── docker-deployment-guide.md
│
├── reports/                        # Technical audit reports and performance benchmarks
│   └── apk-size-optimization-report.md
│
└── postman/                        # Postman collections and API test environments
    ├── superapp-api.postman_collection.json
    ├── superapp-environment.postman_environment.json
    └── superapp-local-environment.postman_environment.json
```

---

## 🏛️ 1. Architecture & Specifications (`architecture/`)

- [**SUPERAPP_MASTER_SPECIFICATION.md**](./architecture/SUPERAPP_MASTER_SPECIFICATION.md)  
  *The core blueprint and technical specification of the FSA SuperApp Platform.* Covers the 5 integration methods (Flutter Package Artifact/Source, WebView, Native SDK, Deep Link), dynamic capability code generator, CI Gate 1 & Gate 2 pipelines, and security architecture.

- [**DATABASE_SCHEMA_MASTER_PLAN.md**](./architecture/DATABASE_SCHEMA_MASTER_PLAN.md)  
  *Authoritative PostgreSQL database architecture and TypeORM entity schema.* Covers RBAC permissions, audit logging, mini-app lifecycle state machines, organizations, and security gates.

- [**ADR-004: Capability Generator Flow & SDK Runtime Contract**](./architecture/ADR-004-CAPABILITY-GENERATOR-AND-SDK-RUNTIME-CONTRACT.md)  
  *Architectural Decision Record 004.* Details dynamic Android XML & iOS Info.plist permission injection, host compilation flow, runtime channel security, and the capability proposal rejection protocol.

- [**EVALUATION-FSA-SUPERAPP-VS-ENTERPRISE-SUPERAPPS.md**](./architecture/EVALUATION-FSA-SUPERAPP-VS-ENTERPRISE-SUPERAPPS.md)  
  *Comprehensive enterprise comparison.* Benchmarks the FSA SuperApp against WeChat, Alipay, Grab, Gojek, and Tata Neu across security boundaries, modular packaging, dynamic capabilities, and governance models.

---

## 💡 2. Architectural Proposals (`proposals/`)

- [**STORAGE_ARCHITECTURE_PROPOSAL.md**](./proposals/STORAGE_ARCHITECTURE_PROPOSAL.md)  
  *(SEC-OPS-2026-STORAGE-01)* Details the consolidation of MinIO storage from fragmented buckets into a single private bucket (`superapp-storage`) with a deterministic Virtual Prefix Hierarchy (`platform/`, `miniapps/`, `organizations/`, `users/`, `quarantine/`, `reports/`).

---

## 🚀 3. Deployment & Operational Guides (`deployment/`)

- [**SUPERAPP_BUILD_GUIDE.md**](./deployment/SUPERAPP_BUILD_GUIDE.md)  
  *End-to-end compilation, build, and signing guide.* Step-by-step instructions for compiling Android APKs/AABs and iOS bundles using Flutter, Fastlane, and Jenkins.

- [**docker-deployment-guide.md**](./deployment/docker-deployment-guide.md)  
  *Container infrastructure operations guide.* Covers Docker Compose service orchestration (Postgres, Nexus, MinIO, Jenkins, Backend, and Backoffice), environment variable configurations, and Harbor registry publishing.

---

## 📊 4. Reports & Performance Benchmarks (`reports/`)

- [**apk-size-optimization-report.md**](./reports/apk-size-optimization-report.md)  
  *App binary optimization analysis.* In-depth breakdown of APK size, asset stripping, dynamic feature delivery, and tree-shaking metrics.

---

## 🧪 5. API Testing & Postman (`postman/`)

- [**superapp-api.postman_collection.json**](./postman/superapp-api.postman_collection.json)  
  *Postman v3.0 API collection.* Contains 80+ pre-configured HTTP requests covering Auth, Access Control, MiniApp Lifecycle, Storage, Capabilities, and Mobile Catalog.
- [**superapp-environment.postman_environment.json**](./postman/superapp-environment.postman_environment.json)  
  *Production / Staging Postman environment variables.*
- [**superapp-local-environment.postman_environment.json**](./postman/superapp-local-environment.postman_environment.json)  
  *Local development Postman environment variables (`http://localhost:3000`).*
