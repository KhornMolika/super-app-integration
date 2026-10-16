---
name: nestjs-standards
description: >-
  Provides architectural guidelines, file placement rules (Service vs Util vs Helper vs Decorator),
  TypeORM transaction & query patterns, REST API conventions, environment validation, security hardening, and testing for NestJS.
---

# NestJS & TypeORM Architecture Standards

Use this skill whenever scaffolding, building, or refactoring features in a NestJS application using TypeORM and REST APIs.

---

## 1. Quick File Placement Decision Matrix

| Requirement | Primitive | Path | Rule |
| :--- | :--- | :--- | :--- |
| **Needs DI, DB, Config, or I/O** | **Service** (@Injectable()) | src/modules/<feat>/<feat>.service.ts | Never query DB or access Config in static helpers/utils. |
| **Pure function** (no DB, no side-effects) | **Util** | src/common/utils/<name>.util.ts | Deterministic: same inputs $\to$ same output. |
| **Domain-specific formula** (no DI needed) | **Helper** | src/modules/<feat>/helpers/<name>.helper.ts | Keep scoped to the module that uses it. |
| **Extract data from Request** (eq.user) | **Param Decorator** | src/common/decorators/<name>.decorator.ts | Use @CurrentUser(), not eq.user in controller. |
| **Validate or cast parameters** | **Pipe** | src/common/pipes/<name>.pipe.ts | Validate route/query args. |
| **Format responses or calculate timing** | **Interceptor** | src/common/interceptors/<name>.interceptor.ts | Global TransformInterceptor wraps { success: true, data }. |
| **Catch and format errors** | **Exception Filter** | src/common/filters/<name>.filter.ts | Catch unhandled errors uniformly. |

> **Service as Orchestrator**: The Service coordinates transactions, queries, DI, and workflow.
> **Extract into helpers/** when:
> 1. Service exceeds **400–600 lines** or $>3$ domain workflows (e.g. order-lifecycle.helper.ts).
> 2. Pure business math (pricing, taxes, commissions, diffs).
> 3. Deep regex/parsing (barcode formatting, token extraction).
> 4. Low-level probes (SSRF IP checks, DNS, crypto keys).
> 5. Zero-mock unit testing (*.helper.spec.ts without mocking NestJS DI or TypeORM).

---

## 2. TypeORM Rules

1. **Entity Base**: Extend BaseEntity (id as UUID, createdAt, updatedAt, optional deletedAt).
2. **Naming**: Database columns are snake_case in SQL (@Column({ name: 'order_status' })), properties are camelCase in TypeScript (orderStatus).
3. **Transactions**: Multi-table or multi-entity writes **must** use 	his.dataSource.transaction(async (manager) => { ... }).
4. **No N+1 Queries**: Never query the database inside loops. Use .leftJoinAndSelect() or elations: { ... }.
5. **No synchronize: true in Production**: Use TypeORM migrations (pnpm migration:run).

---

## 3. REST API & Validation Rules

1. **Resource URIs**: Plural nouns (e.g., /api/v1/orders, /api/v1/customer-orders).
2. **Status Codes**: POST $\to$ 201, GET $\to$ 200, PATCH/PUT $\to$ 200, DELETE $\to$ 204.
3. **Validation**: Every payload must have a DTO validated with class-validator and ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }).

---

## 4. Configuration, Security & Observability

1. **Environment Validation**: Always validate ConfigModule on startup with Joi/Zod to prevent boots with missing secrets.
2. **Security Hardening**: Always enable pp.use(helmet()), configure explicit CORS, and protect sensitive routes with @nestjs/throttler.
3. **Health Probes**: Implement liveness & readiness checks via @nestjs/terminus (TypeOrmHealthIndicator).
4. **Graceful Teardown**: Always invoke pp.enableShutdownHooks() in main.ts.

---

## 5. In-Depth Reference Guides

When needed, inspect the complete implementation guides located inside this skill package:
* [01. Folder Structure & Modularity](./references/01-folder-structure-and-modularity.md)
* [02. TypeORM Best Practices](./references/02-typeorm-guidelines.md)
* [03. REST API Conventions](./references/03-rest-api-conventions.md)
* [04. Cross-Cutting Concerns](./references/04-cross-cutting-concerns.md)
* [05. Config Validation & Security](./references/05-config-validation-and-security.md)
* [06. Testing Strategies & Observability](./references/06-testing-and-observability.md)
