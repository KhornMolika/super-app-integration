import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Derives a deterministic 256-bit encryption key using SHA-256.
 */
function getEncryptionKey(): Buffer {
  const rawKey =
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'superapp-dsp-credential-encryption-key-fallback';
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Determines whether a string is already encrypted in the enc:v1 format.
 */
export function isEncryptedCredential(value?: string | null): boolean {
  return Boolean(
    value && typeof value === 'string' && value.startsWith(PREFIX),
  );
}

/**
 * Determines whether a value represents a masked credential placeholder.
 */
export function isMaskedCredential(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return (
    trimmed === '********' ||
    trimmed.startsWith('****') ||
    trimmed === '[CONFIGURED]' ||
    trimmed === '******'
  );
}

/**
 * Returns a masked representation of a credential for safe API responses.
 */
export function maskCredential(value?: string | null): string {
  if (!value) return '';
  return '********';
}

/**
 * Encrypts a sensitive plaintext string using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptCredential(plaintext?: string | null): string {
  if (!plaintext || typeof plaintext !== 'string') {
    return '';
  }

  // Idempotent: avoid re-encrypting already encrypted values
  if (isEncryptedCredential(plaintext)) {
    return plaintext;
  }

  // Never encrypt a masked placeholder
  if (isMaskedCredential(plaintext)) {
    return '';
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Gracefully passes unencrypted legacy values through unchanged.
 */
export function decryptCredential(value?: string | null): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  // If not encrypted, return as-is (backward compatibility with legacy records)
  if (!isEncryptedCredential(value)) {
    return value;
  }

  try {
    const payload = value.slice(PREFIX.length);
    const parts = payload.split(':');
    if (parts.length !== 3) {
      return value;
    }

    const [ivHex, tagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(cipherHex, 'hex');

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    // If decryption fails (corrupted data or mismatched key), fallback gracefully
    return '';
  }
}
