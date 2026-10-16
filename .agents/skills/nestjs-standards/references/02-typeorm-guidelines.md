# 02. TypeORM Best Practice Guidelines

TypeORM is a powerful ORM for TypeScript, but improper patterns can lead to data inconsistency, N+1 query bottlenecks, and accidental data loss. Follow these production-grade practices.

---

## 1. Entity Architecture & Naming Conventions

### Base Entity (`base.entity.ts`)
Create a shared abstract base entity to ensure uniform metadata across all tables:

```typescript
// src/common/database/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Optional: only if soft delete is required for this entity
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}
```

### Column & Table Naming Rules
* **Database Columns**: Always use `snake_case` in SQL tables. Specify `{ name: 'column_name' }` explicitly or configure the TypeORM `SnakeNamingStrategy`.
* **TypeScript Properties**: Always use `camelCase`.
* **Explicit Column Types**: Never let TypeORM guess numeric types. Specify `decimal`, `int`, or `varchar(n)`.

```typescript
// src/modules/orders/entities/order.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Entity('orders')
export class OrderEntity extends BaseEntity {
  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value), // PostgreSQL returns numeric/decimal as string
    },
  })
  totalAmount: number;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
```

---

## 2. Safe Transaction Management

When an operation touches more than one entity or updates multiple records, **always wrap it in a transaction**.

### Recommended: `DataSource.transaction()`
For 90% of business use cases, `dataSource.transaction()` is clean and automatically handles commit/rollback:

```typescript
@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
  ) {}

  async checkoutOrder(dto: CreateOrderDto, userId: string): Promise<OrderEntity> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Deduct stock using the transaction manager
      const product = await manager.findOne(ProductEntity, {
        where: { id: dto.productId },
        lock: { mode: 'pessimistic_write' }, // Prevent race condition
      });

      if (!product || product.stock < dto.quantity) {
        throw new BadRequestException('Insufficient stock');
      }

      product.stock -= dto.quantity;
      await manager.save(ProductEntity, product);

      // 2. Create and persist order within the same transaction
      const order = manager.create(OrderEntity, {
        userId,
        productId: dto.productId,
        totalAmount: product.price * dto.quantity,
      });

      return await manager.save(OrderEntity, order);
    });
  }
}
```

### Advanced: `QueryRunner`
Use `QueryRunner` when you need explicit control over connection release, isolation levels, or savepoints:

```typescript
async complexOperation(): Promise<void> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction('SERIALIZABLE');

  try {
    // Perform operations with queryRunner.manager
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    // CRITICAL: Always release the connection back to the pool!
    await queryRunner.release();
  }
}
```

---

## 3. Avoiding Common Performance Traps

### Trap 1: The N+1 Query Problem in Loops
* âŒ **Bad**:
  ```typescript
  // Loops over 50 orders and fires 50 individual queries
  for (const order of orders) {
    order.items = await this.itemRepo.find({ where: { orderId: order.id } });
  }
  ```
* âœ… **Good**:
  ```typescript
  // Single query with join
  const orders = await this.orderRepo.find({
    relations: { items: true },
    where: { userId },
  });
  ```

### Trap 2: Using `limit`/`offset` with Joins
* When joining `OneToMany` relations, SQL returns multiple rows per parent entity.
* TypeORM's `take` and `skip` correctly deduplicate results in memory:
  ```typescript
  const [orders, count] = await this.orderRepo
    .createQueryBuilder('order')
    .leftJoinAndSelect('order.items', 'item')
    .where('order.userId = :userId', { userId })
    .orderBy('order.createdAt', 'DESC')
    .take(limit) // Use take instead of limit
    .skip(offset) // Use skip instead of offset
    .getManyAndCount();
  ```

### Trap 3: Selecting Unnecessary Columns
* Never select large text, JSON, or sensitive columns (e.g., `password_hash`) when not needed.
* Use `select: ['id', 'status', 'totalAmount']` or `@Column({ select: false })` for sensitive fields.

---

## 4. Migrations vs. `synchronize: true`

| Environment | `synchronize` Setting | Recommendation |
| :--- | :--- | :--- |
| **Local Development** | `false` or `true` (prototyping only) | Preferred to use migrations to mirror production. |
| **Staging / QA** | `false` | **Mandatory** |
| **Production** | `false` | **STRICTLY FORBIDDEN to set to true.** `synchronize: true` can drop tables, rename columns, and wipe data without warning. |

### Migration Workflow Commands
Configure `ormconfig.ts` or `data-source.ts` to export a CLI `DataSource`, and add these scripts to `package.json`:

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:generate": "pnpm typeorm -- migration:generate -d src/core/database/data-source.ts",
    "migration:run": "pnpm typeorm -- migration:run -d src/core/database/data-source.ts",
    "migration:revert": "pnpm typeorm -- migration:revert -d src/core/database/data-source.ts"
  }
}
```
