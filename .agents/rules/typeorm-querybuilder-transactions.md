# TypeORM QueryBuilder & Database Transactions Standard

## 1. Rule Statement
**Always use TypeORM QueryBuilder and database transactions instead of raw SQL strings (`repository.query(...)`, `manager.query(...)`).**

Raw SQL strings (e.g. `query('UPDATE "table" SET ...')`) are strictly prohibited for business logic, data seeding, and multi-entity mutations across the platform.

---

## 2. Rationale & Security Assessment

### A. Is Raw SQL String Inherently Vulnerable to SQL Injection?
- Parameterized raw SQL (`query('UPDATE ... WHERE id = $1', [id])`) is technically protected by PostgreSQL's binary protocol against classic SQL injection.
- **However, raw SQL strings introduce critical security and operational hazards**:
  1. **Typo and Drift Vulnerabilities**: Column renames or refactorings (e.g., `status` vs `appStatus`) cannot be validated by TypeScript or the compiler, leading to silent failures or unexpected database errors in production.
  2. **Accidental Interpolation**: Developers frequently start with parameterized queries but unintentionally introduce unsafe template strings (`WHERE id IN (${ids.join(',')})`) under time pressure.
  3. **Bypasses TypeORM Lifecycle & Subscribers**: Raw SQL bypasses ORM entity listeners, audit subscribers, encryption transformers, and `@DeleteDateColumn()` soft-delete logic.
  4. **Silent Error Swallowing**: Raw SQL queries are often paired with `.catch(() => {})`, hiding constraint violations and leaving relational graphs corrupted.

---

## 3. Mandatory Implementation Patterns

### A. Atomic Multi-Table Mutations: `dataSource.transaction()`
Any mutation spanning more than one entity or table **MUST** be executed within `dataSource.transaction(async (manager) => { ... })`:

```typescript
// ✅ CORRECT: Atomic multi-table operation with rollback protection
await this.dataSource.transaction(async (manager) => {
  // 1. Delete dependent tokens
  await manager
    .createQueryBuilder()
    .delete()
    .from(DeveloperToken)
    .where('userId IN (:...ids)', { ids: targetUserIds })
    .execute();

  // 2. Delete parent entity
  await manager
    .createQueryBuilder()
    .delete()
    .from(User)
    .where('id IN (:...ids)', { ids: targetUserIds })
    .execute();
});
```

### B. Prohibited Patterns
```typescript
// ❌ PROHIBITED: Raw SQL strings with silent error swallowing
await this.userRepository.query(
  `DELETE FROM "mini_apps" WHERE "ownerId" = ANY($1)`,
  [mockUserIds],
).catch(() => {});

// ❌ PROHIBITED: Reassigning credentials to other users
await this.userRepository.query(
  `UPDATE "developer_tokens" SET "userId" = $1 WHERE "userId" = ANY($2)`,
  [superAdminId, mockUserIds],
);
```

### C. Safe Purge & Cascading Rules
1. **Never Reassign Auth Tokens**: API tokens, developer tokens, and session refresh tokens must be revoked or permanently deleted—never reassigned to administrators.
2. **Safeguard Protected Accounts**: Deletion criteria based on domain matching (e.g. `ILIKE '%@superapp.gov.kh'`) must always explicitly exclude protected seed accounts via `NOT IN (:...protectedEmails)`.
3. **No Silent Swallowing**: Never attach `.catch(() => {})` to destructive database operations. Failures must trigger an automatic transaction rollback.
