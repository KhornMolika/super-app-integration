# Backend HTTP Integration & Smoke Tests

This directory contains standalone Node.js integration verification scripts that test backend HTTP endpoints against a running backend instance (`http://localhost:3000`).

## Test Scripts

| Script | Target Endpoint / Scope | Description |
|---|---|---|
| `test-capabilities.js` | `/api/capabilities` | Verifies capability lookup, UUID vs key retrieval, and definition payloads. |
| `test-capability-proposals.js` | `/api/capability-proposals` | Verifies proposal submission, review status transitions, and audit records. |
| `test-mobile-catalog.js` | `/api/mobile/catalog` | Verifies end-user dynamic mobile catalog retrieval and query filters. |
| `test-roles.js` | `/api/access-control/roles` | Verifies RBAC role querying, organization scope, and permission assignments. |
| `test-tier1-endpoints.js` | Core Tier 1 Services | Smoke tests Tier 1 infrastructure, health checks, and basic auth routes. |
| `test-tier3-endpoints.js` | Extended Tier 3 Services | Verifies extended micro-app lifecycle and asynchronous processing endpoints. |
| `test-unified-envelope.js` | Platform Wide | Verifies `{ data, meta: { total, page, limit, hasMore } }` enterprise envelope compliance. |
| `test-version-history.js` | Mini-app versioning | Verifies version history tracking, rollback safety, and change log endpoints. |

## Running Tests

To run any script against a live or local backend:
```bash
node test/integration/test-unified-envelope.js
node test/integration/test-capabilities.js
```
