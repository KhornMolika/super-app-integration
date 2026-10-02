import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from '../storage/storage.service';

function getPackageVersion(): string {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const content = fs.readFileSync(pkgPath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed.version) return parsed.version;
    }
  } catch (_) {}
  return process.env.npm_package_version || '0.0.1';
}

const APP_VERSION = getPackageVersion();

export interface ServiceHealthStatus {
  status: 'connected' | 'disconnected';
  responseTimeMs?: number;
  error?: string;
}

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: ServiceHealthStatus;
    storage: ServiceHealthStatus;
  };
  memory: {
    heapUsedMB: number;
    rssMB: number;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const dbStatus = await this.checkDatabase();
    const storageStatus = await this.checkStorage();

    const isDbOk = dbStatus.status === 'connected';
    const isStorageOk = storageStatus.status === 'connected';

    let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';
    if (!isDbOk) {
      overallStatus = 'error';
    } else if (!isStorageOk) {
      overallStatus = 'degraded';
    }

    const memUsage = process.memoryUsage();

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: APP_VERSION,
      services: {
        database: dbStatus,
        storage: storageStatus,
      },
      memory: {
        heapUsedMB: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
        rssMB: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
      },
    };
  }

  private async checkDatabase(): Promise<ServiceHealthStatus> {
    const start = Date.now();
    try {
      if (!this.dataSource.isInitialized) {
        return {
          status: 'disconnected',
          responseTimeMs: Date.now() - start,
          error: 'DataSource is not initialized',
        };
      }
      await this.dataSource.query('SELECT 1');
      return {
        status: 'connected',
        responseTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      this.logger.error(`Database health check failed: ${err?.message || err}`);
      return {
        status: 'disconnected',
        responseTimeMs: Date.now() - start,
        error: err?.message || 'Database query error',
      };
    }
  }

  private async checkStorage(): Promise<ServiceHealthStatus> {
    const start = Date.now();
    try {
      const isHealthy = await this.storageService.checkHealth();
      return {
        status: isHealthy ? 'connected' : 'disconnected',
        responseTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      this.logger.warn(`Storage health check failed: ${err?.message || err}`);
      return {
        status: 'disconnected',
        responseTimeMs: Date.now() - start,
        error: err?.message || 'Storage check error',
      };
    }
  }
}
