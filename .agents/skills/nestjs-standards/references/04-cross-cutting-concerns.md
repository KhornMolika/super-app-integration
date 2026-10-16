# 04. Cross-Cutting Concerns (Filters, Interceptors, Guards)

Cross-cutting concerns must be implemented cleanly in the NestJS request lifecycle rather than repeated in every controller or service.

---

## 1. Global Exception Filter (`HttpExceptionFilter`)

Catches all exceptions, prevents leaking internal database stack traces to clients, and formats errors into a unified shape.

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        errorName = resObj.error || exception.name;
      } else {
        message = res as string;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
      // In production, do not leak raw error messages to the client
      message = 'An unexpected error occurred';
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorName,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 2. Response Transform Interceptor

Automatically wraps successful responses into `{ success: true, data: ..., timestamp: ... }`, eliminating the need to wrap return values manually inside each controller.

```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // If response already contains data & meta (e.g. paginated result)
        if (response && response.data !== undefined && response.meta !== undefined) {
          return {
            success: true,
            data: response.data,
            meta: response.meta,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          data: response ?? null,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
```

---

## 3. Execution Time & Request Logging Interceptor

```typescript
// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const statusCode = res.statusCode;
        const duration = Date.now() - now;
        this.logger.log(`${method} ${originalUrl} ${statusCode} - ${duration}ms`);
      }),
    );
  }
}
```

---

## 4. Authentication & Public Route Bypass Pattern

To avoid adding `@UseGuards(JwtAuthGuard)` to every single controller, make authentication global and use a custom `@Public()` decorator to opt out.

### Step 1: Create `@Public()` Decorator
```typescript
// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### Step 2: Global JWT Guard with Reflector
```typescript
// src/common/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

### Step 3: Register Globally in `app.module.ts`
```typescript
// src/app.module.ts
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // All routes require auth by default!
    },
  ],
})
export class AppModule {}
```

Now, public routes simply annotate:
```typescript
@Public()
@Post('login')
login(@Body() dto: LoginDto) { ... }
```
