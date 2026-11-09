import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AddCollaboratorDto } from './miniapp-actions.dto';
import { NexusPackageDto, NexusSnippetDto } from '../../integrations/nexus/nexus-integration.dto';

const errors = (cls: any, body: object) =>
  validateSync(plainToInstance(cls, body), { whitelist: true }).flatMap((e) =>
    Object.values(e.constraints ?? {}),
  );

describe('AddCollaboratorDto', () => {
  it('requires a UUID userId (empty body used to reach the DB and return 500)', () => {
    expect(errors(AddCollaboratorDto, {})).toContain('userId must be a valid identity UUID');
    expect(errors(AddCollaboratorDto, { userId: 'not-a-uuid' })).toContain(
      'userId must be a valid identity UUID',
    );
  });

  it('accepts any id a Postgres uuid column holds, not only RFC 4122 v1-v5', () => {
    // Seeded / migrated rows can have a zero version nibble; they must stay addressable
    expect(errors(AddCollaboratorDto, { userId: 'b0000000-0000-0000-0000-000000000001' })).toEqual([]);
    expect(errors(AddCollaboratorDto, { userId: 'B0000000-0000-0000-0000-00000000000G' })).toContain(
      'userId must be a valid identity UUID',
    );
  });

  it('accepts a known role and rejects an unknown one', () => {
    const userId = 'b0000000-0000-4000-8000-000000000001';
    expect(errors(AddCollaboratorDto, { userId, role: 'VIEWER' })).toEqual([]);
    expect(errors(AddCollaboratorDto, { userId })).toEqual([]);
    expect(errors(AddCollaboratorDto, { userId, role: 'OWNER' }).join()).toMatch(/role must be one of/);
  });
});

describe('Nexus DTOs', () => {
  it('require packageName (empty body used to crash with .trim() of undefined)', () => {
    expect(errors(NexusPackageDto, {})).toContain('packageName is required');
    expect(errors(NexusSnippetDto, { versionConstraint: '^1.0.0' })).toContain('packageName is required');
  });

  it('accept a valid body', () => {
    expect(errors(NexusPackageDto, { packageName: 'fsa_hr' })).toEqual([]);
    expect(errors(NexusSnippetDto, { packageName: 'fsa_hr', versionConstraint: '^1.2.0' })).toEqual([]);
  });
});
