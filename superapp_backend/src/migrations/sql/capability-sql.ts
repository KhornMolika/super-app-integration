/*
 * SQL builders shared by migrations. They live outside src/migrations/*.ts on
 * purpose: TypeORM loads every export of a file the migrations glob matches
 * as a migration class, and a plain function there fails the whole run
 * ("... migration name is wrong").
 */

/** Capability rows from a jsonb list, as parseDeclaredCapabilities() reads it. */
export function insertCaps(source: string, approved: boolean): string {
  return `
    INSERT INTO "mini_app_version_capabilities"
      ("miniAppId", "versionId", "capabilityKey", "required", "purpose", "declaration", "position", "status", "approvedAt")
    SELECT "miniAppId", "versionId", key, required, purpose, elem,
           (row_number() OVER (PARTITION BY "versionId" ORDER BY pos)) - 1,
           '${approved ? 'APPROVED' : 'REQUESTED'}', ${approved ? 'now()' : 'NULL'}
    FROM (
      SELECT DISTINCT ON (s."versionId", k.key)
             s."miniAppId", s."versionId", k.key, e.elem, e.pos,
             COALESCE(jsonb_typeof(e.elem) = 'object' AND e.elem->'required' = 'true'::jsonb, false) AS required,
             CASE WHEN jsonb_typeof(e.elem) = 'object' AND btrim(COALESCE(e.elem->>'purpose', '')) <> ''
                  THEN e.elem->>'purpose' END AS purpose
      FROM (${source}) s
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(s.list) = 'array' THEN s.list ELSE '[]'::jsonb END
      ) WITH ORDINALITY AS e(elem, pos)
      CROSS JOIN LATERAL (
        SELECT left(lower(btrim(CASE jsonb_typeof(e.elem)
                 WHEN 'string' THEN e.elem #>> '{}'
                 WHEN 'object' THEN COALESCE(e.elem->>'type', e.elem->>'key', e.elem->>'name')
               END)), 100) AS key
      ) k
      WHERE COALESCE(k.key, '') <> ''
        AND NOT EXISTS (SELECT 1 FROM "mini_app_version_capabilities" c WHERE c."versionId" = s."versionId")
      ORDER BY s."versionId", k.key, e.pos
    ) d`;
}
