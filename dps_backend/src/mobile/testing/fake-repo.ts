import { FindOperator } from 'typeorm';
import * as crypto from 'crypto';

/** Minimal in-memory stand-in for a TypeORM Repository (test use only). */
export class FakeRepo<T extends Record<string, any>> {
  rows: T[] = [];
  constructor(private readonly uniqueKeys: string[] = []) {}

  private matches(row: T, criteria: Record<string, any>): boolean {
    return Object.entries(criteria).every(([k, v]) => {
      if (v instanceof FindOperator) {
        if (v.type === 'isNull') return row[k] === null || row[k] === undefined;
        throw new Error(`unsupported operator ${v.type}`);
      }
      return row[k] === v;
    });
  }

  create(data: Partial<T>): T {
    return { ...data } as T;
  }

  async save(entity: T): Promise<T> {
    const existing = this.rows.find((r) => r === entity);
    if (existing) return entity;
    for (const key of this.uniqueKeys) {
      if (this.rows.some((r) => r[key] === (entity as any)[key])) {
        throw Object.assign(new Error('duplicate key'), { code: '23505' });
      }
    }
    const e = entity as any;
    e.id ??= crypto.randomUUID();
    e.createdAt ??= new Date();
    this.rows.push(entity);
    return entity;
  }

  async findOne(opts: {
    where: Record<string, any>;
    order?: Record<string, 'ASC' | 'DESC'>;
  }): Promise<T | null> {
    let found = this.rows.filter((r) => this.matches(r, opts.where));
    if (opts.order) {
      const [[k, dir]] = Object.entries(opts.order);
      found = [...found].sort(
        (a, b) =>
          (new Date(a[k]).getTime() - new Date(b[k]).getTime()) *
          (dir === 'DESC' ? -1 : 1),
      );
    }
    return found[0] ?? null;
  }

  async update(criteria: Record<string, any>, patch: Partial<T>) {
    let affected = 0;
    for (const r of this.rows) {
      if (this.matches(r, criteria)) {
        Object.assign(r, patch);
        affected++;
      }
    }
    return { affected };
  }

  async delete(criteria: Record<string, any>) {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !this.matches(r, criteria));
    return { affected: before - this.rows.length };
  }
}
