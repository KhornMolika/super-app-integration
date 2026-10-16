# 01. Folder Structure & Modularity Guidelines

This document outlines the standard NestJS project structure and provides clear rules on **where code belongs** — specifically clarifying when to create a **Service**, **Util**, **Helper**, **Pipe**, **Interceptor**, or **Decorator**.

---

## 1. High-Level Project Directory Structure

```text
src/
├── common/                  # Reusable, domain-agnostic shared primitives
│   ├── constants/           # Global enums, injection tokens, regexes
│   ├── decorators/          # Custom parameter & method decorators
│   ├── dto/                 # Shared generic DTOs (e.g., PaginationDto)
│   ├── filters/             # Global exception filters
│   ├── guards/              # Global auth/role guards
│   ├── interceptors/        # Global logging, transform interceptors
│   ├── pipes/               # Custom validation/parse pipes
│   └── utils/               # Pure, stateless utility functions
│
├── core/                    # App-wide singleton infrastructure (imported once in AppModule)
│   ├── config/              # Environment config validation (Zod/Joi)
│   ├── database/            # TypeORM DataSource & migrations setup
│   └── logger/              # Custom logger implementation (Pino/Winston)
│
├── modules/                 # Business domain feature modules
│   ├── auth/                # Authentication & authorization module
│   ├── users/               # Users feature module
│   └── orders/              # Orders feature module
│       ├── dto/             # create-order.dto.ts, update-order.dto.ts, order-query.dto.ts
│       ├── entities/        # order.entity.ts, order-item.entity.ts
│       ├── enums/           # order-status.enum.ts
│       ├── helpers/         # Domain-specific helpers (e.g., order-calculation.helper.ts)
│       ├── orders.controller.ts
│       ├── orders.service.ts
│       ├── orders.repository.ts (optional custom repo / query builder)
│       ├── orders.module.ts
│       └── orders.service.spec.ts
│
├── app.module.ts            # Root module
└── main.ts                  # Entry point bootstrapping the application
```

---

## 2. Decision Matrix: Where Does Your Code Belong?

Use this decision table before creating a new file or function:

| Needs / Characteristics | Correct NestJS Primitive | File Location | Example |
| :--- | :--- | :--- | :--- |
| **Needs Dependency Injection** (Database repo, ConfigService, HTTP client, Cache, Logger) | **Injectable Service** (`@Injectable()`) | `src/modules/<feat>/<feat>.service.ts` | `OrdersService`, `EmailService` |
| **100% Pure function**, no I/O, no DB, domain-agnostic, deterministic (input in $\to$ output out) | **Utility Function (`util`)** | `src/common/utils/<name>.util.ts` | `slugify()`, `formatDate()`, `roundCurrency()` |
| **Domain-specific logic**, no DI needed, but specific to one business domain | **Feature Helper (`helper`)** | `src/modules/<feat>/helpers/<name>.helper.ts` | `calculateOrderTax(items, discount)` |
| **Extract data from Request** (e.g., extract logged-in user, tenant ID, user-agent) | **Param Decorator** (`createParamDecorator`) | `src/common/decorators/<name>.decorator.ts` | `@CurrentUser()`, `@IpAddress()` |
| **Validate or transform incoming controller arguments** (e.g., UUID format, file upload size) | **Pipe** (`PipeTransform`) | `src/common/pipes/<name>.pipe.ts` | `ParseUUIDPipe`, `ParseFilePipe` |
| **Format outgoing responses or calculate execution time** | **Interceptor** (`NestInterceptor`) | `src/common/interceptors/<name>.interceptor.ts` | `TransformInterceptor`, `LoggingInterceptor` |
| **Catch and format errors into standard HTTP responses** | **Exception Filter** (`ExceptionFilter`) | `src/common/filters/<name>.filter.ts` | `HttpExceptionFilter` |

---

## 3. Detailed Rules: Service vs. Util vs. Helper

### A. Utility (`.util.ts`)
* **Definition**: Completely pure, stateless functions that could theoretically be published to an npm utility library.
* **Characteristics**:
  * ❌ **NEVER** import or inject TypeORM repositories, services, or config.
  * ❌ **NEVER** perform I/O (no `fetch()`, no DB queries, no file reads).
  * ✅ Always deterministic: calling `fn(a, b)` with identical arguments always produces identical output.
* **Example**:
  ```typescript
  // src/common/utils/string.util.ts
  export function toSnakeCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }
  ```

---

### B. Helper (`.helper.ts`)
* **Definition**: Functions that contain domain/business formulas or complex query building, but **do not require Dependency Injection**.
* **Why not a service?** If a calculation is pure math or object assembly, wrapping it in an injectable class adds unnecessary DI overhead and makes unit testing harder than testing a simple function.
* **Rule**:
  * If it's used only within one module, keep it in `src/modules/<feature>/helpers/`.
  * If multiple modules need it, evaluate if it belongs in a shared feature module or domain helper.
