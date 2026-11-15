/**
 * Environment for the end-to-end flows. Loaded before the app module (jest
 * setupFiles), so the Nest ConfigModule sees these values: process.env wins
 * over the .env files.
 *
 * The app runs against its own database (dps_e2e, created fresh by
 * global-setup.ts) and never reaches an outside service: Jenkins is replaced by
 * a fake (support/app.ts), the rest point at a closed port or are switched off.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
// Same order as app.module.ts: .env.development first, .env fills the gaps
dotenv.config({
  path: path.join(root, '.env.development'),
  quiet: true,
} as any);
dotenv.config({ path: path.join(root, '.env'), quiet: true } as any);

export const E2E_DB = process.env.E2E_DB_DATABASE || 'dps_e2e';
export const CALLBACK_TOKEN = 'e2e-callback-token';
/** Nothing listens here: a call that slips past the fakes fails at once. */
const CLOSED = 'http://127.0.0.1:9';

Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_DATABASE: E2E_DB,
  DB_SYNC: 'false',
  RELEASE_CALLBACK_TOKEN: CALLBACK_TOKEN,
  TELEGRAM_ENABLED: 'false',
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_CHAT_ID: '',
  RESEND_API_KEY: '',
  JENKINS_URL: CLOSED,
  JENKINS_API_TOKEN: 'e2e',
  NEXUS_BASE_URL: CLOSED,
  NEXUS_PUB_HOSTED_URL: CLOSED,
  NEXUS_PUB_GROUP_URL: CLOSED,
  GITLAB_BASE_URL: CLOSED,
  GITLAB_TOKEN: '',
  GIT_REPO_TOKEN: '',
  CALLBACK_BASE_URL: 'http://127.0.0.1:3999',
  AUTO_DETECT_LAN_IP: 'false',
  LOCAL_BUILDS_ENABLED: 'false',
});
