import {
  getLocalIpAddress,
  resolveBackofficeBaseUrl,
  resolveAppUrl,
} from './network.utils';

describe('NetworkUtils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getLocalIpAddress', () => {
    it('should return a non-empty string or localhost', () => {
      const ip = getLocalIpAddress();
      expect(typeof ip).toBe('string');
      expect(ip.length).toBeGreaterThan(0);
    });

    it('should prioritize Wi-Fi/Ethernet adapters over virtual ones', () => {
      const mockInterfaces: any = {
        'vEthernet (WSL)': [
          {
            address: '172.20.64.1',
            netmask: '255.255.240.0',
            family: 'IPv4',
            mac: '00:15:5d:fe:c5:14',
            internal: false,
            cidr: '172.20.64.1/20',
          },
        ],
        'Wi-Fi': [
          {
            address: '192.168.1.150',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: 'c0:35:32:84:2d:b7',
            internal: false,
            cidr: '192.168.1.150/24',
          },
        ],
      };

      const ip = getLocalIpAddress(mockInterfaces);
      expect(ip).toBe('192.168.1.150');
    });

    it('should filter out VirtualBox host-only and loopback adapters', () => {
      const mockInterfaces: any = {
        Loopback: [
          {
            address: '127.0.0.1',
            netmask: '255.0.0.0',
            family: 'IPv4',
            mac: '00:00:00:00:00:00',
            internal: true,
            cidr: '127.0.0.1/8',
          },
        ],
        'Ethernet 5': [
          {
            address: '192.168.56.1',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '0a:00:27:00:00:17',
            internal: false,
            cidr: '192.168.56.1/24',
          },
        ],
        Ethernet: [
          {
            address: '10.0.0.25',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '10:20:30:40:50:60',
            internal: false,
            cidr: '10.0.0.25/24',
          },
        ],
      };

      const ip = getLocalIpAddress(mockInterfaces);
      expect(ip).toBe('10.0.0.25');
    });
  });

  describe('resolveBackofficeBaseUrl', () => {
    it('should auto-replace localhost with LAN IP when auto-detect is enabled', () => {
      const mockInterfaces: any = {
        'Wi-Fi': [
          {
            address: '192.168.1.150',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: 'c0:35:32:84:2d:b7',
            internal: false,
            cidr: '192.168.1.150/24',
          },
        ],
      };

      process.env.BACKOFFICE_BASE_URL = 'http://localhost:3002';
      const resolved = resolveBackofficeBaseUrl(undefined, mockInterfaces);
      expect(resolved).toBe('http://192.168.1.150:3002');
    });

    it('should preserve custom non-localhost domain/IP', () => {
      process.env.BACKOFFICE_BASE_URL = 'https://backoffice.fintechcenterfsa.com';
      const resolved = resolveBackofficeBaseUrl();
      expect(resolved).toBe('https://backoffice.fintechcenterfsa.com');
    });

    it('should preserve localhost if AUTO_DETECT_LAN_IP is false', () => {
      process.env.AUTO_DETECT_LAN_IP = 'false';
      process.env.BACKOFFICE_BASE_URL = 'http://localhost:3002';
      const resolved = resolveBackofficeBaseUrl();
      expect(resolved).toBe('http://localhost:3002');
    });
  });

  describe('resolveAppUrl', () => {
    it('should replace localhost in arbitrary links', () => {
      const mockInterfaces: any = {
        'Wi-Fi': [
          {
            address: '192.168.1.150',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: 'c0:35:32:84:2d:b7',
            internal: false,
            cidr: '192.168.1.150/24',
          },
        ],
      };

      const url = 'http://localhost:3002/api/download-apk?version=1.0.0';
      expect(resolveAppUrl(url, mockInterfaces)).toBe(
        'http://192.168.1.150:3002/api/download-apk?version=1.0.0',
      );
    });
  });
});
