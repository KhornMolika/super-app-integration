import { Test, TestingModule } from '@nestjs/testing';
import { DomainVerificationService } from './domain-verification.service';
import * as dns from 'dns';

describe('DomainVerificationService', () => {
  let service: DomainVerificationService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DomainVerificationService],
    }).compile();

    service = module.get<DomainVerificationService>(DomainVerificationService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('generateVerificationToken', () => {
    it('generates a cryptographically strong live token with tok_live_ prefix', () => {
      const token = service.generateVerificationToken();
      expect(token).toBeDefined();
      expect(token.startsWith('tok_live_')).toBe(true);
      // tok_live_ + 32 hex chars (16 bytes)
      expect(token.length).toBe(9 + 32);
      expect(token).toMatch(/^tok_live_[0-9a-f]{32}$/);
    });

    it('generates unique tokens across multiple invocations', () => {
      const tokens = new Set(Array.from({ length: 50 }, () => service.generateVerificationToken()));
      expect(tokens.size).toBe(50);
    });
  });

  describe('isPrivateOrRestrictedIp (SSRF Protection)', () => {
    it('detects and blocks loopback IPv4 and IPv6 addresses', () => {
      expect(service.isPrivateOrRestrictedIp('127.0.0.1')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('127.0.1.1')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('0.0.0.0')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('::1')).toBe(true);
    });

    it('detects and blocks RFC 1918 Class A private addresses (10.0.0.0/8)', () => {
      expect(service.isPrivateOrRestrictedIp('10.0.0.1')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('10.254.254.254')).toBe(true);
    });

    it('detects and blocks RFC 1918 Class B private addresses (172.16.0.0/12)', () => {
      expect(service.isPrivateOrRestrictedIp('172.16.0.1')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('172.20.10.5')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('172.31.255.255')).toBe(true);
      // Public 172.x ranges should NOT be marked private
      expect(service.isPrivateOrRestrictedIp('172.15.0.1')).toBe(false);
      expect(service.isPrivateOrRestrictedIp('172.32.0.1')).toBe(false);
    });

    it('detects and blocks RFC 1918 Class C private addresses (192.168.0.0/16)', () => {
      expect(service.isPrivateOrRestrictedIp('192.168.1.1')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('192.168.100.254')).toBe(true);
    });

    it('detects and blocks Cloud Metadata / Link-Local addresses (169.254.0.0/16)', () => {
      expect(service.isPrivateOrRestrictedIp('169.254.169.254')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('169.254.1.1')).toBe(true);
    });

    it('detects and blocks private IPv6 prefixes (fe80, fc00, fd00)', () => {
      expect(service.isPrivateOrRestrictedIp('fe80::1')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('fc00::1')).toBe(true);
      expect(service.isPrivateOrRestrictedIp('fd00::1')).toBe(true);
    });

    it('allows valid public routable IP addresses', () => {
      expect(service.isPrivateOrRestrictedIp('8.8.8.8')).toBe(false);
      expect(service.isPrivateOrRestrictedIp('1.1.1.1')).toBe(false);
      expect(service.isPrivateOrRestrictedIp('142.250.190.46')).toBe(false);
    });
  });

  describe('verifyDomainOwnership', () => {
    it('returns failure if productionUrl is empty or missing', async () => {
      const res = await service.verifyDomainOwnership('', 'app-1', 'tok_1');
      expect(res.success).toBe(false);
      expect(res.message).toContain('Production URL is required');
    });

    it('returns failure if productionUrl syntax is invalid', async () => {
      const res = await service.verifyDomainOwnership('not-a-valid-url', 'app-1', 'tok_1');
      expect(res.success).toBe(false);
      expect(res.message).toContain('Invalid URL format');
    });

    it('verifies successfully when association JSON matches expected appId and token', async () => {
      const mockPayload = {
        appId: 'bank-superapp-1',
        verificationToken: 'tok_live_1234567890abcdef1234567890abcdef',
        allowedDomains: ['bank.example.com', 'api.bank.example.com'],
        permissions: ['biometrics', 'camera'],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload,
      });

      const res = await service.verifyDomainOwnership(
        'https://bank.example.com/portal',
        'bank-superapp-1',
        'tok_live_1234567890abcdef1234567890abcdef',
      );

      expect(res.success).toBe(true);
      expect(res.allowedDomains).toEqual(['bank.example.com', 'api.bank.example.com']);
      expect(res.permissions).toEqual(['biometrics', 'camera']);
      expect(res.verifiedAt).toBeInstanceOf(Date);
    });

    it('fails when association JSON appId does not match', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          appId: 'wrong-app-id',
          verificationToken: 'tok_live_test',
        }),
      });

      const res = await service.verifyDomainOwnership(
        'https://bank.example.com',
        'expected-app-id',
        'tok_live_test',
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('appId mismatch');
    });

    it('fails when association JSON verificationToken does not match', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          appId: 'test-app',
          verificationToken: 'tok_live_wrong',
        }),
      });

      const res = await service.verifyDomainOwnership(
        'https://bank.example.com',
        'test-app',
        'tok_live_expected',
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('verificationToken mismatch');
    });

    it('fails when association file returns 404 or non-OK response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const res = await service.verifyDomainOwnership(
        'https://bank.example.com',
        'test-app',
        'tok_live_test',
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('Failed to fetch association file (HTTP 404');
    });

    it('handles network error gracefully without crashing', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection timed out'));

      const res = await service.verifyDomainOwnership(
        'https://bank.example.com',
        'test-app',
        'tok_live_test',
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('Connection timed out');
    });
  });
});
