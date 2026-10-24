import { escapeLikeString } from './sql.util';

describe('SQL Utilities', () => {
  describe('escapeLikeString', () => {
    it('escapes percentage wildcard %', () => {
      expect(escapeLikeString('100% discount')).toBe('100\\% discount');
    });

    it('escapes underscore wildcard _', () => {
      expect(escapeLikeString('user_name')).toBe('user\\_name');
    });

    it('escapes backslashes', () => {
      expect(escapeLikeString('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('leaves normal alphanumeric text untouched', () => {
      expect(escapeLikeString('Payment App 2026')).toBe('Payment App 2026');
    });

    it('handles empty or undefined strings safely', () => {
      expect(escapeLikeString('')).toBe('');
      expect(escapeLikeString(null as any)).toBe('');
    });
  });
});
