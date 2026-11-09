import { ConflictException } from '@nestjs/common';
import { LocalBuildsGuard } from './local-builds.guard';
import { localBuildsEnabled } from '../utils/local-workspace.util';

describe('LOCAL_BUILDS_ENABLED switch', () => {
  const original = process.env.LOCAL_BUILDS_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.LOCAL_BUILDS_ENABLED;
    else process.env.LOCAL_BUILDS_ENABLED = original;
  });

  it('is off unless explicitly "true" (unset, empty, false, 1 all mean off)', () => {
    for (const v of [undefined, '', 'false', '1', 'yes']) {
      if (v === undefined) delete process.env.LOCAL_BUILDS_ENABLED;
      else process.env.LOCAL_BUILDS_ENABLED = v;
      expect(localBuildsEnabled()).toBe(false);
    }
    process.env.LOCAL_BUILDS_ENABLED = ' TRUE ';
    expect(localBuildsEnabled()).toBe(true);
  });

  it('LocalBuildsGuard answers 409 with an explanation when disabled', () => {
    delete process.env.LOCAL_BUILDS_ENABLED;
    const guard = new LocalBuildsGuard();
    expect(() => guard.canActivate()).toThrow(ConflictException);
    expect(() => guard.canActivate()).toThrow(/LOCAL_BUILDS_ENABLED=true/);
  });

  it('LocalBuildsGuard lets the request through when enabled', () => {
    process.env.LOCAL_BUILDS_ENABLED = 'true';
    expect(new LocalBuildsGuard().canActivate()).toBe(true);
  });
});
