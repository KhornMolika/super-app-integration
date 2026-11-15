import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * identities.mustChangePassword: the password was set by someone else (a
 * seed account's first password, an account created or reset by a Super Admin
 * or Admin). After signing in with it the user must choose their own before
 * anything else works. Existing accounts start false; the seeder flags official
 * accounts still on the shared seed password at the next boot.
 */
export class AddMustChangePassword1796000000000 implements MigrationInterface {
  name = 'AddMustChangePassword1796000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "identities" ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "identities" DROP COLUMN IF EXISTS "mustChangePassword"`,
    );
  }
}
