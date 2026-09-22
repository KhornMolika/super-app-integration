import { parseTrustProxy } from './trust-proxy';

describe('parseTrustProxy', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['false', false],
    ['FALSE', false],
    ['1', 1],
    [' 2 ', 2],
  ])('%p -> %p', (input, expected) => {
    expect(parseTrustProxy(input as any)).toBe(expected);
  });

  it('accepts named subnets and IP/CIDR lists', () => {
    expect(parseTrustProxy('loopback')).toEqual(['loopback']);
    expect(parseTrustProxy('loopback, 10.0.0.0/8,2001:db8::/32,192.168.1.5')).toEqual([
      'loopback', '10.0.0.0/8', '2001:db8::/32', '192.168.1.5',
    ]);
  });

  it.each(['true', 'TRUE', ' true ', '0', '-1', 'yes', '10.0.0.0/33', '1.2.3.4/x', 'loopback,,', 'nonsense'])(
    'rejects %p',
    (input) => {
      expect(() => parseTrustProxy(input)).toThrow();
    },
  );

  it('explains why true is unsafe', () => {
    expect(() => parseTrustProxy('true')).toThrow(/spoof/);
  });
});
