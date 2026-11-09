import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Follow-up to CreateIdentitiesAndProfilesSchema1794200000000.
 *
 * 1. The Identity entity reads columns that migration never created
 *    (deletionRequestedAt, purgeAfter, telegram*), which crashed the app on
 *    boot in SeederService ("column Identity.deletionRequestedAt does not exist").
 * 2. Entities now reference `identities` for user foreign keys, but the database
 *    FKs still pointed at the legacy "user" / end_users tables, so any write for an
 *    identity that is not also a legacy row (new users, merged consumers) failed.
 *
 * Legacy ids are remapped by email to the surviving identity id before the FKs
 * are repointed; rows that still cannot be matched are nulled (nullable columns)
 * or deleted (tokens / notifications / memberships that cascade anyway).
 */
interface FkTarget {
  table: string;
  column: string;
  constraint: string;
  onDelete: 'CASCADE' | 'NO ACTION' | 'SET NULL';
  legacyTables: string[];
}

const FK_TARGETS: FkTarget[] = [
  { table: 'notification', column: 'userId', constraint: 'FK_1ced25315eb974b73391fb1c81b', onDelete: 'CASCADE', legacyTables: ['user', 'users'] },
  { table: 'mini_apps', column: 'ownerId', constraint: 'FK_9eedefb930e4503d9c874302a6e', onDelete: 'NO ACTION', legacyTables: ['user', 'users'] },
  { table: 'developer_tokens', column: 'userId', constraint: 'FK_5b06b79066399aa4e628b196c9f', onDelete: 'CASCADE', legacyTables: ['user', 'users'] },
  { table: 'capability_proposals', column: 'requestedById', constraint: 'FK_b3bff59b921d6c3cb690f36796a', onDelete: 'NO ACTION', legacyTables: ['user', 'users'] },
  { table: 'mini_app_collaborators', column: 'userId', constraint: 'FK_1dc4ed4256355351534b501fc32', onDelete: 'CASCADE', legacyTables: ['user', 'users'] },
  { table: 'end_user_email_verification_tokens', column: 'userId', constraint: 'FK_end_user_evt_userId', onDelete: 'CASCADE', legacyTables: ['end_users', 'end_user'] },
  { table: 'end_user_refresh_tokens', column: 'endUserId', constraint: 'FK_end_user_rt_userId', onDelete: 'CASCADE', legacyTables: ['end_users', 'end_user'] },
];

