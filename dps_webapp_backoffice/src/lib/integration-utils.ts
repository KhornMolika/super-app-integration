/**
 * Validation and utility functions for Mini App Technical Integrations
 */

export const validateProductionUrlFormat = (url: string) => {
  if (!url || !url.trim()) {
    return { valid: false, error: 'Production URL is required.' };
  }
  const trimmed = url.trim();

  // Whitespace check
  if (/\s/.test(trimmed)) {
    return { valid: false, error: 'URL must not contain whitespace.' };
  }

  // Protocol check
  const envVal = (
    process.env.NEXT_PUBLIC_ENVIRONMENT ||
    process.env.ENVIRONMENT ||
    process.env.NODE_ENV ||
    ''
  ).toUpperCase();
  const isDev =
    envVal !== 'PROD' &&
    (envVal === 'DEV' ||
      process.env.NEXT_PUBLIC_ALLOW_LOCAL_PROD_URLS === 'true' ||
      (typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname.endsWith('.local') ||
          window.location.hostname.endsWith('.orb.local'))));

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }

  if (!isDev && trimmed.startsWith('http://')) {
    return { valid: false, error: 'Production URL strictly requires HTTPS in PROD mode.' };
  }

  // Check for IPv4 out-of-range octets (e.g. 172.20.684.1)
  const hostMatch = trimmed.match(/^https?:\/\/([^/:]+)/);
  if (hostMatch) {
    const hostCandidate = hostMatch[1];
    const octets = hostCandidate.split('.');
    if (octets.length === 4 && octets.every((o) => /^\d+$/.test(o))) {
      const invalidOctet = octets.find((o) => Number(o) < 0 || Number(o) > 255);
      if (invalidOctet !== undefined) {
        return {
          valid: false,
          error: `Invalid IPv4 address: octet "${invalidOctet}" exceeds maximum range (0-255).`,
        };
      }
    }
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.port) {
      const portNum = Number(parsed.port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return { valid: false, error: `Port "${parsed.port}" is invalid (must be between 1 and 65535).` };
      }
    }

    if (!isDev) {
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return { valid: false, error: 'Localhost is not allowed in PROD mode.' };
      }
      if (!parsed.hostname.includes('.')) {
        return {
          valid: false,
          error: 'Production URL must be a fully qualified domain (e.g. https://app.example.com).',
        };
      }
    }

    return { valid: true, error: null };
  } catch {
    return { valid: false, error: 'Invalid URL syntax. Please enter a valid URL.' };
  }
};

export const generateClientVerificationToken = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return 'tok_live_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'tok_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const generateClientRandomSuffix = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(3);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 8);
};

export const generateClientMiniAppId = (name?: string, suffix?: string) => {
  const activeSuffix = suffix || generateClientRandomSuffix();
  if (name && name.trim()) {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (slug) {
      return `miniapp_${slug}_${activeSuffix}`;
    }
  }
  return `miniapp_${activeSuffix}`;
};
