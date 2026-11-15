/*
 * SQL builders shared by migrations. They live outside src/migrations/*.ts on
 * purpose: TypeORM loads every export of a file the migrations glob matches
 * as a migration class, and a plain function there fails the whole run
 * ("... migration name is wrong").
 */

/** SQL: the stage an old lifecycle (or revision status) value stands for; NULL = leave the row. */
export function stageCase(expr: string): string {
  return `CASE ${expr}
    WHEN 'DRAFT' THEN 'DRAFT' WHEN 'QUARANTINE' THEN 'DRAFT'
    WHEN 'SUBMITTED' THEN 'SUBMITTED'
    WHEN 'IN_REVIEW' THEN 'IN_REVIEW'
    WHEN 'CHANGES_REQUESTED' THEN 'CHANGES_REQUESTED'
    WHEN 'REJECTED' THEN 'REJECTED'
    WHEN 'APPROVED' THEN 'APPROVED' WHEN 'APPROVED_FOR_TESTING' THEN 'APPROVED'
    WHEN 'BUILDING' THEN 'APPROVED' WHEN 'BUILDING_STAGE_1' THEN 'APPROVED' WHEN 'BUILD_FAILED' THEN 'APPROVED'
    WHEN 'TESTING' THEN 'TESTING'
    WHEN 'TEST_PASSED' THEN 'TEST_PASSED' WHEN 'BUILDING_STAGE_2' THEN 'TEST_PASSED'
    ELSE NULL END`;
}

/** SQL: the app status for the old pair. */
export function appStatusCase(lifecycle: string, availability: string): string {
  return `CASE
    WHEN ${lifecycle} IN ('ARCHIVED', 'TERMINATED') THEN 'ARCHIVED'
    WHEN ${lifecycle} = 'SUSPENDED' OR ${availability} = 'SUSPENDED' THEN 'SUSPENDED'
    WHEN ${lifecycle} = 'ACTIVE' OR ${availability} = 'PRODUCTION' THEN 'LIVE'
    ELSE 'DRAFT' END`;
}
