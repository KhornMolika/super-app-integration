import { Repository } from 'typeorm';
import { Identity } from './entities/identity.entity';

/**
 * identities.passwordHash is `select: false`, so no ordinary query (profile loads,
 * eager owner/collaborator relations, list endpoints) ever carries it into a
 * response. Code that genuinely needs it — password verification and the seed
 * "has a password been set?" check — must ask for it explicitly through here.
 */
export async function loadPasswordHash(
  repo: Repository<Identity>,
  identityId: string,
): Promise<string | null> {
  if (!identityId) return null;
  // Naming a select:false column in an explicit `select` is how TypeORM loads it
  const row = await repo.findOne({
    where: { id: identityId },
    select: { id: true, passwordHash: true },
  });
  return row?.passwordHash || null;
}
