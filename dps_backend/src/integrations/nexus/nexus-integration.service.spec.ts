import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NexusIntegrationService } from './nexus-integration.service';

describe('NexusIntegrationService uploads', () => {
  let service: NexusIntegrationService;
  let fetchMock: jest.Mock;
  let env: Record<string, string>;
  const originalFetch = global.fetch;
  const auth = `Basic ${Buffer.from('admin:pw').toString('base64')}`;

  beforeEach(() => {
    env = {
      NEXUS_BASE_URL: 'http://nexus:8081/',
      NEXUS_ADMIN_USER: 'admin',
      NEXUS_ADMIN_PASSWORD: 'pw',
    };
    const cfg = {
      get: (k: string, d?: string) => env[k] ?? d,
    } as unknown as ConfigService;
    service = new NexusIntegrationService(cfg);
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('putRawAsset', () => {
    it('PUTs with basic auth and returns the URL', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 201 });
      const url = await service.putRawAsset(
        'raw-sdk-artifacts',
        'Spa/1.0.0/Spa.xcframework.zip',
        Buffer.from('zip'),
        'application/zip',
      );
      expect(url).toBe(
        'http://nexus:8081/repository/raw-sdk-artifacts/Spa/1.0.0/Spa.xcframework.zip',
      );
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(url);
      expect(init.method).toBe('PUT');
      expect(init.headers.Authorization).toBe(auth);
      expect(init.headers['Content-Type']).toBe('application/zip');
    });

    it('defaults content type and throws on HTTP error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });
      await expect(
        service.putRawAsset('r', 'a/b', Buffer.from('x')),
      ).rejects.toThrow('HTTP 403');
      expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe(
        'application/octet-stream',
      );
    });

    it('wraps network errors', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(
        service.putRawAsset('r', 'a', Buffer.from('x')),
      ).rejects.toThrow('Could not reach Nexus');
    });
  });

  describe('uploadMavenAar', () => {
    it('POSTs multipart to the components API and returns maven URL', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 204 });
      const url = await service.uploadMavenAar({
        repo: 'maven-sdk-hosted',
        groupId: 'com.fsa.sdk',
        artifactId: 'spa-booking-sdk',
        version: '1.0.0',
        buffer: Buffer.from('aar'),
        filename: 'spa-booking-sdk-1.0.0.aar',
      });
      expect(url).toBe(
        'http://nexus:8081/repository/maven-sdk-hosted/com/fsa/sdk/spa-booking-sdk/1.0.0/spa-booking-sdk-1.0.0.aar',
      );
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(
        'http://nexus:8081/service/rest/v1/components?repository=maven-sdk-hosted',
      );
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe(auth);
      const form = init.body as FormData;
      expect(form.get('maven2.groupId')).toBe('com.fsa.sdk');
      expect(form.get('maven2.artifactId')).toBe('spa-booking-sdk');
      expect(form.get('maven2.version')).toBe('1.0.0');
      expect(form.get('maven2.asset1.extension')).toBe('aar');
      expect(form.get('maven2.generate-pom')).toBe('true');
      expect(form.get('maven2.packaging')).toBe('aar');
      expect((form.get('maven2.asset1') as File).name).toBe(
        'spa-booking-sdk-1.0.0.aar',
      );
    });

    it('throws on HTTP error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });
      await expect(
        service.uploadMavenAar({
          repo: 'm',
          groupId: 'g',
          artifactId: 'a',
          version: '1',
          buffer: Buffer.from('x'),
          filename: 'a-1.aar',
        }),
      ).rejects.toThrow('HTTP 400');
    });
  });

  describe('missing NEXUS_ADMIN_PASSWORD', () => {
    beforeEach(() => {
      delete env.NEXUS_ADMIN_PASSWORD;
    });

    it('putRawAsset throws ServiceUnavailable without calling Nexus', async () => {
      await expect(
        service.putRawAsset('r', 'a', Buffer.from('x')),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('uploadMavenAar throws ServiceUnavailable without calling Nexus', async () => {
      await expect(
        service.uploadMavenAar({
          repo: 'm',
          groupId: 'g',
          artifactId: 'a',
          version: '1',
          buffer: Buffer.from('x'),
          filename: 'a-1.aar',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('username still defaults to admin', async () => {
      env.NEXUS_ADMIN_PASSWORD = 'pw';
      delete env.NEXUS_ADMIN_USER;
      fetchMock.mockResolvedValue({ ok: true, status: 201 });
      await service.putRawAsset('r', 'a', Buffer.from('x'));
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(auth);
    });
  });
});
