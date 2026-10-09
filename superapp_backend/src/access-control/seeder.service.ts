import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  async seed() {
    // Standardized 25 platform permissions
    const allPerms = [
      'miniapp:create',
      'miniapp:read',
      'miniapp:update',
      'miniapp:delete',
      'miniapp:approve',
      'miniapp:reject',
      'miniapp:suspend',
      'miniapp:submit',
      'miniapp_permission:approve',
      'issue:resolve',
      'permission_proposal:read',
      'permission_proposal:review',
      'permission_proposal:approve',
      'super_app:read',
      'super_app:manage',
      'user:read',
      'user:manage',
      'role:read',
      'role:manage',
      'permission:read',
      'permission:manage',
      'organization:read',
      'organization:manage',
      'audit_log:read',
      'settings:manage',
    ];

    const savedPerms: Permission[] = [];
    for (const name of allPerms) {
      let perm = await this.permissionRepository.findOne({ where: { name } });
      if (!perm) {
        perm = this.permissionRepository.create({ name });
        perm = await this.permissionRepository.save(perm);
      }
      savedPerms.push(perm);
    }

    // Role definitions (Renamed MINI_APP_DEVELOPER -> MINI_APP_DEVELOPER)
    const rolesConfig: Array<{ name: string; description: string; perms: string[] }> = [
      {
        name: 'SUPER_ADMIN',
        description: 'Super Administrator with unrestricted platform-wide access',
        perms: allPerms,
      },
      {
        name: 'ADMIN',
        description: 'Platform Administrator for review, approvals, and user auditing',
        perms: [
          'miniapp:create',
          'miniapp:read',
          'miniapp:update',
          'miniapp:delete',
          'miniapp:approve',
          'miniapp:reject',
          'miniapp:suspend',
          'miniapp:submit',
          'miniapp_permission:approve',
          'issue:resolve',
          'permission_proposal:read',
          'permission_proposal:review',
          'permission_proposal:approve',
          'super_app:read',
          'super_app:manage',
          'user:read',
          'user:manage',
          'role:read',
          'permission:read',
          'organization:read',
          'organization:manage',
          'audit_log:read',
          'settings:manage',
        ],
      },
      {
        name: 'MINI_APP_DEVELOPER',
        description: 'MiniApp Developer for creating, testing, and submitting MiniApps',
        perms: [
          'miniapp:create',
          'miniapp:read',
          'miniapp:update',
          'miniapp:submit',
          'permission_proposal:read',
          'permission:read',
          'super_app:read',
          'organization:read',
        ],
      },
      {
        name: 'QA_TESTER',
        description: 'QA Test Engineer for end-to-end MiniApp testing, sandbox verification, and submissions',
        perms: [
          'miniapp:create',
          'miniapp:read',
          'miniapp:update',
          'miniapp:submit',
          'permission_proposal:read',
          'permission:read',
          'super_app:read',
          'organization:read',
        ],
      },
      {
        name: 'DEVELOPER',
        description: 'Developer with sandbox and documentation read access',
        perms: [
          'miniapp:create',
          'miniapp:read',
          'miniapp:update',
          'miniapp:submit',
          'permission_proposal:read',
          'permission:read',
          'super_app:read',
          'organization:read',
        ],
      },
    ];

    const rolesMap = new Map<string, Role>();
    for (const rConfig of rolesConfig) {
      let role = await this.roleRepository.findOne({
        where: { name: rConfig.name },
        relations: { permissions: true },
      });
      const matchingPerms = savedPerms.filter((p) => rConfig.perms.includes(p.name));
      if (!role) {
        role = this.roleRepository.create({
          name: rConfig.name,
          description: rConfig.description,
          permissions: matchingPerms,
        });
        role = await this.roleRepository.save(role);
      } else {
        role.description = rConfig.description;
        role.permissions = matchingPerms;
        role = await this.roleRepository.save(role);
      }
      rolesMap.set(rConfig.name, role);
    }

    // Migrate any legacy MINI_APP_DEVELOPER role to MINI_APP_DEVELOPER
    const legacyManagerRole = await this.roleRepository.findOne({
      where: { name: 'MINI_APP_DEVELOPER' },
      relations: { users: true },
    });
    if (legacyManagerRole) {
      const devRole = rolesMap.get('MINI_APP_DEVELOPER')!;
      for (const u of legacyManagerRole.users || []) {
        u.roles = (u.roles || []).filter((r) => r.name !== 'MINI_APP_DEVELOPER').concat(devRole);
        await this.userRepository.save(u);
      }
      await this.roleRepository.remove(legacyManagerRole).catch(() => {});
      this.logger.log('Migrated legacy MINI_APP_DEVELOPER role to MINI_APP_DEVELOPER');
    }

    const superAdminRole = rolesMap.get('SUPER_ADMIN')!;
    const adminRole = rolesMap.get('ADMIN')!;
    const devRole = rolesMap.get('MINI_APP_DEVELOPER')!;
    const qaRole = rolesMap.get('QA_TESTER') || devRole;

    const superAdminEmail = this.configService.get<string>('SUPERADMIN_EMAIL', 'superadmin@superapp.gov.kh');
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL', 'admin@superapp.gov.kh');
    const devEmail = this.configService.get<string>('DEV_EMAIL', 'ma-developer@superapp.gov.kh');

    // Migrate any legacy developer@superapp.gov.kh user account to ma-developer@superapp.gov.kh
    try {
      const legacyDev = await this.userRepository.findOne({ where: { email: 'developer@superapp.gov.kh' } });
      if (legacyDev) {
        legacyDev.email = 'ma-developer@superapp.gov.kh';
        await this.userRepository.save(legacyDev);
        this.logger.log('Migrated legacy developer@superapp.gov.kh account to ma-developer@superapp.gov.kh');
      }
    } catch (_) {}

    // Standard test accounts for QA
    const defaultUsers = [
      { email: superAdminEmail, name: 'Super Admin', role: superAdminRole },
      { email: adminEmail, name: 'Admin User', role: adminRole },
      { email: devEmail, name: 'MiniApp Developer', role: devRole },
      { email: 'superadmin@superapp.gov.kh', name: 'Super Admin', role: superAdminRole },
      { email: 'admin@superapp.gov.kh', name: 'Admin User', role: adminRole },
      { email: 'ma-developer@superapp.gov.kh', name: 'MiniApp Developer', role: devRole },
      { email: 'qa@superapp.gov.kh', name: 'QA Test Engineer', role: qaRole },
      { email: 'dev@superapp.gov.kh', name: 'MiniApp Developer', role: devRole },
    ];

    for (const u of defaultUsers) {
      if (!u.email) continue;
      const existing = await this.userRepository.findOne({
        where: { email: u.email.toLowerCase() },
        relations: { roles: true },
      });
      if (!existing) {
        const newUser = this.userRepository.create({
          email: u.email.toLowerCase(),
          name: u.name,
          roles: [u.role],
          isActive: true,
        });
        await this.userRepository.save(newUser);
      } else if (!existing.roles || existing.roles.length === 0) {
        existing.roles = [u.role];
        await this.userRepository.save(existing);
      }
    }

    // Purge any legacy accounts with @example.com
    try {
      const exampleUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.email LIKE :pattern', { pattern: '%@example.com' })
        .getMany();

      if (exampleUsers.length > 0) {
        const exampleUserIds = exampleUsers.map((u) => u.id);
        const officialDev = await this.userRepository.findOne({
          where: { email: 'ma-developer@superapp.gov.kh' },
        });

        if (officialDev && exampleUserIds.length > 0) {
          // Reassign any foreign key dependencies to official developer account
          await this.userRepository.query(
            `UPDATE "mini_apps" SET "ownerId" = $1 WHERE "ownerId" = ANY($2)`,
            [officialDev.id, exampleUserIds],
          );
          await this.userRepository.query(
            `UPDATE "permission_proposals" SET "requestedById" = $1 WHERE "requestedById" = ANY($2)`,
            [officialDev.id, exampleUserIds],
          ).catch(() => {});
          await this.userRepository.query(
            `UPDATE "notification" SET "userId" = $1 WHERE "userId" = ANY($2)`,
            [officialDev.id, exampleUserIds],
          ).catch(() => {});
        }

        await this.userRepository.remove(exampleUsers);
        this.logger.log(`Purged ${exampleUsers.length} legacy @example.com user account(s) from database`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not purge @example.com users: ${err?.message}`);
    }

    this.logger.log('Database seeded with standard permissions, roles, and official accounts');
  }
}
