import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../access-control/entities/user.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { escapeLikeString } from '../common/utils/sql.util';
import { SortOrder } from '../common/dto/pagination-query.dto';

@Injectable()
export class AuditService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,

    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedInitialLogs();
    await this.backfillActorDetails();
  }

  private async backfillActorDetails() {
    try {
      const logsWithoutActorName = await this.auditLogRepository.find({
        where: [{ actorName: IsNull() }, { actorName: '' }],
        take: 500,
      });

      if (logsWithoutActorName.length === 0) return;

      const actorIds = Array.from(
        new Set(
          logsWithoutActorName
            .map((l) => l.actorId)
            .filter((id): id is string => Boolean(id && /^[0-9a-fA-F-]{36}$/.test(id))),
        ),
      );

      const users = actorIds.length > 0
        ? await this.userRepository.find({
            where: { id: In(actorIds) },
            relations: { role: true },
          })
        : [];

      const userMap = new Map(users.map((u) => [u.id, u]));

      for (const log of logsWithoutActorName) {
        let changed = false;

        if (log.actorId === 'admin') {
          log.actorName = 'System Administrator';
          log.actorRole = 'SUPER_ADMIN';
          changed = true;
        } else if (log.actorId && userMap.has(log.actorId)) {
          const user = userMap.get(log.actorId)!;
          log.actorName = user.name;
          log.actorEmail = user.email;
          log.actorRole = user.role?.name || log.actorRole;
          changed = true;
        } else if (log.newValue?.owner?.name) {
          log.actorName = log.newValue.owner.name;
          log.actorEmail = log.newValue.owner.email || log.actorEmail;
          log.actorRole = log.newValue.owner.role?.name || log.actorRole;
          changed = true;
        } else if (log.metadata?.actorName) {
          log.actorName = log.metadata.actorName;
          changed = true;
        }

        if (changed) {
          await this.auditLogRepository.save(log);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to backfill actor details: ${err?.message}`);
    }
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
    if (!data.actorName && data.actorId) {
      if (data.actorId === 'admin') {
        data.actorName = 'System Administrator';
        data.actorRole = 'SUPER_ADMIN';
      } else if (data.actorId === 'system') {
        data.actorName = 'System Automation';
      } else if (/^[0-9a-fA-F-]{36}$/.test(data.actorId)) {
        try {
          const u = await this.userRepository.findOne({
            where: { id: data.actorId },
            relations: { role: true },
          });
          if (u) {
            data.actorName = u.name;
            data.actorEmail = u.email;
            data.actorRole = u.role?.name || data.actorRole;
          }
        } catch (_) {}
      }
    }

    if (!data.actorName && data.newValue?.owner?.name) {
      data.actorName = data.newValue.owner.name;
      data.actorEmail = data.newValue.owner.email || data.actorEmail;
    }

    const entry = this.auditLogRepository.create(data);
    return this.auditLogRepository.save(entry);
  }

  async findAll(query?: QueryAuditLogDto): Promise<PaginatedResult<AuditLog> | AuditLog[]> {
    if (!query) {
      const all = await this.auditLogRepository.find({
        order: { createdAt: 'DESC' },
        take: 100,
      });
      await this.enrichActorDetails(all);
      return all;
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
    await this.enrichActorDetails(items);
    return createPaginatedResponse(items, totalItems, page, limit);
  }

  private async enrichActorDetails(items: AuditLog[]) {
    const unresolvedActorIds = Array.from(
      new Set(
        items
          .filter((i) => !i.actorName && i.actorId && /^[0-9a-fA-F-]{36}$/.test(i.actorId))
          .map((i) => i.actorId),
      ),
    );

    if (unresolvedActorIds.length > 0) {
      try {
        const users = await this.userRepository.find({
          where: { id: In(unresolvedActorIds) },
          relations: { role: true },
        });
        const uMap = new Map(users.map((u) => [u.id, u]));

        for (const item of items) {
          if (!item.actorName && item.actorId && uMap.has(item.actorId)) {
            const u = uMap.get(item.actorId)!;
            item.actorName = u.name;
            item.actorEmail = u.email;
            item.actorRole = u.role?.name || item.actorRole;
          } else if (!item.actorName && item.newValue?.owner?.name) {
            item.actorName = item.newValue.owner.name;
            item.actorEmail = item.newValue.owner.email || item.actorEmail;
          }
        }
      } catch (_) {}
    }

    for (const item of items) {
      if (!item.actorName) {
        if (item.actorId === 'admin') {
          item.actorName = 'System Administrator';
          item.actorRole = 'SUPER_ADMIN';
        } else if (item.actorId === 'system') {
          item.actorName = 'System Automation';
        } else if (item.newValue?.owner?.name) {
          item.actorName = item.newValue.owner.name;
          item.actorEmail = item.newValue.owner.email || item.actorEmail;
        } else if (item.metadata?.actorName) {
          item.actorName = item.metadata.actorName;
        }
      }
    }
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
