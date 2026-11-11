import { TelegramApiHelper } from './telegram-api.helper';

describe('TelegramApiHelper.sendApkDocument', () => {
  const realFetch = global.fetch;
  const env = { ...process.env };
  beforeEach(() => {
    process.env.NEXUS_BASE_URL = 'http://nexus:8081';
    process.env.NEXUS_ADMIN_PASSWORD = 'p';
  });
  afterEach(() => {
    global.fetch = realFetch;
    process.env = { ...env };
  });

  function mockFetch(apk: { status: number; bytes?: number; declared?: number }) {
    const calls: { url: string; init?: any }[] = [];
    global.fetch = jest.fn(async (url: any, init?: any) => {
      calls.push({ url: String(url), init });
      if (String(url).startsWith('http://nexus:8081/')) {
        const body = apk.status === 200 ? Buffer.alloc(apk.bytes ?? 0) : '';
        const headers = apk.declared ? { 'content-length': String(apk.declared) } : undefined;
        return new Response(body as any, { status: apk.status, headers });
      }
      return new Response('{"ok":true}', { status: 200 });
    }) as any;
    return calls;
  }

  it('sends exactly this version\'s APK from Nexus', async () => {
    const calls = mockFetch({ status: 200, bytes: 20 * 1024 * 1024 });
    const ok = await TelegramApiHelper.sendApkDocument('BOT', '42', 'https://app/x', 'v1.0.6', 'Super App');
    expect(ok).toBe(true);
    expect(calls[0].url).toBe('http://nexus:8081/repository/apk-test-builds/superapp/v1.0.6/superapp-test-v1.0.6.apk');
    expect(calls[0].init.headers.Authorization).toMatch(/^Basic /);
    expect(calls[1].url).toBe('https://api.telegram.org/botBOT/sendDocument');
    expect((calls[1].init.body as FormData).get('chat_id')).toBe('42');
    expect(calls).toHaveLength(2);
  });

  it('never falls back to another version when this one is missing', async () => {
    const calls = mockFetch({ status: 404 });
    expect(await TelegramApiHelper.sendApkDocument('BOT', '42', '', 'v1.0.6', 'A')).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('sends the link instead of a file over 50 MB', async () => {
    const calls = mockFetch({ status: 200, bytes: 10, declared: 80 * 1024 * 1024 });
    expect(await TelegramApiHelper.sendApkDocument('BOT', '42', 'https://app/dl', 'v1.0.6', 'A')).toBe(false);
    expect(calls[1].url).toBe('https://api.telegram.org/botBOT/sendMessage');
    expect(JSON.parse(calls[1].init.body).text).toContain('too large for Telegram');
    expect(JSON.parse(calls[1].init.body).text).toContain('https://app/dl');
  });

  it('refuses a missing or odd version', async () => {
    const calls = mockFetch({ status: 200, bytes: 5000 });
    expect(await TelegramApiHelper.sendApkDocument('BOT', '42', '', '', 'A')).toBe(false);
    expect(await TelegramApiHelper.sendApkDocument('BOT', '42', '', '../x', 'A')).toBe(false);
    expect(calls).toHaveLength(0);
  });
});
