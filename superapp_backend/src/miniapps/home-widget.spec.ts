import {
  homeWidgetLabel,
  normalizeHomeWidget,
  sameHomeWidget,
} from './home-widget';

describe('normalizeHomeWidget', () => {
  it('passes undefined and null through', () => {
    expect(normalizeHomeWidget(undefined, 'FLUTTER_PACKAGE')).toBeUndefined();
    expect(normalizeHomeWidget(null, 'FLUTTER_PACKAGE')).toBeNull();
  });
  it('keeps only the method field, trimmed', () => {
    expect(
      normalizeHomeWidget(
        {
          widgetClass: ' HrHomeWidget ',
          url: 'https://x',
          verifiedClass: 'HrHomeWidget',
        },
        'FLUTTER_PACKAGE',
      ),
    ).toEqual({ widgetClass: 'HrHomeWidget' });
  });
  it.each([
    ['FLUTTER_PACKAGE', { widgetClass: '' }, '"Widget class" is required'],
    ['FLUTTER_PACKAGE', { widgetClass: '   ' }, '"Widget class" is required'],
    ['FLUTTER_PACKAGE', { widgetClass: 'hrHomeWidget' }, 'Dart class name'],
    ['NATIVE_SDK', { viewId: 'Spa-Widget' }, 'lowercase letters'],
    ['DEEP_LINK', { url: 'http://hr.example.com/w' }, 'https://'],
    ['WEBVIEW', { url: 'https://evil.com/w' }, 'allowed domains'],
    [undefined, { widgetClass: 'HrHomeWidget' }, 'integration method first'],
  ])('%s %j → 400 (%s)', (method, input, msg) => {
    expect(() =>
      normalizeHomeWidget(input, method as any, {
        allowedDomains: ['hr.example.com'],
      }),
    ).toThrow(
      expect.objectContaining({ message: expect.stringContaining(msg) }),
    );
  });
  it('accepts allowed host, subdomain, and comma-string domains', () => {
    expect(
      normalizeHomeWidget({ url: 'https://app.hr.example.com/w' }, 'WEBVIEW', {
        allowedDomains: 'a.com, hr.example.com',
      }),
    ).toEqual({ url: 'https://app.hr.example.com/w' });
  });
  it('WEBVIEW with no allowed domains only needs https', () => {
    expect(
      normalizeHomeWidget({ url: 'https://any.com/w' }, 'WEBVIEW', {}),
    ).toEqual({ url: 'https://any.com/w' });
  });
});

describe('sameHomeWidget / homeWidgetLabel', () => {
  it('ignores verifiedClass and treats null/undefined/{} alike', () => {
    expect(
      sameHomeWidget(
        { widgetClass: 'A', verifiedClass: 'A' },
        { widgetClass: 'A' },
      ),
    ).toBe(true);
    expect(sameHomeWidget(null, undefined)).toBe(true);
    expect(sameHomeWidget(null, {})).toBe(true);
    expect(sameHomeWidget(null, { widgetClass: 'A' })).toBe(false);
    expect(homeWidgetLabel(null)).toBe('none');
    expect(homeWidgetLabel({ viewId: 'spa_widget' })).toBe('spa_widget');
  });
});
