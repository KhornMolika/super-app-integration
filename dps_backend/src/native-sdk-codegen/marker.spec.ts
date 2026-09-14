import { replaceMarkedRegion } from './marker';

const file = [
  'header line',
  '// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===',
  'stale content',
  '// === END GENERATED NATIVE SDK IMPORTS ===',
  'footer line',
].join('\n');

describe('replaceMarkedRegion', () => {
  it('replaces the body between the markers', () => {
    const out = replaceMarkedRegion(file, 'IMPORTS', 'fresh content');
    expect(out).toBe(
      [
        'header line',
        '// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===',
        'fresh content',
        '// === END GENERATED NATIVE SDK IMPORTS ===',
        'footer line',
      ].join('\n'),
    );
  });

  it('leaves content outside the markers untouched', () => {
    const out = replaceMarkedRegion(file, 'IMPORTS', 'x');
    expect(out).toContain('header line');
    expect(out).toContain('footer line');
  });

  it('collapses to just the marker pair when the body is empty', () => {
    const out = replaceMarkedRegion(file, 'IMPORTS', '');
    expect(out).toBe(
      [
        'header line',
        '// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===',
        '// === END GENERATED NATIVE SDK IMPORTS ===',
        'footer line',
      ].join('\n'),
    );
  });

  it('is idempotent when given the same body twice', () => {
    const once = replaceMarkedRegion(file, 'IMPORTS', 'same');
    expect(replaceMarkedRegion(once, 'IMPORTS', 'same')).toBe(once);
  });

  it('works with a hash comment marker', () => {
    const podfile = [
      '# === GENERATED NATIVE SDK PODS — DO NOT EDIT ===',
      '# === END GENERATED NATIVE SDK PODS ===',
    ].join('\n');
    expect(replaceMarkedRegion(podfile, 'PODS', "  pod 'X'")).toContain("  pod 'X'");
  });

  it('throws when the begin marker is missing', () => {
    expect(() => replaceMarkedRegion('nothing here', 'IMPORTS', 'x')).toThrow(
      /begin marker/i,
    );
  });

  it('throws when the end marker is missing', () => {
    const broken = '// === GENERATED NATIVE SDK IMPORTS — DO NOT EDIT ===';
    expect(() => replaceMarkedRegion(broken, 'IMPORTS', 'x')).toThrow(/end marker/i);
  });

  it('throws when the markers appear more than once', () => {
    const dup = [file, file].join('\n');
    expect(() => replaceMarkedRegion(dup, 'IMPORTS', 'x')).toThrow(/more than once/i);
  });
});
