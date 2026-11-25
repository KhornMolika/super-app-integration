import type { CapabilityDefinition } from './entities/capability-definition.entity';

/**
 * Collects all normalized lookup keys for a DB CapabilityDefinition row:
 * its primary key, display name, configured aliases, and metadata.requiredPermissions.
 */
export function collectDefinitionKeys(
  def: Pick<CapabilityDefinition, 'key' | 'name'> & {
    aliases?: string[];
    metadata?: any;
  },
): string[] {
  const keys = new Set<string>();
  if (def.key) keys.add(def.key.toLowerCase().trim());
  if (def.name) keys.add(def.name.toLowerCase().trim());
  if (Array.isArray(def.aliases)) {
    for (const alias of def.aliases) {
      if (typeof alias === 'string' && alias.trim()) {
        keys.add(alias.toLowerCase().trim());
      }
    }
  }
  const reqPerms = def.metadata?.requiredPermissions;
  if (Array.isArray(reqPerms)) {
    for (const p of reqPerms) {
      if (typeof p === 'string' && p.trim()) {
        keys.add(p.toLowerCase().trim());
      }
    }
  }
  return Array.from(keys);
}

/**
 * Finds the best matching CapabilityDefinition from a DB-loaded list using
 * exact key/name match first, then DB-stored aliases/requiredPermissions.
 */
export function findMatchingDefinition<
  T extends Pick<CapabilityDefinition, 'key' | 'name'> & {
    aliases?: string[];
    metadata?: any;
    isActive?: boolean;
    isAllowed?: boolean;
  },
>(rawKey: string, definitions: T[]): T | null {
  const lower = (rawKey || '').toLowerCase().trim();
  if (!lower) return null;

  const exact = definitions.find(
    (d) =>
      d.key?.toLowerCase().trim() === lower ||
      d.name?.toLowerCase().trim() === lower,
  );
  if (exact) return exact;

  const byAlias = definitions.filter((d) =>
    collectDefinitionKeys(d).includes(lower),
  );
  if (byAlias.length === 0) return null;

  return (
    byAlias.find((d) => d.isActive !== false && d.isAllowed !== false) ||
    byAlias[0]
  );
}
