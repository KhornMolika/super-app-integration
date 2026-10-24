import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { AuditLog } from './entities/audit-log.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { escapeLikeString } from '../common/utils/sql.util';
import { SortOrder } from '../common/dto/pagination-query.dto';

@Injectable()
export class AuditService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedInitialLogs();
  }

  private resolveAppVersion(): string {
    if (process.env.APP_VERSION) {
      const v = process.env.APP_VERSION.trim();
      return v.startsWith('v') ? v : `v${v}`;
    }

    try {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.version) {
          return pkg.version.startsWith('v') ? pkg.version : `v${pkg.version}`;
        }
      }
    } catch (_) {
      // fallback
    }

    return 'v1.0.0';
  }

  private async seedInitialLogs() {
    const count = await this.auditLogRepository.count();
    if (count > 0) return;

    const version = this.resolveAppVersion();
    const cleanVersion = version.replace(/^v/, '');

    const initial = [
      {
        actorId: 'admin',
        action: 'SYSTEM_BOOTSTRAP',
        resourceType: 'PLATFORM',
        resourceId: 'super-app-core',
        metadata: {
          event: 'FSA SuperApp Platform Ecosystem Initialized',
          version,
          environment: process.env.NODE_ENV || 'production',
        },
        ipAddress: '127.0.0.1',
        userAgent: `SuperApp/${cleanVersion} Kernel`,
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
          bucket: 'superapp-storage',
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

  async findAll(query?: QueryAuditLogDto): Promise<PaginatedResult<AuditLog> | AuditLog[]> {
    if (!query) {
      return this.auditLogRepository.find({
        order: { createdAt: 'DESC' },
        take: 100,
      });
    }

    const {
      page = 1,
      limit = 20,
      search,
      action,
      resourceType,
      actorId,
      resourceId,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
    } = query;

    const qb = this.auditLogRepository.createQueryBuilder('log');

    if (action && action !== 'ALL') {
      qb.andWhere('log.action = :action', { action });
    }

    if (resourceType && resourceType !== 'ALL') {
      qb.andWhere('log.resourceType = :resourceType', { resourceType });
    }

    if (actorId) {
      qb.andWhere('log.actorId = :actorId', { actorId });
    }

    if (resourceId) {
      qb.andWhere('log.resourceId = :resourceId', { resourceId });
    }

    if (search?.trim()) {
      const sanitized = escapeLikeString(search.trim());
      qb.andWhere(
        '(log.action ILIKE :search OR log.resourceType ILIKE :search OR log.actorEmail ILIKE :search OR log.actorName ILIKE :search OR log.resourceId ILIKE :search)',
        { search: `%${sanitized}%` },
      );
    }

    const sortColumns: Record<string, string> = {
      createdAt: 'log.createdAt',
      action: 'log.action',
      resourceType: 'log.resourceType',
    };
    const orderColumn = sortColumns[sortBy] || 'log.createdAt';
    const direction = sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    qb.orderBy(orderColumn, direction).addOrderBy('log.id', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();
    return createPaginatedResponse(items, totalItems, page, limit);
  }

  async findOne(id: string): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({ where: { id } });
  }

  async findByResource(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { resourceType, resourceId },
      order: { createdAt: 'DESC' },
    });
  }
}
