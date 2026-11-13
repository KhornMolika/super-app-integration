import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * mini_app_collaborators.role: ADMIN -> MAINTAINER, so the per-app role is not
 * confused with the organization ADMIN platform role.
 *
 * Rows for identities outside the app's organization are left in place: the
 * access policy ignores them (collaboration never crosses organizations).
 */
export class RenameCollaboratorAdminToMaintainer1794800000000 implements MigrationInterface {
  name = 'RenameCollaboratorAdminToMaintainer1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "mini_app_collaborators" SET "role" = 'MAINTAINER' WHERE "role" = 'ADMIN'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "mini_app_collaborators" SET "role" = 'ADMIN' WHERE "role" = 'MAINTAINER'`,
    );
  }
}
