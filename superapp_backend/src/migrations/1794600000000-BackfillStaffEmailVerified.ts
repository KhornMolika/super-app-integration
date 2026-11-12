import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Staff accounts (admins, mini app developers) that got past email verification
 * in the Backoffice, or were created by an administrator or seeded, never had
 * identities.emailVerifiedAt set: the Backoffice moved only their status. The
 * mobile sign-in requires a verified email, so it refused all of them.
 *
 * Marks verified every staff identity that is no longer PENDING_EMAIL_VERIFICATION.
 * Mobile-only (consumer) accounts are left alone: for them ACTIVE does not mean
 * the email was verified.
 */
export class BackfillStaffEmailVerified1794600000000 implements MigrationInterface {
  name = 'BackfillStaffEmailVerified1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "identities" i
      SET "emailVerifiedAt" = NOW()
      WHERE i."emailVerifiedAt" IS NULL
        AND i."status" <> 'PENDING_EMAIL_VERIFICATION'
        AND EXISTS (SELECT 1 FROM "staff_profiles" sp WHERE sp."identityId" = i."id")
    `);
  }

  public async down(): Promise<void> {
    // Not reversible: which rows were NULL before is not recorded, and clearing
    // the field would lock these accounts out of the mobile app again.
  }
}
