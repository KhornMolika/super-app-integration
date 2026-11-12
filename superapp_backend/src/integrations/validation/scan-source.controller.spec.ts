import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScanSourceController } from './scan-source.controller';
import { signScanTicket } from './scan-source-ticket';

jest.mock('../../miniapps/helpers/flutter-credential.helper', () => ({
  extractDecryptedDeployKey: (cfg: any) => cfg.deployKey || '',
  extractDecryptedGitToken: (cfg: any) => cfg.gitAccessToken || '',
}));

const ID = '7b1f5c2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b';
const SHA = '7f8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b';
const KEY = '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----';

function setup(app: any, archive: Buffer | null = Buffer.from('zip')) {
  const repo = { findOne: jest.fn().mockResolvedValue(app) };
  const storage = { packageSubmissionsBucket: 'bucket', getObjectBuffer: jest.fn().mockResolvedValue(archive) };
  const git = { getDeployPrivateKey: jest.fn().mockReturnValue('') };
  const controller = new ScanSourceController(repo as any, storage as any, git as any);
  const res: any = { headers: {}, setHeader: jest.fn((k, v) => (res.headers[k] = v)), end: jest.fn() };
  return { controller, storage, res };
}

describe('ScanSourceController', () => {
  it('streams the archive of the scanned config', async () => {
    const { controller, storage, res } = setup({
      id: ID,
      integrationConfig: { sourceType: 'ARTIFACT', packageStoragePath: 'quarantine/packages/hr/1.0.0/hr.zip' },
    });
    await controller.archive(ID, signScanTicket(ID, 'live'), res);
    expect(storage.getObjectBuffer).toHaveBeenCalledWith('bucket', 'quarantine/packages/hr/1.0.0/hr.zip');
    expect(res.end).toHaveBeenCalledWith(Buffer.from('zip'));
    expect(res.headers['Content-Type']).toBe('application/zip');
  });

  it('a revision ticket streams the new version\'s archive', async () => {
    const { controller, storage, res } = setup({
      id: ID,
      integrationConfig: { sourceType: 'ARTIFACT', packageStoragePath: 'old.zip' },
      pendingRevision: { integrationConfig: { sourceType: 'ARTIFACT', packageStoragePath: 'new.zip' } },
    });
    await controller.archive(ID, signScanTicket(ID, 'rev'), res);
    expect(storage.getObjectBuffer).toHaveBeenCalledWith('bucket', 'new.zip');
  });

  it('refuses without a valid ticket', async () => {
    const { controller, res } = setup({ id: ID, integrationConfig: {} });
    await expect(controller.archive(ID, 'live.1.bad', res)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.git(ID, signScanTicket('00000000-0000-4000-8000-000000000000', 'live'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404 when the archive is gone from MinIO', async () => {
    const { controller, res } = setup({ id: ID, integrationConfig: { sourceType: 'ARTIFACT', packageStoragePath: 'p.zip' } }, null);
    await expect(controller.archive(ID, signScanTicket(ID, 'live'), res)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('public repository: address and locked commit, no credential', async () => {
    const { controller } = setup({
      id: ID,
      integrationConfig: { sourceType: 'GIT', gitUrl: 'https://github.com/fsa/hr.git', gitBranch: 'main', commitSha: SHA, gitPath: 'packages/hr' },
    });
    await expect(controller.git(ID, signScanTicket(ID, 'live'))).resolves.toEqual({
      repoUrl: 'https://github.com/fsa/hr.git',
      ref: SHA,
      path: 'packages/hr',
      auth: 'none',
    });
  });

  it('private repository with a deploy key, or with a token', async () => {
    const ssh = setup({ id: ID, integrationConfig: { sourceType: 'GIT', gitUrl: 'git@gitlab.com:fsa/hr.git', isPrivateRepo: true, deployKey: KEY } });
    await expect(ssh.controller.git(ID, signScanTicket(ID, 'live'))).resolves.toMatchObject({ auth: 'ssh', privateKey: `${KEY}\n` });

    const tok = setup({
      id: ID,
      integrationConfig: { sourceType: 'GIT', gitUrl: 'https://github.com/fsa/hr.git', isPrivateRepo: true, authMethod: 'token', gitAccessToken: 'ghp_x' },
    });
    await expect(tok.controller.git(ID, signScanTicket(ID, 'live'))).resolves.toMatchObject({ auth: 'token', token: 'ghp_x' });
  });

  it('a private repository without any credential is refused', async () => {
    const { controller } = setup({ id: ID, integrationConfig: { sourceType: 'GIT', gitUrl: 'https://github.com/fsa/hr.git', isPrivateRepo: true } });
    await expect(controller.git(ID, signScanTicket(ID, 'live'))).rejects.toThrow(/without a usable deploy key or access token/);
  });

  it('refuses a package path that leaves the repository', async () => {
    const { controller } = setup({ id: ID, integrationConfig: { sourceType: 'GIT', gitUrl: 'https://github.com/fsa/hr.git', gitPath: '../etc' } });
    await expect(controller.git(ID, signScanTicket(ID, 'live'))).rejects.toThrow(/not valid/);
  });
});
