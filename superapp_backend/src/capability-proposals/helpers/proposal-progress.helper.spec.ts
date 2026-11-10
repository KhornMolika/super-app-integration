import { buildProposalProgress } from './proposal-progress.helper';

const base = {
  id: 'p1',
  capabilityKey: 'microphone',
  createdAt: new Date('2026-11-01T10:00:00Z'),
  updatedAt: new Date('2026-11-02T10:00:00Z'),
  requestedBy: { name: 'Dara' },
  miniApp: { name: 'KYC' },
} as any;

const states = (p: ReturnType<typeof buildProposalProgress>) =>
  Object.fromEntries(p.steps.map((s) => [s.key, s.state]));

describe('buildProposalProgress', () => {
  it('pending: requested, then waiting for review', () => {
    const p = buildProposalProgress({ ...base, status: 'PENDING_REVIEW', metadata: { supporters: [{}, {}] } }, null);
    expect(states(p)).toEqual({
      requested: 'done',
      review: 'current',
      decision: 'pending',
      code_change: 'pending',
      merged: 'pending',
      release: 'pending',
    });
    expect(p.steps[0].detail).toBe('Dara, for KYC (2 more mini apps asked for it too)');
  });

  it('rejected: stops at the decision and shows the reason', () => {
    const p = buildProposalProgress(
      { ...base, status: 'REJECTED', adminDecisionReason: 'Use scan_qr_code instead.' },
      null,
    );
    expect(p.steps.map((s) => s.key)).toEqual(['requested', 'review', 'decision']);
    expect(p.steps[2]).toMatchObject({ state: 'failed', detail: 'Use scan_qr_code instead.' });
  });

  it('approved with a merge request: merged comes from GitLab, release from the version', () => {
    const approved = {
      ...base,
      status: 'APPROVED',
      targetSuperAppVersion: '1.4.0',
      metadata: {
        codeChange: {
          status: 'needs_work',
          mrUrl: 'https://git/x/-/merge_requests/3',
          issueUrl: 'https://git/x/-/issues/9',
          targetBranch: 'development',
        },
      },
    };
    const open = buildProposalProgress(approved, 'opened');
    expect(states(open)).toMatchObject({ decision: 'done', code_change: 'done', merged: 'current', release: 'pending' });
    expect(open.steps.find((s) => s.key === 'code_change')!.links!.map((l) => l.label)).toEqual([
      'Code change',
      'Task for the Super App team',
    ]);
    expect(open.steps.at(-1)!.label).toBe('Ships in 1.4.0');

    expect(states(buildProposalProgress(approved, 'merged')).merged).toBe('done');
    expect(states(buildProposalProgress(approved, 'closed')).merged).toBe('failed');
    expect(states(buildProposalProgress(approved, 'unknown')).merged).toBe('unknown');
    const shipped = buildProposalProgress({ ...approved, implementedInSuperAppVersion: '1.4.0' }, 'merged');
    expect(shipped.steps.at(-1)).toMatchObject({ label: 'Released in 1.4.0', state: 'done' });
  });

  it('approved, code change failed or not needed', () => {
    const failed = buildProposalProgress(
      { ...base, status: 'APPROVED', metadata: { codeChange: { status: 'failed', error: 'GitLab down' } } },
      null,
    );
    expect(failed.steps.find((s) => s.key === 'code_change')).toMatchObject({ state: 'failed', detail: 'GitLab down' });

    const notNeeded = buildProposalProgress(
      { ...base, status: 'APPROVED', metadata: { codeChange: { status: 'not_needed', message: 'Built in.' } } },
      null,
    );
    expect(states(notNeeded)).toMatchObject({ code_change: 'done', merged: 'skipped' });
  });
});
