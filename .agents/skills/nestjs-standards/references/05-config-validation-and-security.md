# 05. NestJS Configuration Validation & Production Security

This document details official NestJS best practices for environment variable validation, namespaced configuration, and security hardening.

---

## 1. Centralized Environment Validation (@nestjs/config)

Never let an application start with missing environment variables. Crash immediately at boot time if required keys (database credentials, JWT secrets, port numbers) are absent or misconfigured.

### Installation
`ash
pnpm add @nestjs/config joi
`

### Setup with Joi Validation Schema (pp.module.ts)
`	ypescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Available everywhere without re-importing
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USER: Joi.string().required(),
        DATABASE_PASSWORD: Joi.string().required(),
        DATABASE_NAME: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('1d'),
      }),
      validationOptions: {
        allowUnknown: true, // Allow standard OS env variables
        abortEarly: false,  // Report all missing keys at once
      },
    }),
  ],
})
export class AppModule {}
`

---

## 2. Production Security Hardening

### A. HTTP Security Headers with Helmet
Use helmet to set secure HTTP headers (e.g., Content-Security-Policy, X-Frame-Options, X-Content-Type-Options):

`ash
pnpm add helmet
`

`	ypescript
// src/main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Apply Helmet before other middleware
  app.use(helmet());
  
  // ...
}
`

---

### B. Explicit CORS Configuration
Never use pp.enableCors() without options in production:

`	ypescript
// src/main.ts
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
`

---

### C. Rate Limiting with @nestjs/throttler
Protect your endpoints from brute-force login attempts and DDoS attacks:

`ash
pnpm add @nestjs/throttler
`

`	ypescript
// src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute globally
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
`

* Override limits on sensitive routes (e.g. login):
`	ypescript
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per min
@Post('login')
login(@Body() dto: LoginDto) { ... }
`

---

### D. Sensitive Data Sanitization (ClassSerializerInterceptor)
Never return password hashes or internal secrets in responses:

`	ypescript
// src/main.ts
import { ClassSerializerInterceptor, Reflector } from '@nestjs/common';

app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
`

In your TypeORM entities:
`	ypescript
@Column()
@Exclude() // Stripped automatically by ClassSerializerInterceptor
passwordHash: string;
`
