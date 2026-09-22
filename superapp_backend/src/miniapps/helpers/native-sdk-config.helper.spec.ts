import {
  latestCodegenMrIid,
  parseMergeRequestIid,
} from './native-sdk-config.helper';

describe('parseMergeRequestIid', () => {
  it.each([
    ['https://gitlab.com/g/p/-/merge_requests/42', '42'],
    ['https://gitlab.example.com/a/b/c/-/merge_requests/7/diffs', '7'],
    ['https://gitlab.com/g/p/-/merge_requests/9?x=1', '9'],
  ])('extracts the iid from %s', (url, iid) => {
    expect(parseMergeRequestIid(url)).toBe(iid);
  });

  it.each([
    undefined,
    null,
    42,
    '',
    'https://github.com/o/r/pull/12',
    'https://gitlab.com/g/p/-/merge_requests/abc',
    'https://gitlab.com/g/p/-/merge_requests/1234567890123',
  ])('returns undefined for %p', (v) => {
    expect(parseMergeRequestIid(v)).toBeUndefined();
  });
});

describe('latestCodegenMrIid', () => {
  it('returns the highest iid numerically (not lexically)', () => {
    expect(
      latestCodegenMrIid([
        { codegenPrUrl: 'https://gitlab.com/g/p/-/merge_requests/9' },
        { codegenPrUrl: 'https://gitlab.com/g/p/-/merge_requests/10' },
        {},
        null,
        undefined,
      ]),
    ).toBe('10');
  });

  it('returns undefined when nothing has an MR', () => {
    expect(latestCodegenMrIid([{}, null, { codegenPrUrl: 'x' }])).toBeUndefined();
    expect(latestCodegenMrIid([])).toBeUndefined();
  });
});
