import {
  encryptCredential,
  decryptCredential,
  isEncryptedCredential,
  isMaskedCredential,
  maskCredential,
} from './credential-cipher.util';

describe('CredentialCipherUtil', () => {
  const samplePrivateKey = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACCG1WV7eSQZgVJdi1psBBTdTIrezJXlMFLIzSf/GBcKegAAAJg6L6T7Oi+k
+wAAAAtzc2gtZDI1NTE5AAAAIIbVZXt5JBmBUl2LWmwEFN1Mit7MleUwUsjNJ/8YFwp6
AAAAQAAAAA==
-----END OPENSSH PRIVATE KEY-----`;

  it('encrypts plaintext into the enc:v1 format and decrypts back', () => {
    const encrypted = encryptCredential(samplePrivateKey);
    expect(encrypted).not.toEqual(samplePrivateKey);
    expect(isEncryptedCredential(encrypted)).toBe(true);
    expect(encrypted.startsWith('enc:v1:')).toBe(true);

    const decrypted = decryptCredential(encrypted);
    expect(decrypted).toEqual(samplePrivateKey);
  });

  it('handles empty or non-string inputs safely', () => {
    expect(encryptCredential('')).toBe('');
    expect(encryptCredential(null)).toBe('');
    expect(encryptCredential(undefined)).toBe('');

    expect(decryptCredential('')).toBe('');
    expect(decryptCredential(null)).toBe('');
    expect(decryptCredential(undefined)).toBe('');
  });

  it('is idempotent when encrypting already encrypted values', () => {
    const encryptedOnce = encryptCredential('my-super-secret-token');
    const encryptedTwice = encryptCredential(encryptedOnce);
    expect(encryptedTwice).toEqual(encryptedOnce);
  });

  it('passes legacy plaintext through decryptCredential unchanged', () => {
    const legacyPlaintext = 'ghp_abc1234567890legacytoken';
    expect(isEncryptedCredential(legacyPlaintext)).toBe(false);
    expect(decryptCredential(legacyPlaintext)).toEqual(legacyPlaintext);
  });

  it('detects masked credential placeholders correctly', () => {
    expect(isMaskedCredential('********')).toBe(true);
    expect(isMaskedCredential('****')).toBe(true);
    expect(isMaskedCredential('[CONFIGURED]')).toBe(true);
    expect(isMaskedCredential('my-real-secret')).toBe(false);
    expect(isMaskedCredential('')).toBe(false);
  });

  it('masks sensitive credentials for API responses', () => {
    expect(maskCredential(samplePrivateKey)).toBe('********');
    expect(maskCredential('token_12345')).toBe('********');
    expect(maskCredential('')).toBe('');
    expect(maskCredential(undefined)).toBe('');
  });

  it('returns empty string if decryption tag is tampered', () => {
    const encrypted = encryptCredential('sensitive data');
    const parts = encrypted.split(':');
    // Tamper with ciphertext part
    parts[3] = 'bad' + parts[3].slice(3);
    const tampered = parts.join(':');
    expect(decryptCredential(tampered)).toBe('');
  });
});
