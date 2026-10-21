import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { hashPassword } from '../common/utils/password.util';

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
    // 1. Standardized platform permissions (25 permissions)
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

    // 2. Streamlined 3 Enterprise Roles (SUPER_ADMIN, ADMIN, MINI_APP_DEVELOPER)
    const rolesConfig: Array<{ name: string; description: string; perms: string[] }> = [
      {
        name: 'SUPER_ADMIN',
        description: 'Super Administrator with unrestricted platform-wide governance and access control',
        perms: allPerms,
      },
      {
        name: 'ADMIN',
        description: 'Platform Administrator for review, audit, approval workflow, and tenant supervision',
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
        description: 'MiniApp Developer for building, testing, verifying, and submitting MiniApps',
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

    const superAdminRole = rolesMap.get('SUPER_ADMIN')!;
    const adminRole = rolesMap.get('ADMIN')!;
    const devRole = rolesMap.get('MINI_APP_DEVELOPER')!;

    // 3. Migrate and clean up any legacy redundant roles (QA_TESTER, DEVELOPER)
    const legacyRoleNames = ['QA_TESTER', 'DEVELOPER'];
    for (const legacyName of legacyRoleNames) {
      try {
        const legacyRole = await this.roleRepository.findOne({
          where: { name: legacyName },
          relations: { users: true },
        });
        if (legacyRole) {
          for (const u of legacyRole.users || []) {
            u.roles = (u.roles || []).filter((r) => r.name !== legacyName).concat(devRole);
            await this.userRepository.save(u);
          }
          await this.roleRepository.remove(legacyRole).catch(() => {});
          this.logger.log(`Migrated users from redundant ${legacyName} role to MINI_APP_DEVELOPER and removed role`);
        }
      } catch (err: any) {
        this.logger.warn(`Could not clean up legacy role ${legacyName}: ${err?.message}`);
      }
    }

    // 4. Default Seed Password: Password123!@#
    const defaultPassword = this.configService.get<string>('SUPERADMIN_PASSWORD', 'Password123!@#');
    const defaultPasswordHash = await hashPassword(defaultPassword);

    // 5. Official Production & Governance Accounts
    const officialAccounts = [
      {
        email: 'molikakhorn71@gmail.com',
        name: 'Molika Khorn',
        role: superAdminRole,
      },
      {
        email: 'thavorac.chun@gmail.com',
        name: 'Thavorac Chun',
        role: superAdminRole,
      },
      {
        email: 'sea.hutmonineat@gmail.com',
        name: 'Sea Hutmonineat',
        role: superAdminRole,
      },
      {
        email: 'lymoly1122@gmail.com',
        name: 'Moly Ly',
        role: adminRole,
      },
    ];

    let primarySuperAdmin: User | null = null;

    for (const acc of officialAccounts) {
      const email = acc.email.toLowerCase().trim();
      let user = await this.userRepository.findOne({
        where: { email },
        relations: { roles: true },
      });

      if (!user) {
        user = this.userRepository.create({
          email,
          name: acc.name,
          roles: [acc.role],
          isActive: true,
          status: 'ACTIVE',
          passwordHash: defaultPasswordHash,
        });
        user = await this.userRepository.save(user);
        this.logger.log(`Created official account: ${email} (${acc.role.name})`);
      } else {
        let changed = false;
        if (!user.roles || !user.roles.some((r) => r.name === acc.role.name)) {
          user.roles = [acc.role];
          changed = true;
        }
        if (!user.passwordHash) {
          user.passwordHash = defaultPasswordHash;
          changed = true;
        }
        if (user.status !== 'ACTIVE') {
          user.status = 'ACTIVE';
          changed = true;
        }
        if (user.isActive !== true) {
          user.isActive = true;
          changed = true;
        }
        if (user.name !== acc.name) {
          user.name = acc.name;
          changed = true;
        }
        if (changed) {
          user = await this.userRepository.save(user);
          this.logger.log(`Synchronized credentials and role for official account: ${email}`);
        }
      }

      if (email === 'molikakhorn71@gmail.com') {
        primarySuperAdmin = user;
      }
    }

    // 6. Purge ALL Mock Accounts (@superapp.gov.kh and @example.com)
    try {
      const mockUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.email LIKE :govPattern OR user.email LIKE :examplePattern', {
          govPattern: '%@superapp.gov.kh',
          examplePattern: '%@example.com',
        })
        .getMany();

      if (mockUsers.length > 0 && primarySuperAdmin) {
        const mockUserIds = mockUsers.map((u) => u.id);

        // Reassign all foreign keys to the primary Super Admin so database integrity is preserved
        await this.userRepository.query(
          `UPDATE "mini_apps" SET "ownerId" = $1 WHERE "ownerId" = ANY($2)`,
          [primarySuperAdmin.id, mockUserIds],
        ).catch(() => {});

        await this.userRepository.query(
          `UPDATE "permission_proposals" SET "requestedById" = $1 WHERE "requestedById" = ANY($2)`,
          [primarySuperAdmin.id, mockUserIds],
        ).catch(() => {});

        await this.userRepository.query(
          `UPDATE "notification" SET "userId" = $1 WHERE "userId" = ANY($2)`,
          [primarySuperAdmin.id, mockUserIds],
        ).catch(() => {});

        await this.userRepository.query(
          `UPDATE "developer_tokens" SET "userId" = $1 WHERE "userId" = ANY($2)`,
          [primarySuperAdmin.id, mockUserIds],
        ).catch(() => {});

        await this.userRepository.query(
          `DELETE FROM "user_roles" WHERE "userId" = ANY($1)`,
          [mockUserIds],
        ).catch(() => {});

        await this.userRepository.remove(mockUsers);
        this.logger.log(`Purged ${mockUsers.length} legacy mock account(s) (@superapp.gov.kh / @example.com)`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not purge mock users: ${err?.message}`);
    }

    this.logger.log('Database successfully seeded with official Super Admin & Admin accounts. Password initialized to Password123!@#');
  }
}
