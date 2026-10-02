import {
  encryptCredential,
  decryptCredential,
  isMaskedCredential,
  maskCredential,
} from '../../common/utils/credential-cipher.util';

export interface FlutterIntegrationConfig {
  deployKey?: string;
  gitAccessToken?: string;
  token?: string;
  hasDeployKey?: boolean;
  hasGitAccessToken?: boolean;
  [key: string]: unknown;
}

export interface MiniAppWithCredentials {
  integrationConfig?: FlutterIntegrationConfig | null;
  pendingRevision?: {
    integrationConfig?: FlutterIntegrationConfig | null;
    [key: string]: unknown;
  } | null;
  versionHistory?: Array<{
    integrationConfig?: FlutterIntegrationConfig | null;
    [key: string]: unknown;
  }> | null;
  [key: string]: unknown;
}

/**
 * Processes incoming integrationConfig for Flutter packages before persisting:
 * - Retains existing encrypted keys if the client submitted a masked placeholder (********)
 * - Encrypts any newly provided private deployKey or gitAccessToken using AES-256-GCM
 */
export function secureFlutterIntegrationConfig(
  incoming?: FlutterIntegrationConfig | null,
  existing?: FlutterIntegrationConfig | null,
): FlutterIntegrationConfig | undefined | null {
  if (!incoming || typeof incoming !== 'object') {
    return incoming;
  }

  const result: FlutterIntegrationConfig = { ...incoming };

  // 1. Secure deployKey
  const incomingDeployKey =
    typeof incoming.deployKey === 'string' ? incoming.deployKey : undefined;
  if (
    isMaskedCredential(incomingDeployKey) ||
    (!incomingDeployKey && existing?.deployKey)
  ) {
    if (existing?.deployKey) {
      result.deployKey = existing.deployKey;
    } else {
      delete result.deployKey;
    }
  } else if (incomingDeployKey && incomingDeployKey.trim()) {
    result.deployKey = encryptCredential(incomingDeployKey.trim());
  }

  // 2. Secure gitAccessToken
  const incomingToken =
    (typeof incoming.gitAccessToken === 'string'
      ? incoming.gitAccessToken
      : undefined) ||
    (typeof incoming.token === 'string' ? incoming.token : undefined);
  const existingToken = existing?.gitAccessToken || existing?.token;

  if (isMaskedCredential(incomingToken) || (!incomingToken && existingToken)) {
    if (existingToken) {
      result.gitAccessToken = existingToken;
      if (result.token) result.token = existingToken;
    }
  } else if (incomingToken && incomingToken.trim()) {
    const encryptedToken = encryptCredential(incomingToken.trim());
    result.gitAccessToken = encryptedToken;
    if (result.token) result.token = encryptedToken;
  }

  return result;
}

/**
 * Extracts and decrypts the deployKey in-memory for background runners (Jenkins, git ls-remote).
 */
export function extractDecryptedDeployKey(
  config?: FlutterIntegrationConfig | string | null,
): string {
  if (!config) return '';
  const rawKey =
    typeof config === 'string' ? config : (config.deployKey as string);
  if (!rawKey) return '';
  return decryptCredential(rawKey);
}

/**
 * Extracts and decrypts the git access token in-memory for background runners.
 */
export function extractDecryptedGitToken(
  config?: FlutterIntegrationConfig | string | null,
): string {
  if (!config) return '';
  const rawToken =
    typeof config === 'string'
      ? config
      : (config.gitAccessToken as string) || (config.token as string);
  if (!rawToken) return '';
  return decryptCredential(rawToken);
}

/**
 * Sanitizes a single integrationConfig dictionary by replacing sensitive credentials
 * with masked strings and setting boolean presence indicators.
 */
function sanitizeConfigDictionary(
  config: FlutterIntegrationConfig | null | undefined,
): FlutterIntegrationConfig | null | undefined {
  if (!config || typeof config !== 'object') return config;
  const copy: FlutterIntegrationConfig = { ...config };

  if (typeof copy.deployKey === 'string' && copy.deployKey) {
    copy.hasDeployKey = true;
    copy.deployKey = maskCredential(copy.deployKey);
  } else {
    copy.hasDeployKey = false;
  }

  const hasToken = Boolean(copy.gitAccessToken || copy.token);
  if (hasToken) {
    copy.hasGitAccessToken = true;
    if (typeof copy.gitAccessToken === 'string') {
      copy.gitAccessToken = maskCredential(copy.gitAccessToken);
    }
    if (typeof copy.token === 'string') {
      copy.token = maskCredential(copy.token);
    }
  } else {
    copy.hasGitAccessToken = false;
  }

  return copy;
}

/**
 * Recursively masks sensitive credentials in a MiniApp entity or plain object before
 * returning over HTTP API responses.
 */
export function maskMiniAppCredentials<T>(app: T): T {
  if (!app || typeof app !== 'object') return app;

  const target = app as Record<string, unknown>;

  // Mask main integrationConfig
  if (target.integrationConfig && typeof target.integrationConfig === 'object') {
    target.integrationConfig = sanitizeConfigDictionary(
      target.integrationConfig as FlutterIntegrationConfig,
    );
  }

  // Mask pendingRevision.integrationConfig
  if (target.pendingRevision && typeof target.pendingRevision === 'object') {
    const pending = target.pendingRevision as Record<string, unknown>;
    if (pending.integrationConfig && typeof pending.integrationConfig === 'object') {
      pending.integrationConfig = sanitizeConfigDictionary(
        pending.integrationConfig as FlutterIntegrationConfig,
      );
    }
  }

  // Mask versionHistory entries
  if (Array.isArray(target.versionHistory)) {
    target.versionHistory = target.versionHistory.map((v: unknown) => {
      if (v && typeof v === 'object') {
        const item = v as Record<string, unknown>;
        if (item.integrationConfig && typeof item.integrationConfig === 'object') {
          return {
            ...item,
            integrationConfig: sanitizeConfigDictionary(
              item.integrationConfig as FlutterIntegrationConfig,
            ),
          };
        }
      }
      return v;
    });
  }

  return app;
}
