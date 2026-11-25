/**
 * Normalizes asset URLs to ensure they are always loaded securely over HTTPS
 * and routes legacy HTTP / private IP MinIO URLs through the secure backend proxy.
 *
 * The backend signs every image link it returns (exp + sig query params) and the
 * proxy refuses unsigned links, so `/api/storage/...` links must pass through
 * unchanged. The raw-MinIO conversion below is only a fallback: the backend
 * already rewrites raw MinIO image URLs into signed proxy links.
 */
export function normalizeAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

  // Normalize relative proxy paths to `/api/storage/...`
  if (trimmed.startsWith('/api/storage/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/storage/')) {
    return `/api${trimmed}`;
  }

  // Any absolute URL pointing to our storage asset proxy (/api/storage/asset or /storage/asset)
  // should route through the active Backoffice `/api/storage/asset` proxy so stale tunnel
  // hostnames (e.g. *.trycloudflare.com) or old environments never break image loading.
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (
        parsed.pathname === '/api/storage/asset' ||
        parsed.pathname === '/storage/asset'
      ) {
        return `/api/storage/asset${parsed.search}`;
      }
    } catch {
      // fall through
    }
  }

  // If raw HTTP IP or local port (e.g. http://10.200.8.6:9000/... or http://localhost:9000/...)
  if (
    trimmed.startsWith('http://10.') ||
    trimmed.startsWith('http://192.168.') ||
    trimmed.startsWith('http://172.') ||
    trimmed.startsWith('http://localhost') ||
    trimmed.includes(':9000') ||
    trimmed.startsWith('http://')
  ) {
    try {
      const parsed = new URL(trimmed);
      let key = parsed.pathname.replace(/^\/+/, '');
      key = key.replace(/^(?:superapp-storage|mini-app-assets|mini-app-logos|logos)\/?/, '');
      return `/api/storage/asset?key=${encodeURIComponent(key)}`;
    } catch {
      return trimmed;
    }
  }

  // If stored as a plain storage key/path (e.g. "logos/logo-123.png", "miniapps/.../logos/logo.png")
  if (
    trimmed.startsWith('logos/') ||
    trimmed.startsWith('mini-app-logos/') ||
    trimmed.startsWith('mini-app-assets/') ||
    trimmed.startsWith('miniapps/') ||
    trimmed.startsWith('organizations/') ||
    trimmed.startsWith('platform/')
  ) {
    const key = trimmed.replace(/^(?:mini-app-assets|mini-app-logos|logos)\/?/, '');
    return `/api/storage/asset?key=${encodeURIComponent(key)}`;
  }

  return trimmed;
}
