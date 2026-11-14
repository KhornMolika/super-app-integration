import { retirementStateOf } from './status-events';

const at = (min: number) => new Date(Date.UTC(2026, 9, 1, 8, min)).toISOString();

describe('suspension and archive request replayed from the status events', () => {
  it('a suspension, then an archive request', () => {
    const state = retirementStateOf([
      { type: 'ARCHIVE_REQUESTED', reason: 'Retire it', actorId: 'u1', actorName: 'Ada', createdAt: at(1) },
      { type: 'SUSPENDED', reason: 'Fraud alert', actorId: 'u1', actorName: 'Ada', previousAvailability: 'PRODUCTION', createdAt: at(0) },
    ]);
    expect(state.suspension).toEqual({
      reason: 'Fraud alert',
      suspendedById: 'u1',
      suspendedByName: 'Ada',
      suspendedAt: at(0),
      previousAvailability: 'PRODUCTION',
    });
    expect(state.archiveRequest).toEqual({ reason: 'Retire it', requestedById: 'u1', requestedByName: 'Ada', requestedAt: at(1) });
  });

  it('archiving keeps who suspended it, takes the archive reason and ends the request', () => {
    const state = retirementStateOf([
      { type: 'SUSPENDED', reason: 'Fraud alert', actorName: 'Ada', previousAvailability: 'PRODUCTION', createdAt: at(0) },
      { type: 'ARCHIVE_REQUESTED', reason: 'Retire it', createdAt: at(1) },
      { type: 'ARCHIVED', reason: 'End of service', actorName: 'Root', createdAt: at(2) },
    ]);
    expect(state.suspension).toMatchObject({ reason: 'End of service', suspendedByName: 'Ada', archivedAt: at(2) });
    expect(state.archiveRequest).toBeNull();
  });

  it('archiving a live app (never suspended) records its availability', () => {
    const state = retirementStateOf([
      { type: 'ARCHIVED', reason: 'End of service', actorName: 'Root', previousAvailability: 'PRODUCTION', createdAt: at(2) },
    ]);
    expect(state.suspension).toMatchObject({ suspendedByName: 'Root', previousAvailability: 'PRODUCTION', archivedAt: at(2) });
  });

  it('resume, restore and decline clear what they end', () => {
    expect(
      retirementStateOf([
        { type: 'SUSPENDED', reason: 'x', createdAt: at(0) },
        { type: 'RESUMED', createdAt: at(1) },
      ]),
    ).toEqual({ suspension: null, archiveRequest: null });
    expect(
      retirementStateOf([
        { type: 'SUSPENDED', reason: 'x', createdAt: at(0) },
        { type: 'ARCHIVE_REQUESTED', reason: 'y', createdAt: at(1) },
        { type: 'ARCHIVE_DECLINED', createdAt: at(2) },
      ]).archiveRequest,
    ).toBeNull();
    expect(
      retirementStateOf([
        { type: 'ARCHIVED', reason: 'x', createdAt: at(0) },
        { type: 'RESTORED', createdAt: at(1) },
      ]).suspension,
    ).toBeNull();
  });
});
