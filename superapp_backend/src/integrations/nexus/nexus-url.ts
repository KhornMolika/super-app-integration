/**
 * Base URL the backend itself calls Nexus at (REST API, uploads, package lookups,
 * downloads it proxies).
 *
 * NEXUS_INTERNAL_URL is the in-cluster address, e.g.
 * http://super-app-nexus-svc.super-app.svc.cluster.local:8081/nexus. Calling the
 * public hostname (NEXUS_BASE_URL) from inside the cluster goes out through the
 * ingress and back in, and those connections get reset ("fetch failed",
 * ECONNRESET). Without NEXUS_INTERNAL_URL it falls back to NEXUS_BASE_URL.
 *
 * Links handed to people, Jenkins or phones must keep using NEXUS_BASE_URL (the
 * public one): the in-cluster name does not resolve outside the cluster.
 */
export function nexusApiBaseUrl(get: (key: string) => string | undefined): string {
  const pick = (key: string) => (get(key) ?? process.env[key] ?? '').trim();
  return (pick('NEXUS_INTERNAL_URL') || pick('NEXUS_BASE_URL') || 'http://localhost:8081').replace(/\/+$/, '');
}
