# 06. NestJS Testing Strategies & Production Observability

This document covers official testing recipes (Unit & E2E) and production health monitoring using @nestjs/terminus.

---

## 1. Unit Testing with @nestjs/testing

Test services in isolation by mocking TypeORM repositories using getRepositoryToken().

`	ypescript
// src/modules/orders/orders.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrdersService } from './orders.service';
import { OrderEntity } from './entities/order.entity';
import { NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let repo: jest.Mocked<Partial<Repository<OrderEntity>>>;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: repo,
        },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should throw NotFoundException if order does not exist', async () => {
    repo.findOne = jest.fn().mockResolvedValue(null);

    await expect(service.findById('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
`

---

## 2. End-to-End (E2E) Testing with Supertest

E2E tests verify the entire request pipeline, including Guards, Interceptors, and ValidationPipes:

`	ypescript
// test/orders.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('OrdersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // CRITICAL: Mirror main.ts pipes in E2E tests
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/orders (POST) should reject invalid payload with 400', () => {
    return request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({ invalidProperty: 'hacked' })
      .expect(400)
      .expect((res) => {
        expect(res.body.success).toBe(false);
      });
  });
});
`

---

## 3. Production Health Checks (@nestjs/terminus)

Orchestrators (Kubernetes, AWS ECS, Docker Swarms) require reliable liveness and readiness probes to monitor database connectivity and resource limits.

### Installation
`ash
pnpm add @nestjs/terminus
`

### Health Controller (src/core/health/health.controller.ts)
`	ypescript
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Public() // Health probes bypass JWT auth
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // 1. Verify PostgreSQL / TypeORM connection ping within 1.5s
      () => this.db.pingCheck('database', { timeout: 1500 }),

      // 2. Alert if heap memory exceeds 300MB
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // 3. Alert if disk storage is more than 90% full
      () =>
        this.disk.checkStorage('storage', {
          thresholdPercent: 0.9,
          path: process.platform === 'win32' ? 'C:\\' : '/',
        }),
    ]);
  }
}
`

---

## 4. Graceful Shutdown Hooks

Ensure database connections and in-flight HTTP requests complete cleanly on server restart or container termination:

`	ypescript
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful teardown on SIGTERM / SIGINT
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
`
