import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';

@Injectable()
export class UrlProbeHelper {
  private readonly logger = new Logger(UrlProbeHelper.name);

  probeTcp(host: string, port: number, timeoutMs = 1200): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      try {
        socket.connect(port, host);
      } catch {
        resolve(false);
      }
    });
  }

  async checkUrl(
    url: string,
  ): Promise<{ reachable: boolean; message?: string; host?: string; port?: number }> {
    if (!url) return { reachable: false, message: 'URL is required' };

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { reachable: false, message: 'Invalid URL format' };
    }

    // Skip git repository URLs as they often block simple TCP/HTTP probes
    if (
      url.includes('github.com') ||
      url.includes('gitlab.com') ||
      url.includes('bitbucket.org') ||
      url.endsWith('.git')
    ) {
      return { reachable: true };
    }

    const envVal = (
      process.env.ENVIRONMENT ||
      process.env.NODE_ENV ||
      ''
    ).toUpperCase();
    const isDev =
      envVal !== 'PROD' &&
      (envVal === 'DEV' || process.env.NODE_ENV !== 'PROD');
    if (
      isDev &&
      (url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.startsWith('http://localhost') ||
        url.startsWith('https://example.com') ||
        url.startsWith('http://example.com'))
    ) {
      return { reachable: true };
    }

    const port = parsed.port
      ? Number(parsed.port)
      : parsed.protocol === 'https:'
        ? 443
        : 80;
    const host = parsed.hostname;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const isOk = response.ok || (response.status >= 300 && response.status < 400);
      if (isOk) {
        return { reachable: true, host, port };
      }

      // If HEAD returns 404 or 405, fallback to GET check
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), 4000);
      const getRes = await fetch(url, {
        method: 'GET',
        signal: getController.signal,
      });
      clearTimeout(getTimeout);

      if (getRes.ok || (getRes.status >= 300 && getRes.status < 400)) {
        return { reachable: true, host, port };
      }

      return {
        reachable: false,
        message: `Server returned HTTP ${getRes.status} (Page not found or forbidden)`,
        host,
        port,
      };
    } catch (err: any) {
      const isPortOpen = await this.probeTcp(host, port, 1200);
      if (!isPortOpen) {
        return {
          reachable: false,
          message: `Could not connect to ${host}:${port} (server offline or unreachable)`,
        };
      }

      return {
        reachable: false,
        message: `Endpoint unreachable or blocked: ${err.message}`,
        host,
        port,
      };
    }
  }
}
