/**
 * Flutter build mode for Super App test APKs: release (small, fast, what users
 * get) unless SUPERAPP_TEST_APK_BUILD_MODE=debug. A debug APK is several times
 * larger and too big to send to Telegram.
 */
export function testApkBuildMode(): 'release' | 'debug' {
  return (process.env.SUPERAPP_TEST_APK_BUILD_MODE || '').trim().toLowerCase() === 'debug'
    ? 'debug'
    : 'release';
}
