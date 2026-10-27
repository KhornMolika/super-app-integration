import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

/** system_settings key, edited by super-admins via PUT /settings/:key. */
export const MOBILE_APP_CONFIG_KEY = 'mobile_app_config';

export interface PlatformUpdateConfig {
  minVersion: string;
  latestVersion: string;
  storeUrl: string | null;
}

export interface LocalizedText {
  en: string | null;
  km: string | null;
}

export interface MobileAppConfig {
  ios: PlatformUpdateConfig;
  android: PlatformUpdateConfig;
  updateMessage: LocalizedText;
  legal: { privacyPolicyUrl: LocalizedText; termsUrl: LocalizedText };
}

const VERSION = /^\d{1,6}(\.\d{1,6}){0,2}$/;
const NO_VERSION = '0.0.0';

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isProvided = (v: unknown): boolean => v !== undefined && v !== null;

// Field parsers return null when the value is not acceptable.
const parseVersion = (v: unknown): string | null =>
  typeof v === 'string' && VERSION.test(v.trim()) ? v.trim() : null;

function parseHttpsUrl(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 2048) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function parseText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/**
 * Walks the raw setting once, building the sanitized config and collecting the
 * paths (never the values) of provided fields that had to be dropped.
 */
class ConfigReader {
  readonly rejected: string[] = [];

  /** The section as an object, or {} (recording the path when it was provided but is not an object). */
  section(raw: unknown, path: string): Record<string, unknown> {
    if (isObject(raw)) return raw;
    if (isProvided(raw)) this.rejected.push(path);
    return {};
  }

  field<T>(
    raw: unknown,
    path: string,
    parse: (x: unknown) => string | null,
    fallback: T,
  ): string | T {
    const v = parse(raw);
    if (v !== null) return v;
    if (isProvided(raw)) this.rejected.push(path);
    return fallback;
  }

  platform(raw: unknown, path: string): PlatformUpdateConfig {
    const o = this.section(raw, path);
    return {
      minVersion: this.field(
        o.minVersion,
        `${path}.minVersion`,
        parseVersion,
        NO_VERSION,
      ),
      latestVersion: this.field(
        o.latestVersion,
        `${path}.latestVersion`,
        parseVersion,
        NO_VERSION,
      ),
      storeUrl: this.field(o.storeUrl, `${path}.storeUrl`, parseHttpsUrl, null),
    };
  }

  localized(
    raw: unknown,
    path: string,
    parse: (x: unknown) => string | null,
  ): LocalizedText {
    const o = this.section(raw, path);
    return {
      en: this.field(o.en, `${path}.en`, parse, null),
      km: this.field(o.km, `${path}.km`, parse, null),
    };
  }
}

/**
 * Never throws. Anything malformed degrades to "no update required" or a null
 * URL, so a bad admin edit can never lock users out of the app (fail open).
 * `rejected` lists the paths of provided fields that were dropped (for logging).
 */
export function inspectMobileAppConfig(raw: unknown): {
  config: MobileAppConfig;
  rejected: string[];
} {
  const r = new ConfigReader();
  const o = isObject(raw) ? raw : {};
  const ios = r.platform(o.ios, 'ios');
  const android = r.platform(o.android, 'android');
  const updateMessage = r.localized(o.updateMessage, 'updateMessage', (x) =>
    parseText(x, 500),
  );
  const legal = r.section(o.legal, 'legal');
  const config: MobileAppConfig = {
    ios,
    android,
    updateMessage,
    legal: {
      privacyPolicyUrl: r.localized(
        legal.privacyPolicyUrl,
        'legal.privacyPolicyUrl',
        parseHttpsUrl,
      ),
      termsUrl: r.localized(legal.termsUrl, 'legal.termsUrl', parseHttpsUrl),
    },
  };
  return { config, rejected: r.rejected };
}

/** Sanitized config only; see inspectMobileAppConfig for the fail-open rules. */
export function sanitizeMobileAppConfig(raw: unknown): MobileAppConfig {
  return inspectMobileAppConfig(raw).config;
}

@Injectable()
export class MobileAppConfigService {
  private readonly logger = new Logger(MobileAppConfigService.name);
  private warnedMissing = false;
  /** Rejected-path set last warned about; null when the last read had none. */
  private warnedRejected: string | null = null;

  constructor(private readonly settings: SettingsService) {}

  async get(): Promise<MobileAppConfig> {
    let raw: unknown;
    try {
      raw = await this.settings.getSetting<unknown>(MOBILE_APP_CONFIG_KEY);
    } catch {
      this.logger.warn(
        `Could not read ${MOBILE_APP_CONFIG_KEY}; serving defaults`,
      );
      return sanitizeMobileAppConfig(undefined);
    }
    if (!isProvided(raw)) {
      // Normal until an admin configures it, so warn once per process, not per request.
      if (!this.warnedMissing) {
        this.warnedMissing = true;
        this.logger.warn(
          `${MOBILE_APP_CONFIG_KEY} is not set; serving defaults (no update required)`,
        );
      }
    } else if (!isObject(raw)) {
      this.logger.warn(
        `${MOBILE_APP_CONFIG_KEY} is not an object; serving defaults`,
      );
    }
    const { config, rejected } = inspectMobileAppConfig(raw);
    if (rejected.length === 0) {
      this.warnedRejected = null; // valid again: a future bad config warns again
    } else {
      // Every app start calls this, so warn only when the rejected set changes.
      // Paths only: values may be admin typos or URLs and must not reach the logs.
      const paths = rejected.join(', ');
      if (paths !== this.warnedRejected) {
        this.warnedRejected = paths;
        this.logger.warn(
          `${MOBILE_APP_CONFIG_KEY} has invalid fields, using defaults for: ${paths}`,
        );
      }
    }
    return config;
  }
}