* **Example**:
  ```typescript
  // src/modules/orders/helpers/order-pricing.helper.ts
  import { OrderItemEntity } from '../entities/order-item.entity';

  export interface PricingSummary {
    subtotal: number;
    tax: number;
    total: number;
  }

  export function calculateOrderPricing(
    items: OrderItemEntity[],
    taxRate: number,
  ): PricingSummary {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const tax = Math.round(subtotal * taxRate);
    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }
  ```

---

### C. Service (`.service.ts`)
* **Definition**: An `@Injectable()` class registered in the `providers` array of a NestJS module.
* **When to use**:
  * Reading or writing to the database (TypeORM repositories).
  * Accessing environment variables (`ConfigService`).
  * Calling external APIs or 3rd-party SDKs (Stripe, Cloudinary, AWS S3, Telegram).
  * Managing lifecycle hooks (`onModuleInit`, `onApplicationShutdown`).
* **Example Anti-Pattern to Avoid**:
  ```typescript
  // ❌ ANTI-PATTERN: Never access DB or config inside a static helper!
  export class OrderHelper {
    static async saveOrder(data: any) {
      // BAD: Direct global DataSource access breaks DI, testing, and scoping!
      return await AppDataSource.getRepository(Order).save(data);
    }
  }

  // ✅ CORRECT: Inject Repository into an Injectable Service
  @Injectable()
  export class OrdersService {
    constructor(
      @InjectRepository(OrderEntity)
      private readonly orderRepository: Repository<OrderEntity>,
    ) {}
  }
  ```

---

### D. The Service as an Orchestrator & When to Extract Helpers

In NestJS, a **Service** must strictly function as a clean **orchestrator** (managing database transactions, repository queries, high-level workflow coordination, and dependency injection). It must never become a bloated "God Object".

Extract logic into dedicated helper files under `src/modules/<feature>/helpers/` when:

1. **File Size & Complexity Threshold**:
   * The service exceeds **400–600 lines** or coordinates more than **3 distinct domain workflows**.
   * *Example:* Split large operations into `order-lifecycle.helper.ts` (state machine transitions) and `order-mutation.helper.ts` (entity sanitization and updates).

2. **Pure Business Logic & Algorithmic Computations**:
   * Any stateless, deterministic logic that transforms data without requiring database or HTTP request context.
   * *Example:* `order-pricing.helper.ts` (calculating taxes, discounts, commissions) and `version-diff.helper.ts`.

3. **Deep Domain Parsing & Regex**:
   * Complex string parsing, manifest inspections, barcode/QR decode formatting, or regex pattern matching.
   * *Example:* `barcode-parser.helper.ts`, `permission-detector.helper.ts`.

4. **Network Probes & Low-Level Infrastructure**:
   * Operations handling raw TCP/DNS/TLS handshakes, SSRF IP blocking, or crypto key generation.
   * *Example:* `url-probe.helper.ts` (DNS checks, loopback IP protection, TLS validation) and `crypto-keys.helper.ts`.

5. **Zero-Mock Unit Testability (`*.helper.spec.ts`)**:
   * Logic with extensive branching or edge cases should be in a helper so it can be tested directly with pure Jest unit tests without mocking NestJS DI, TypeORM repositories, or execution contexts.

---

## 4. Parameter Decorators vs. Controller Helpers

Instead of manually digging into `req.user` or `req.headers` inside your controllers or writing helper functions, use **custom parameter decorators**.

### Bad: Manual extraction via helper
```typescript
// ❌ Messy controller logic
@Get('profile')
getProfile(@Req() req: Request) {
  const user = extractUserFromRequest(req); // Manual helper call
  return this.usersService.findById(user.id);
}
```

### Good: Custom Parameter Decorator
```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// ✅ Clean controller usage
@Get('profile')
getProfile(@CurrentUser('id') userId: string) {
  return this.usersService.findById(userId);
}
```

---

## 5. Module Encapsulation & Exports

1. **Explicit Exports**:
   * If `OrdersModule` needs `UsersService`, `UsersModule` MUST explicitly add `UsersService` to its `exports: [UsersService]`.
   * Only export what is genuinely needed outside the module. Keep repositories internal to their service layer unless building a dedicated database access module.
2. **Avoid Circular Dependencies**:
   * If Module A and Module B depend on each other, it usually indicates a missing 3rd module.
   * *Example*: If `UsersModule` needs `OrdersService` and `OrdersModule` needs `UsersService`, extract shared business logic or common events into a separate module (e.g., `UserStatsModule` or an event-driven system using `@nestjs/event-emitter`).
   * Only use `forwardRef()` as an absolute last resort.
