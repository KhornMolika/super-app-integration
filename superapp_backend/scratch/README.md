# SuperApp Backend Scratchpad (`scratch/`)

This directory is designated for local developer scratchpads, one-off database migration/patch artifacts, and diagnostic inspection scripts. These scripts are **not** executed during automated CI/CD builds or standard backend startup.

## Files

| File | Purpose |
| :--- | :--- |
| `count-table-records.mjs` | Diagnostic query to count total row counts across all 20 tables in `dps_db`. |
| `inspect-db.mjs` | Fast terminal dump of users, organizations, and mini app records. |
| `inspect-capabilities.mjs` | Dumps current capability definitions and metadata JSON from PostgreSQL. |
| `inspect-mock-records.mjs` | Queries any remaining mock mini apps and capability proposals. |
| `verify-schema.mjs` | Verifies database tables, column types, and checks that deprecated tables (`user_roles`, `miniapp_activities`) are absent. |
| `verify-seed-and-bootstrap.mjs` | Validates seeded organizations, roles, official users, and scrypt password hashes. |
| `apply-seed.mjs` | One-off historical patch that synchronized official user accounts, roles, and password hashes. |
| `migrate-to-master-schema.mjs` | One-off historical DDL migration script executed prior to TypeORM entity harmonization. |
