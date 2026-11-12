import { BadRequestException } from '@nestjs/common';
import { assertSecurityScanNotFailed } from './miniapp-lifecycle.helper';

describe('assertSecurityScanNotFailed (no approval after a failed scan)', () => {
  it('refuses a new app whose scan failed', () => {
    expect(() => assertSecurityScanNotFailed({ validationStatus: 'FAILED' })).toThrow(BadRequestException);
    expect(() => assertSecurityScanNotFailed({ validationStatus: 'failed' })).toThrow(BadRequestException);
  });

  it('allows a passed scan, and older apps without a recorded scan', () => {
    expect(() => assertSecurityScanNotFailed({ validationStatus: 'PASSED' })).not.toThrow();
    expect(() => assertSecurityScanNotFailed({})).not.toThrow();
  });

  it('judges a revision by its own scan, not the live version', () => {
    expect(() =>
      assertSecurityScanNotFailed({ validationStatus: 'PASSED', pendingRevision: { validationStatus: 'FAILED' } }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertSecurityScanNotFailed({ validationStatus: 'FAILED', pendingRevision: { validationStatus: 'PASSED' } }),
    ).not.toThrow();
  });
});
