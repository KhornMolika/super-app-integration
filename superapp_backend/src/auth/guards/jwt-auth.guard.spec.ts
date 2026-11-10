import { describeTokenProblem } from './jwt-auth.guard';
import { BACK_OFFICE_TYP } from '../auth.service';

const jwt = (claims: Record<string, unknown>) =>
  `x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;

describe('describeTokenProblem (log text only)', () => {
  const now = Math.floor(Date.now() / 1000);

  it('says when the token expired', () => {
    expect(describeTokenProblem(jwt({ sub: 'u1', typ: BACK_OFFICE_TYP, exp: now - 90 }), new Error('x'))).toMatch(
      /expired \d+s ago \(user u1\)/,
    );
  });

  it('says when the token is of another type', () => {
    expect(describeTokenProblem(jwt({ sub: 'u1', typ: 'end_user', exp: now + 60 }), new Error('x'))).toMatch(
      /type is "end_user"/,
    );
  });

  it('points at the key or issuer when a valid-looking token fails', () => {
    expect(describeTokenProblem(jwt({ sub: 'u1', typ: BACK_OFFICE_TYP, exp: now + 60 }), new Error('invalid signature'))).toMatch(
      /invalid signature; wrong signing key or issuer/,
    );
  });

  it('handles garbage and never echoes the token', () => {
    expect(describeTokenProblem('not-a-jwt', new Error('x'))).toBe('token is not a readable JWT');
    const t = jwt({ sub: 'u1', typ: BACK_OFFICE_TYP, exp: now + 60 });
    expect(describeTokenProblem(t, new Error('x'))).not.toContain(t);
  });
});
