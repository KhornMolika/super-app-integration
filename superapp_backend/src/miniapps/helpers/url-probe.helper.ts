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

    const port = parsed.port
      ? Number(parsed.port)
      : parsed.protocol === 'https:'
        ? 443
        : 80;
    const host = parsed.hostname;

    const isPortOpen = await this.probeTcp(host, port, 1200);
    if (!isPortOpen) {
      return {
        reachable: false,
        message: `Could not connect to ${host}:${port} (server offline or unreachable)`,
      };
    }

    return { reachable: true, host, port };
  }
}
