/**
 * Guard for code that modifies the local `super-app` checkout or runs a local
 * Flutter/Gradle build (pubspec injection, registry generation, APK and sandbox
 * builds). These rewrite tracked files from the current database state, so an
 * empty or test database can silently strip every Mini App package from the
 * mobile app. They only make sense on a developer workstation, never on a
 * shared server (where Jenkins builds instead), so they are OFF unless
 * LOCAL_BUILDS_ENABLED=true is set explicitly.
 */
export const LOCAL_BUILDS_FLAG = 'LOCAL_BUILDS_ENABLED';

export const LOCAL_BUILDS_DISABLED_MESSAGE =
  `Local Super App workspace changes and builds are disabled on this server ` +
  `(set ${LOCAL_BUILDS_FLAG}=true to enable them on a developer workstation). ` +
  `Builds run through Jenkins CI.`;

export function localBuildsEnabled(): boolean {
  return (process.env[LOCAL_BUILDS_FLAG] || '').trim().toLowerCase() === 'true';
}
