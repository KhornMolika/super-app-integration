/**
 * Normalizes asset URLs to ensure they are always loaded securely over HTTPS
 * and routes legacy HTTP / private IP MinIO URLs through the secure backend proxy.
 */
export function normalizeAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // If already relative proxy or HTTPS without raw IP
  if (url.startsWith('/api/storage/') || url.startsWith('/storage/')) {
    return url;
  }

  // If raw HTTP IP or local port (e.g. http://10.200.8.6:9000/... or http://localhost:9000/...)
  if (
    url.startsWith('http://10.') ||
    url.startsWith('http://192.168.') ||
    url.startsWith('http://172.') ||
    url.startsWith('http://localhost') ||
    url.includes(':9000') ||
    url.startsWith('http://')
  ) {
    try {
      const parsed = new URL(url);
      let key = parsed.pathname.replace(/^\/+/, '');
      key = key.replace(/^(?:mini-app-assets|mini-app-logos|logos)\/?/, '');
      return `/api/storage/asset?key=${encodeURIComponent(key)}`;
    } catch {
      return url;
    }
  }

  return url;
}
