import {
  appStatusOf,
  availabilityOf,
  lifecycleOf,
  revisionRowOf,
  servingRowOf,
  stageOfLifecycle,
} from './app-status';

describe('one status per question (Phase 6)', () => {
  it('app status from the old pair', () => {
    expect(appStatusOf('ARCHIVED', 'SUSPENDED')).toBe('ARCHIVED');
    expect(appStatusOf('ACTIVE', 'SUSPENDED')).toBe('SUSPENDED');
    expect(appStatusOf('TESTING', 'SUSPENDED')).toBe('SUSPENDED');
    expect(appStatusOf('ACTIVE', 'PRODUCTION')).toBe('LIVE');
    // Older rows activated as APPROVED + PRODUCTION (rollback) are live
    expect(appStatusOf('APPROVED', 'PRODUCTION')).toBe('LIVE');
    // availability TESTING is every new app's default: not a signal
    expect(appStatusOf('IN_REVIEW', 'TESTING')).toBe('DRAFT');
    expect(appStatusOf(undefined, undefined)).toBe('DRAFT');
  });

  it('version stage from an old lifecycle value; building is the build run', () => {
    expect(stageOfLifecycle('SUBMITTED')).toBe('SUBMITTED');
    expect(stageOfLifecycle('APPROVED_FOR_TESTING')).toBe('APPROVED');
    expect(stageOfLifecycle('BUILDING')).toBe('APPROVED');
    expect(stageOfLifecycle('BUILD_FAILED')).toBe('APPROVED');
    expect(stageOfLifecycle('BUILDING_STAGE_2')).toBe('TEST_PASSED');
    expect(stageOfLifecycle('ACTIVE')).toBe('ACTIVE');
    expect(stageOfLifecycle('SUSPENDED')).toBeNull();
    expect(stageOfLifecycle('ARCHIVED')).toBeNull();
  });

  it('the old lifecycle back from status, stage and the latest build', () => {
    expect(lifecycleOf({ appStatus: 'LIVE' })).toBe('ACTIVE');
    expect(lifecycleOf({ appStatus: 'ARCHIVED', stage: 'DRAFT' })).toBe('ARCHIVED');
    // A suspended live app keeps showing ACTIVE; a suspended test app its stage
    expect(lifecycleOf({ appStatus: 'SUSPENDED', everLive: true })).toBe('ACTIVE');
    expect(lifecycleOf({ appStatus: 'SUSPENDED', stage: 'TESTING' })).toBe('TESTING');
    expect(lifecycleOf({ appStatus: 'DRAFT', stage: 'IN_REVIEW' })).toBe('IN_REVIEW');
    expect(lifecycleOf({ appStatus: 'DRAFT', stage: 'APPROVED', buildStatus: 'BUILDING' })).toBe('BUILDING');
    expect(lifecycleOf({ appStatus: 'DRAFT', stage: 'APPROVED', buildStatus: 'FAILED' })).toBe('BUILD_FAILED');
    expect(lifecycleOf({ appStatus: 'DRAFT', stage: 'APPROVED', buildStatus: 'COMPLETED' })).toBe('APPROVED');
    expect(lifecycleOf({ appStatus: 'DRAFT' })).toBe('DRAFT');
  });

  it('round trip: every old lifecycle value of an unreleased app comes back (building from the run)', () => {
    for (const l of ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED', 'TESTING', 'TEST_PASSED']) {
      expect(lifecycleOf({ appStatus: appStatusOf(l, 'TESTING'), stage: stageOfLifecycle(l) })).toBe(l);
    }
  });

  it('availability back from the app status', () => {
    expect(availabilityOf('LIVE')).toBe('PRODUCTION');
    expect(availabilityOf('SUSPENDED')).toBe('SUSPENDED');
    expect(availabilityOf('ARCHIVED')).toBe('SUSPENDED');
    expect(availabilityOf('DRAFT')).toBe('TESTING');
  });

  it('the row being worked on and the row served', () => {
    const rows = [{ status: 'IN_REVIEW' }, { status: 'ACTIVE' }, { status: 'PREVIOUS' }];
    expect(revisionRowOf(rows)?.status).toBe('IN_REVIEW');
    expect(servingRowOf(rows)?.status).toBe('ACTIVE');
    expect(servingRowOf([{ status: 'TEST_PASSED' }])?.status).toBe('TEST_PASSED');
    expect(revisionRowOf([{ status: 'ACTIVE' }, { status: 'DEPRECATED' }])).toBeUndefined();
  });

  it('writing the old pair on an app sets mini_apps.status', () => {
    const { MiniApp } = require('../entities/miniapp.entity');
    const app = Object.assign(new MiniApp(), { lifecycleStatus: 'ACTIVE', availabilityStatus: 'SUSPENDED' });
    expect(app.appStatus).toBe('SUSPENDED');
    // Nothing written: left alone
    const partial = Object.assign(new MiniApp(), { appStatus: 'LIVE' });
    expect(partial.appStatus).toBe('LIVE');
  });
});
