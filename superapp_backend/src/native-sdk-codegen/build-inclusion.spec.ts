import {
  buildExclusionReason,
  buildStagesFor,
  parseBuildType,
} from './build-inclusion';

const app = (lifecycleStatus: string, extra: Record<string, string> = {}) => ({
  lifecycleStatus,
  ...extra,
});

describe('Super App build inclusion', () => {
  describe('test build (debug)', () => {
    it.each([
      ['a live app', app('ACTIVE')],
      [
        'a live app whose pending revision failed its scan',
        app('ACTIVE', { validationStatus: 'FAILED' }),
      ],
      ['an app under test', app('TESTING')],
      ['an app that passed testing', app('TEST_PASSED')],
      [
        'the app whose test build is running',
        app('APPROVED', { buildStatus: 'BUILDING' }),
      ],
      ['a queued test build', app('APPROVED', { buildStatus: 'QUEUED' })],
    ])('includes %s', (_label, candidate) => {
      expect(buildExclusionReason(candidate, 'debug')).toBeNull();
    });

    it.each([
      [
        'an app whose test build failed',
        app('APPROVED', { buildStatus: 'FAILED' }),
        /test build failed/,
      ],
      [
        'an approved app whose build never started',
        app('APPROVED'),
        /has not been started/,
      ],
      [
        'a legacy BUILD_FAILED app',
        app('BUILD_FAILED'),
        /not part of a test build/,
      ],
      [
        'an app under test whose scan failed',
        app('TESTING', { validationStatus: 'FAILED' }),
        /scan failed/,
      ],
      ['a draft', app('DRAFT'), /not part/],
      ['an app in review', app('IN_REVIEW'), /not part/],
      ['a rejected app', app('REJECTED'), /not part/],
      ['an archived app', app('ARCHIVED'), /not part/],
    ])('leaves out %s', (_label, candidate, reason) => {
      expect(buildExclusionReason(candidate, 'debug')).toMatch(reason);
    });
  });

  describe('release build', () => {
    it('bundles live apps only', () => {
      expect(buildStagesFor('release')).toEqual(['ACTIVE']);
      expect(buildExclusionReason(app('ACTIVE'), 'release')).toBeNull();
    });

    it.each(['TESTING', 'TEST_PASSED', 'APPROVED'])(
      'never ships a %s app to production',
      (stage) => {
        expect(
          buildExclusionReason(
            app(stage, { buildStatus: 'BUILDING' }),
            'release',
          ),
        ).toMatch(/not part of a release build/);
      },
    );
  });

  it('defaults to the test build when Jenkins sends no type (superset, nothing goes missing)', () => {
    expect(parseBuildType(undefined)).toBe('debug');
    expect(parseBuildType('')).toBe('debug');
    expect(parseBuildType('RELEASE')).toBe('release');
    expect(parseBuildType('debug')).toBe('debug');
    expect(parseBuildType('anything')).toBe('debug');
  });
});
