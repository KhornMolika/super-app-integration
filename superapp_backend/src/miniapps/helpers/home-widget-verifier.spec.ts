import { gitDartFiles, withVerification } from './home-widget-verifier';

const fakeFetch = (map: Record<string, string>) =>
  jest.fn((path: string) =>
    path in map ? Promise.resolve(map[path]) : Promise.reject(new Error('404')),
  );

describe('gitDartFiles', () => {
  it('returns the main library and its relative exports, skipping package:/dart: and failing paths', async () => {
    const fetch = fakeFetch({
      'lib/fsa_hr.dart': [
        "export 'src/hr_widget.dart';",
        "export 'package:other/other.dart';",
        "export 'dart:async';",
        "export 'src/missing.dart';",
      ].join('\n'),
      'lib/src/hr_widget.dart': 'class HrHomeWidget { void onOpen() {} }',
    });

    const files = await gitDartFiles(fetch, 'fsa_hr');

    expect(Object.keys(files).sort()).toEqual([
      'lib/fsa_hr.dart',
      'lib/src/hr_widget.dart',
    ]);
    expect(fetch).not.toHaveBeenCalledWith('lib/package:other/other.dart');
    expect(fetch).toHaveBeenCalledWith('lib/src/missing.dart');
  });

  it('honours packagePath and returns package-root-relative keys', async () => {
    const fetch = fakeFetch({
      'packages/hr/lib/fsa_hr.dart': "export 'src/a.dart';",
      'packages/hr/lib/src/a.dart': 'class A {}',
    });

    const files = await gitDartFiles(fetch, 'fsa_hr', '/packages/hr/');

    expect(Object.keys(files).sort()).toEqual(['lib/fsa_hr.dart', 'lib/src/a.dart']);
    expect(fetch).toHaveBeenCalledWith('packages/hr/lib/fsa_hr.dart');
  });

  it('follows exports transitively, resolving each relative to its exporting file', async () => {
    const fetch = fakeFetch({
      'lib/p.dart': "export 'src/a.dart';",
      'lib/src/a.dart': "export 'widgets/b.dart';",
      'lib/src/widgets/b.dart': "export '../c.dart';",
      'lib/src/c.dart': 'class C {}',
    });

    const files = await gitDartFiles(fetch, 'p');

    expect(Object.keys(files).sort()).toEqual([
      'lib/p.dart',
      'lib/src/a.dart',
      'lib/src/c.dart',
      'lib/src/widgets/b.dart',
    ]);
  });

  it('is cycle-safe', async () => {
    const fetch = fakeFetch({
      'lib/p.dart': "export 'a.dart';",
      'lib/a.dart': "export 'p.dart';\nexport 'a.dart';",
    });

    const files = await gitDartFiles(fetch, 'p');

    expect(Object.keys(files).sort()).toEqual(['lib/a.dart', 'lib/p.dart']);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not escape the package root', async () => {
    const fetch = fakeFetch({ 'lib/p.dart': "export '../../outside.dart';" });

    await gitDartFiles(fetch, 'p');

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('caps the number of fetched files at 50', async () => {
    const exports = Array.from({ length: 80 }, (_, i) => `export 'f${i}.dart';`);
    const map: Record<string, string> = { 'lib/p.dart': exports.join('\n') };
    for (let i = 0; i < 80; i++) map[`lib/f${i}.dart`] = 'class X {}';
    const fetch = fakeFetch(map);

    const files = await gitDartFiles(fetch, 'p');

    expect(fetch).toHaveBeenCalledTimes(50);
    expect(Object.keys(files)).toHaveLength(50);
  });

  it('returns {} when the main library cannot be fetched', async () => {
    expect(await gitDartFiles(fakeFetch({}), 'p')).toEqual({});
  });
});

describe('withVerification', () => {
  it('sets verifiedClass to widgetClass when verified', () => {
    expect(withVerification({ widgetClass: 'HrHomeWidget' }, true)).toEqual({
      widgetClass: 'HrHomeWidget',
      verifiedClass: 'HrHomeWidget',
    });
  });

  it('clears verifiedClass when not verified, without mutating the input', () => {
    const input = { widgetClass: 'HrHomeWidget', verifiedClass: 'HrHomeWidget' };
    expect(withVerification(input, false)).toEqual({ widgetClass: 'HrHomeWidget' });
    expect(input.verifiedClass).toBe('HrHomeWidget');
  });

  it('passes null and undefined through', () => {
    expect(withVerification(null, true)).toBeNull();
    expect(withVerification(undefined, true)).toBeUndefined();
  });
});
