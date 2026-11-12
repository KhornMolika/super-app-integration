import { simulatedScanAllowed } from './simulated-scan.policy';

describe('simulatedScanAllowed', () => {
  it('only outside production, unless LOCAL_SCANNER_FALLBACK says otherwise', () => {
    expect(simulatedScanAllowed({ ENVIRONMENT: 'DEV' } as any)).toBe(true);
    expect(simulatedScanAllowed({ ENVIRONMENT: 'PROD' } as any)).toBe(false);
    expect(simulatedScanAllowed({ NODE_ENV: 'production' } as any)).toBe(false);
    expect(simulatedScanAllowed({ NODE_ENV: 'development' } as any)).toBe(true);
    expect(simulatedScanAllowed({ ENVIRONMENT: 'PROD', LOCAL_SCANNER_FALLBACK: 'true' } as any)).toBe(true);
    expect(simulatedScanAllowed({ ENVIRONMENT: 'DEV', LOCAL_SCANNER_FALLBACK: 'false' } as any)).toBe(false);
  });
});
