import { keepLifecycleConfigKeys } from './lifecycle-config-keys';

const live = {
  urlScheme: 'amsattendance://login',
  superAppTestVersion: 'v1.1.4',
  superAppReleaseVersion: 'v1.1.5',
};

describe('keepLifecycleConfigKeys', () => {
  it('puts the live lifecycle keys back into a revision config', () => {
    expect(
      keepLifecycleConfigKeys({ urlScheme: 'amsattendance://home' }, live),
    ).toEqual({
      urlScheme: 'amsattendance://home',
      superAppTestVersion: 'v1.1.4',
      superAppReleaseVersion: 'v1.1.5',
    });
  });

  it('the live row wins over a stale value', () => {
    const kept = keepLifecycleConfigKeys(
      { superAppReleaseVersion: 'v1.0.0' },
      live,
    );
    expect(kept.superAppReleaseVersion).toBe('v1.1.5');
  });

  it('adds nothing the live config lacks and passes non-objects through', () => {
    expect(
      keepLifecycleConfigKeys({ urlScheme: 'x://' }, { urlScheme: 'y://' }),
    ).toEqual({ urlScheme: 'x://' });
    expect(keepLifecycleConfigKeys(null, live)).toBeNull();
    expect(keepLifecycleConfigKeys(undefined, live)).toBeUndefined();
    expect(keepLifecycleConfigKeys({ a: 1 }, null)).toEqual({ a: 1 });
  });

  it('is idempotent', () => {
    const once = keepLifecycleConfigKeys({ urlScheme: 'x://' }, live);
    expect(keepLifecycleConfigKeys(once, live)).toEqual(once);
  });
});
