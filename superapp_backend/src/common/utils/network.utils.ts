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
 * If set to localhost/127.0.0.1/host.docker.internal or left unset,
 * automatically detects the local machine's LAN IP address so Telegram action links
 * work seamlessly from mobile devices connected on the same Wi-Fi/LAN.
 *
 * Can be explicitly disabled by setting AUTO_DETECT_LAN_IP=false in .env.
 */
export function resolveBackofficeBaseUrl(
  customUrl?: string,
  customInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>,
): string {
  const autoDetectEnabled = process.env.AUTO_DETECT_LAN_IP !== 'false';
  const rawUrl =
    customUrl ||
    process.env.BACKOFFICE_BASE_URL ||
    process.env.WEBAPP_URL ||
    'http://localhost:3002';

  if (!autoDetectEnabled) {
    return rawUrl.replace(/\/+$/, '');
  }

  try {
    const urlObj = new URL(rawUrl);
    const hostname = urlObj.hostname.toLowerCase();

    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === 'host.docker.internal';

    if (isLocalhost) {
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
