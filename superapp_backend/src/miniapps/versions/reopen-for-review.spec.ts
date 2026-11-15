import { BadRequestException } from '@nestjs/common';
import { nextPatchVersion } from './miniapp-versions.service';
import { assertRevisionScanPassed } from '../helpers/miniapp-lifecycle.helper';

describe('restore as a new version', () => {
  it('takes the next free patch version', () => {
    expect(nextPatchVersion('1.2.0', ['1.2.0'])).toBe('1.2.1');
    expect(nextPatchVersion('1.2.0', ['1.2.0', '1.2.1', '1.2.2'])).toBe(
      '1.2.3',
    );
    expect(nextPatchVersion('2.0.5-beta', ['2.0.5-beta'])).toBe('2.0.6');
    expect(nextPatchVersion('not-a-version', [])).toBe('1.0.1');
  });
});

describe('publishing a new version of a live app', () => {
  const rev = (validationStatus?: string) => ({
    pendingRevision: { revisionStatus: 'IN_REVIEW', validationStatus },
  });

  it('needs its own scan to have passed', () => {
    expect(() => assertRevisionScanPassed(rev('PASSED'))).not.toThrow();
    expect(() => assertRevisionScanPassed(rev('RUNNING'))).toThrow(
      /still running/,
    );
    expect(() => assertRevisionScanPassed(rev('PENDING'))).toThrow(
      BadRequestException,
    );
    expect(() => assertRevisionScanPassed(rev(undefined))).toThrow(
      /not passed a security scan/,
    );
  });

  it('leaves a FAILED scan and an app without a new version to the other checks', () => {
    expect(() => assertRevisionScanPassed(rev('FAILED'))).not.toThrow();
    expect(() =>
      assertRevisionScanPassed({ pendingRevision: null }),
    ).not.toThrow();
  });
});
