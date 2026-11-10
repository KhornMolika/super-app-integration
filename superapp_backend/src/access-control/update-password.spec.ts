import { AccessControlService } from './access-control.service';

describe('AccessControlService.updatePasswordDirectly', () => {
  it('changes only the password hash, never the account status (no approval bypass)', async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const svc = Object.create(AccessControlService.prototype) as AccessControlService;
    (svc as unknown as { identityRepository: unknown }).identityRepository = { update };

    await svc.updatePasswordDirectly('u1', 'scrypt$hash');

    expect(update).toHaveBeenCalledWith({ id: 'u1' }, { passwordHash: 'scrypt$hash' });
    expect(update.mock.calls[0][1]).not.toHaveProperty('status');
  });
});
