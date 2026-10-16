# 03. REST API Best Practice Conventions

This document establishes the standards for designing, documenting, and validating RESTful endpoints in NestJS.

---

## 1. RESTful Endpoint Architecture

### URI Naming Standards
* **Plural Nouns**: Use plural nouns for resources (`/api/v1/orders`, `/api/v1/products`).
* **Sub-resources for Hierarchies**: Use nested routes only for tightly coupled relationships:
  * `/api/v1/orders/:orderId/items`
  * Avoid nesting deeper than 2 levels. For deep resources, promote them to top-level routes with query filters (e.g., `/api/v1/order-items?orderId=...`).
* **Kebab-case for Multi-word Paths**: `/api/v1/customer-orders` (not `/customerOrders` or `/customer_orders`).

### HTTP Verb & Status Code Matrix

| Verb | Intent | Success Code | Idempotent | Body Returned? |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | Retrieve single or list resource | `200 OK` | Yes | Yes (Resource / Array) |
| **POST** | Create a new resource or trigger an action | `201 Created` | No | Yes (Created resource) |
| **PUT** | Full replacement of a resource | `200 OK` | Yes | Yes (Updated resource) |
| **PATCH** | Partial update of specific fields | `200 OK` | No (or Yes) | Yes (Updated resource) |
| **DELETE** | Remove a resource | `204 No Content` | Yes | No body |

---

## 2. DTO Design & Input Validation

### Global ValidationPipe Setup (`main.ts`)
Always configure the global `ValidationPipe` with security and parsing flags enabled:

```typescript
// src/main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Strips unexpected properties not in DTO
    forbidNonWhitelisted: true,    // Rejects requests containing unrecognized fields
    transform: true,              // Casts payload into instances of DTO class
    transformOptions: {
      enableImplicitConversion: false, // Prevents unintended type coercion
    },
  }),
);
```

### Create vs. Update DTOs
Use `PartialType` from `@nestjs/swagger` (or `@nestjs/mapped-types`) to prevent duplicating validation rules:

```typescript
// src/modules/orders/dto/create-order.dto.ts
import { IsUUID, IsInt, IsPositive, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

```typescript
// src/modules/orders/dto/update-order.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}
```

### Query DTOs (Pagination & Filtering)
Transform string query parameters to numbers safely:

```typescript
// src/common/dto/pagination-query.dto.ts
import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
```

---

## 3. Standardized Response & Error Envelopes

Every client consuming the API should expect a predictable response structure.

### Standard Success Response
Enforced automatically via an interceptor (`TransformInterceptor`):

```json
{
  "success": true,
  "data": {
    "id": "7f8b919d-7f41-4775-8123-6e3e5b3b1234",
    "status": "PENDING",
    "totalAmount": 120.50
  },
  "timestamp": "2026-10-14T08:50:00.000Z"
}
```

### Standard Paginated Success Response
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2026-10-14T08:50:00.000Z"
}
```

### Standard Error Response
Enforced automatically via an exception filter (`HttpExceptionFilter`):

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "quantity must be a positive number",
    "productId must be a UUID"
  ],
  "path": "/api/v1/orders",
  "timestamp": "2026-10-14T08:50:00.000Z"
}
```