export class AlignIdentitiesColumnsAndForeignKeys1794300000000
  implements MigrationInterface
{
  name = 'AlignIdentitiesColumnsAndForeignKeys1794300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Missing identity columns
    await queryRunner.query(`
      ALTER TABLE "identities"
        ADD COLUMN IF NOT EXISTS "deletionRequestedAt" TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS "purgeAfter" TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS "telegramChatId" VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS "telegramUsername" VARCHAR NULL,
        ADD COLUMN IF NOT EXISTS "telegramConnectedAt" TIMESTAMPTZ NULL;
    `);

    // 2. Backfill them from legacy tables (only where the legacy column exists)
    const legacyUser = await this.firstExistingTable(queryRunner, ['users', 'user']);
    if (legacyUser) {
      const cols = await this.columns(queryRunner, legacyUser);
      const sets = ['telegramChatId', 'telegramUsername', 'telegramConnectedAt']
        .filter((c) => cols.has(c))
        .map((c) => `"${c}" = COALESCE(i."${c}", u."${c}")`);
      if (sets.length) {
        await queryRunner.query(`
          UPDATE "identities" i SET ${sets.join(', ')}
          FROM "${legacyUser}" u
          WHERE i."email" = lower(trim(u."email"));
        `);
      }
    }

    const legacyEndUsers = await this.firstExistingTable(queryRunner, ['end_users', 'end_user']);
    if (legacyEndUsers) {
      const cols = await this.columns(queryRunner, legacyEndUsers);
      const sets = ['deletionRequestedAt', 'purgeAfter']
        .filter((c) => cols.has(c))
        .map((c) => `"${c}" = COALESCE(i."${c}", eu."${c}")`);
      if (sets.length) {
        await queryRunner.query(`
          UPDATE "identities" i SET ${sets.join(', ')}
          FROM "${legacyEndUsers}" eu
          WHERE i."email" = lower(trim(eu."email"));
        `);
      }
    }

    // 3. Repoint user foreign keys to identities
    for (const fk of FK_TARGETS) {
      const tableCols = await this.columns(queryRunner, fk.table);
      if (!tableCols.has(fk.column)) continue;

      // Drop whatever FK currently guards this column (legacy names vary)
      const existing: Array<{ conname: string }> = await queryRunner.query(
        `SELECT c.conname
           FROM pg_constraint c
           JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
          WHERE c.contype = 'f'
            AND c.conrelid = to_regclass(quote_ident($1))
            AND a.attname = $2`,
        [fk.table, fk.column],
      );
      for (const { conname } of existing) {
        await queryRunner.query(`ALTER TABLE "${fk.table}" DROP CONSTRAINT "${conname}"`);
      }

      // Remap legacy ids whose email resolved to a different identity id
      for (const legacy of fk.legacyTables) {
        if (!(await queryRunner.hasTable(legacy))) continue;
        await queryRunner.query(`
          UPDATE "${fk.table}" t SET "${fk.column}" = i."id"
          FROM "${legacy}" l
          JOIN "identities" i ON i."email" = lower(trim(l."email"))
          WHERE t."${fk.column}" = l."id" AND t."${fk.column}" <> i."id";
        `);
      }

      // Anything still unmatched cannot satisfy the new FK
      const orphanFilter = `"${fk.column}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "identities" i WHERE i."id" = "${fk.table}"."${fk.column}")`;
      const nullable = await this.isNullable(queryRunner, fk.table, fk.column);
      if (nullable) {
        await queryRunner.query(`UPDATE "${fk.table}" SET "${fk.column}" = NULL WHERE ${orphanFilter}`);
      } else {
        await queryRunner.query(`DELETE FROM "${fk.table}" WHERE ${orphanFilter}`);
      }

      await queryRunner.query(`
        ALTER TABLE "${fk.table}"
          ADD CONSTRAINT "${fk.constraint}" FOREIGN KEY ("${fk.column}")
          REFERENCES "identities"("id") ON DELETE ${fk.onDelete} ON UPDATE NO ACTION;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const fk of FK_TARGETS) {
      if (!(await queryRunner.hasTable(fk.table))) continue;
      await queryRunner.query(`ALTER TABLE "${fk.table}" DROP CONSTRAINT IF EXISTS "${fk.constraint}"`);
      const legacy = await this.firstExistingTable(queryRunner, fk.legacyTables);
      if (legacy) {
        // NOT VALID: identities created after the up migration have no legacy row
        await queryRunner.query(`
          ALTER TABLE "${fk.table}"
            ADD CONSTRAINT "${fk.constraint}" FOREIGN KEY ("${fk.column}")
            REFERENCES "${legacy}"("id") ON DELETE ${fk.onDelete} NOT VALID;
        `);
      }
    }
    await queryRunner.query(`
      ALTER TABLE "identities"
        DROP COLUMN IF EXISTS "telegramConnectedAt",
        DROP COLUMN IF EXISTS "telegramUsername",
        DROP COLUMN IF EXISTS "telegramChatId",
        DROP COLUMN IF EXISTS "purgeAfter",
        DROP COLUMN IF EXISTS "deletionRequestedAt";
    `);
  }

  private async firstExistingTable(queryRunner: QueryRunner, candidates: string[]): Promise<string | null> {
    for (const table of candidates) {
      if (await queryRunner.hasTable(table)) return table;
    }
    return null;
  }

  private async columns(queryRunner: QueryRunner, table: string): Promise<Set<string>> {
    const rows: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1`,
      [table],
    );
    return new Set(rows.map((r) => r.column_name));
  }

  private async isNullable(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows: Array<{ is_nullable: string }> = await queryRunner.query(
      `SELECT is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`,
      [table, column],
    );
    return rows[0]?.is_nullable === 'YES';
  }
}
