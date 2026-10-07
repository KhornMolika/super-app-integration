import * as os from 'os';

/**
 * Returns the primary non-internal IPv4 LAN IP address of the host machine.
 * Prioritizes active Wi-Fi and physical Ethernet adapters while ignoring
 * loopback, APIPA link-local (169.254.x.x), and virtual network adapters (WSL, Docker, VirtualBox, VMware).
 */
export function getLocalIpAddress(
  customInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>,
): string {
  const interfaces = customInterfaces || os.networkInterfaces();
  const candidates: { name: string; address: string; priority: number }[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const iface of addrs || []) {
      const isIPv4 = iface.family === 'IPv4' || (iface.family as any) === 4;
      if (!isIPv4 || iface.internal) continue;

      const lowerName = name.toLowerCase();
      const addr = iface.address;

      // Filter out link-local (APIPA) and standard VirtualBox host-only subnet (192.168.56.x)
      if (addr.startsWith('169.254.') || addr.startsWith('192.168.56.')) {
        continue;
      }

      const isVirtual =
        lowerName.includes('vethernet') ||
        lowerName.includes('virtual') ||
        lowerName.includes('vbox') ||
        lowerName.includes('vmware') ||
        lowerName.includes('docker') ||
        lowerName.includes('tailscale') ||
        lowerName.includes('zerotier') ||
        lowerName.includes('wsl') ||
        iface.mac?.toLowerCase().startsWith('0a:00:27'); // VirtualBox MAC prefix

      const isWiFi =
        lowerName.includes('wi-fi') ||
        lowerName.includes('wifi') ||
        lowerName.includes('wlan') ||
        lowerName.includes('wireless');

      const isEthernet =
        lowerName.includes('ethernet') ||
        lowerName.includes('eth') ||
        lowerName.includes('en0') ||
        lowerName.includes('lan');

      let priority = 10;
      if (isWiFi && !isVirtual) {
        priority = 1;
      } else if (isEthernet && !isVirtual) {
        priority = 2;
      } else if (!isVirtual) {
        priority = 5;
      } else {
        priority = 20;
      }

      candidates.push({ name, address: iface.address, priority });
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  return candidates.length > 0 ? candidates[0].address : 'localhost';
}

/**
 * Resolves the Backoffice base URL.
 * - In Production (ENVIRONMENT=PROD or NODE_ENV=production):
 *   Uses the production cloud domain (e.g. https://app.fintechcenterfsa.com or BACKOFFICE_BASE_URL).
 * - In Development:
 *   Automatically detects the local machine's active Wi-Fi/LAN IP address so Telegram action links
 *   always open seamlessly on physical mobile phones even if the Wi-Fi IP changes.
 */
export function resolveBackofficeBaseUrl(
  customUrl?: string,
  customInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>,
): string {
  const envVal = (
    process.env.ENVIRONMENT ||
    process.env.NODE_ENV ||
    ''
  ).toUpperCase();
  const isProduction = envVal === 'PROD' || envVal === 'PRODUCTION';

  const autoDetectEnabled = process.env.AUTO_DETECT_LAN_IP !== 'false';
  const rawUrl =
    customUrl ||
    process.env.BACKOFFICE_BASE_URL ||
    process.env.WEBAPP_URL ||
    (isProduction ? 'https://app.fintechcenterfsa.com' : 'http://localhost:3002');

  if (isProduction || !autoDetectEnabled) {
    return rawUrl.replace(/\/+$/, '');
  }

  try {
    const urlObj = new URL(rawUrl);
    const hostname = urlObj.hostname.toLowerCase();

    // Preserve public domain names (e.g. fintechcenterfsa.com)
    if (hostname.includes('fintechcenterfsa.com')) {
      return rawUrl.replace(/\/+$/, '');
    }

    const isLocalOrPrivate =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === 'host.docker.internal' ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

    if (isLocalOrPrivate) {
      const localIp = getLocalIpAddress(customInterfaces);
      if (localIp && localIp !== 'localhost') {
        urlObj.hostname = localIp;
        return urlObj.origin.replace(/\/+$/, '') + (urlObj.pathname !== '/' ? urlObj.pathname : '');
      }
    }

    return rawUrl.replace(/\/+$/, '');
  } catch (_) {
    const localIp = getLocalIpAddress(customInterfaces);
    return localIp && localIp !== 'localhost'
      ? `http://${localIp}:3002`
      : 'http://localhost:3002';
  }
}

/**
 * Resolves the Mobile Backend API base URL.
 * - In Production (ENVIRONMENT=PROD or NODE_ENV=production):
 *   Uses the production endpoint (e.g. https://app.fintechcenterfsa.com/api or MOBILE_API_BASE_URL).
 * - In Development:
 *   Dynamically detects the current active Wi-Fi LAN IP so physical mobile devices
 *   and test APKs always connect to the laptop backend even when Wi-Fi IP changes.
 */
export function resolveMobileApiBaseUrl(
  customUrl?: string,
  customInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>,
): string {
  const envVal = (
    process.env.ENVIRONMENT ||
    process.env.NODE_ENV ||
    ''
  ).toUpperCase();
  const isProduction = envVal === 'PROD' || envVal === 'PRODUCTION';

  if (isProduction) {
    return (
      customUrl ||
      process.env.MOBILE_API_BASE_URL ||
      'https://app.fintechcenterfsa.com/api'
    ).replace(/\/+$/, '');
  }

  const rawUrl =
    customUrl ||
    process.env.MOBILE_API_BASE_URL ||
    process.env.BACKEND_API_URL ||
    '';

  const port = process.env.PORT || '3000';
  const localIp = getLocalIpAddress(customInterfaces);

  if (!rawUrl) {
    return localIp && localIp !== 'localhost'
      ? `http://${localIp}:${port}`
      : `http://localhost:${port}`;
  }

  // Preserve public production domain
  if (rawUrl.includes('fintechcenterfsa.com')) {
    return rawUrl.replace(/\/+$/, '');
  }

  if (localIp && localIp !== 'localhost') {
    return rawUrl.replace(
      /https?:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal)(:\d+)?/i,
      (match, host, portMatch) => {
        const resolvedPort = portMatch || `:${port}`;
        return `http://${localIp}${resolvedPort}`;
      },
    );
  }

  return rawUrl.replace(/\/+$/, '');
}

/**
 * Replaces localhost, 127.0.0.1, or host.docker.internal in any arbitrary URL with the detected LAN IP.
 */
export function resolveAppUrl(
  url: string,
  customInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>,
): string {
  if (!url) return url;
  const autoDetectEnabled = process.env.AUTO_DETECT_LAN_IP !== 'false';
  if (!autoDetectEnabled) return url;

  const localIp = getLocalIpAddress(customInterfaces);
  if (!localIp || localIp === 'localhost') return url;

  return url.replace(
    /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal)(:\d+)?/gi,
    (match, host, port) => {
      const protocol = match.startsWith('https') ? 'https' : 'http';
      return `${protocol}://${localIp}${port || ''}`;
    },
  );
}
