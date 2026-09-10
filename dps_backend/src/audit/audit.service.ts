import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedInitialLogs();
  }

  private async seedInitialLogs() {
    const count = await this.auditLogRepository.count();
    if (count > 0) return;

    const initial = [
      {
        actorId: 'admin',
        action: 'SYSTEM_BOOTSTRAP',
        resourceType: 'PLATFORM',
        resourceId: 'super-app-core',
        metadata: {
          event: 'Super App Platform Ecosystem Initialized',
          version: 'v2.4.0',
          environment: 'production',
        },
        ipAddress: '127.0.0.1',
        userAgent: 'SuperApp/2.4.0 Kernel',
      },
      {
        actorId: 'admin',
        action: 'SECURITY_PROFILE_SYNC',
        resourceType: 'SECURITY',
        resourceId: 'local-security-scanner',
        metadata: {
          engine: 'Local Security Engine / Jenkins Pipeline',
          checks: ['domain_tls_audit', 'csp_headers_audit', 'dast_zap', 'secret_scan', 'sast', 'dependency_scan'],
          status: 'READY',
        },
        ipAddress: '127.0.0.1',
        userAgent: 'SuperApp Security Gatekeeper',
      },
      {
        actorId: 'admin',
        action: 'STORAGE_CONFIGURATION',
        resourceType: 'STORAGE',
        resourceId: 'minio-aistor',
        metadata: {
          bucket: 'dsp-poc-storage',
          provider: 'MinIO AIStor Enterprise Object Storage',
          licenseStatus: 'VALID',
        },
        ipAddress: '127.0.0.1',
        userAgent: 'MinIO SDK / Client',
      },
    ];

    for (const item of initial) {
      await this.auditLogRepository.save(this.auditLogRepository.create(item));
    }
  }

  async log(data: Partial<AuditLog>): Promise<AuditLog> {
    const entry = this.auditLogRepository.create(data);
    return this.auditLogRepository.save(entry);
  }

  async findAll(options?: {
    limit?: number;
    action?: string;
    resourceType?: string;
  }): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('log');

    if (options?.action) {
      query.andWhere('log.action = :action', { action: options.action });
    }
    if (options?.resourceType) {
      query.andWhere('log.resourceType = :resourceType', {
        resourceType: options.resourceType,
      });
    }

    query.orderBy('log.createdAt', 'DESC');
    query.take(options?.limit || 100);

    return query.getMany();
  }

  async findOne(id: string): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({ where: { id } });
  }
}
