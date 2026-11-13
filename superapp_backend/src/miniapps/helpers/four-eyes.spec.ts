import { fourEyesViolation } from './four-eyes';

describe('four-eyes approval', () => {
  const saved = process.env.FOUR_EYES_APPROVAL;
  afterEach(() => {
    if (saved === undefined) delete process.env.FOUR_EYES_APPROVAL;
    else process.env.FOUR_EYES_APPROVAL = saved;
  });

  it('lets someone other than the owner and the submitter approve', () => {
    expect(fourEyesViolation('reviewer', 'owner', 'dev')).toBeNull();
  });

  it('refuses the owner', () => {
    expect(fourEyesViolation('owner', 'owner', 'dev')).toMatch(/You own this/);
  });

  it('refuses the submitter', () => {
    expect(fourEyesViolation('dev', 'owner', 'dev')).toMatch(/You submitted/);
  });

  it('can be turned off for a single-person local setup', () => {
    process.env.FOUR_EYES_APPROVAL = 'false';
    expect(fourEyesViolation('owner', 'owner', 'owner')).toBeNull();
  });
});
