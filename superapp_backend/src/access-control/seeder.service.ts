import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { DeveloperToken } from './entities/developer-token.entity';
import { RefreshToken } from '../mobile/entities/refresh-token.entity';
import { Organization, OrganizationStatus } from '../organizations/entities/organization.entity';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { MiniAppIssue } from '../miniapps/entities/miniapp-issue.entity';
import { MiniAppBuild } from '../miniapps/entities/miniapp-build.entity';
import { MiniAppVersion } from '../miniapps/entities/miniapp-version.entity';
import { MiniAppCollaborator } from '../miniapps/entities/miniapp-collaborator.entity';
import { CapabilityProposal } from '../capability-proposals/entities/capability-proposal.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { hashPassword } from '../common/utils/password.util';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  async seed() {
    // 1. Standardized platform permissions (25 RBAC permissions)
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

    // 2. Streamlined 3 Enterprise Roles (SUPER_ADMIN, ADMIN, MA_DEVELOPER)
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
        name: 'MA_DEVELOPER',
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

    // 3. Seed 11 Non-Bank Financial Services Authority (FSA) Organizations
    const parentAuthority = 'Non-Bank Financial Services Authority';
    const fsaOrganizations = [
      { name: 'Financial Technology Center', code: 'FTC', description: 'Financial Technology Center of FSA' },
      { name: 'General Affairs Department', code: 'GAD', description: 'General Affairs Department of FSA' },
      { name: 'Policy Department', code: 'PD', description: 'Policy Department of FSA' },
      { name: 'Technical and Legal Affairs Department', code: 'TLAD', description: 'Technical and Legal Affairs Department of FSA' },
      { name: 'Internal Audit Unit', code: 'IAU', description: 'Internal Audit Unit of FSA' },
      { name: 'Securities and Exchange Regulator of Cambodia', code: 'SERC', description: 'Securities and Exchange Regulator of Cambodia' },
      { name: 'Social Security Regulator', code: 'SSR', description: 'Social Security Regulator of Cambodia' },
      { name: 'Trust Regulator', code: 'TR', description: 'Trust Regulator of Cambodia' },
      { name: 'Accounting and Auditing Regulator', code: 'ACAR', description: 'Accounting and Auditing Regulator of Cambodia' },
      { name: 'Insurance Regulator of Cambodia', code: 'IRC', description: 'Insurance Regulator of Cambodia' },
      { name: 'Real Estate Business and Pawnshop Regulator', code: 'RPR', description: 'Real Estate Business and Pawnshop Regulator of Cambodia' },
    ];

    let ftcOrg: Organization | null = null;
    for (const orgData of fsaOrganizations) {
      let org = await this.organizationRepository.findOne({
        where: [{ code: orgData.code }, { name: orgData.name }],
      });

      if (!org) {
        org = this.organizationRepository.create({
          name: orgData.name,
          code: orgData.code,
          parentAuthority,
          description: orgData.description,
          status: OrganizationStatus.ACTIVE,
        });
        org = await this.organizationRepository.save(org);
        this.logger.log(`Created organization: ${org.name} [${org.code}]`);
      } else {
        let changed = false;
        if (org.name !== orgData.name) {
          org.name = orgData.name;
          changed = true;
        }
        if (org.code !== orgData.code) {
          org.code = orgData.code;
          changed = true;
        }
        if (org.parentAuthority !== parentAuthority) {
          org.parentAuthority = parentAuthority;
          changed = true;
        }
        if (changed) {
          org = await this.organizationRepository.save(org);
          this.logger.log(`Updated organization: ${org.name} [${org.code}]`);
        }
      }

      if (orgData.code === 'FTC') {
        ftcOrg = org;
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
        name: 'Hutmonineat Sea',
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
        relations: { role: true, organization: true },
      });

      if (!user) {
        user = this.userRepository.create({
          email,
          name: acc.name,
          roleId: acc.role.id,
          role: acc.role,
          organizationId: ftcOrg?.id,
          organization: ftcOrg,
          status: 'ACTIVE',
          passwordHash: defaultPasswordHash,
        });
        user = await this.userRepository.save(user);
        this.logger.log(`Created official account: ${email} (${acc.role.name})`);
      } else {
        let changed = false;
        if (user.roleId !== acc.role.id) {
          user.roleId = acc.role.id;
          user.role = acc.role;
          changed = true;
        }
        if (ftcOrg && user.organizationId !== ftcOrg.id) {
          user.organizationId = ftcOrg.id;
          user.organization = ftcOrg;
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

    // 6. Exhaustively Purge Mock Data & Accounts via TypeORM QueryBuilder & Database Transaction
    const officialEmails = officialAccounts.map((a) => a.email.toLowerCase().trim());
    await this.purgeMockData(officialEmails);

    this.logger.log('Database successfully seeded with official Super Admin & Admin accounts and 11 FSA organizations.');
  }

  /**
   * Purges legacy mock data, accounts, tokens, and mock MiniApps atomically.
   * Adheres strictly to the TypeORM QueryBuilder + Database Transaction standard.
   */
  private async purgeMockData(officialEmails: string[]): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        // 1. Identify mock accounts using case-insensitive ILIKE, strictly excluding official accounts
        const mockUsers = await manager
          .createQueryBuilder(User, 'user')
          .where(
            '(user.email ILIKE :govPattern OR user.email ILIKE :examplePattern OR user.email ILIKE :testPattern)',
            {
              govPattern: '%@superapp.gov.kh',
              examplePattern: '%@example.com',
              testPattern: '%@test.com',
            },
          )
          .andWhere('user.email NOT IN (:...officialEmails)', {
            officialEmails,
          })
          .getMany();

        if (mockUsers.length === 0) {
          return;
        }

        const mockUserIds = mockUsers.map((u) => u.id);

        // 2. Identify mock MiniApps (owned by mock users or matching mock appId conventions)
        const mockApps = await manager
          .createQueryBuilder(MiniApp, 'app')
          .where('app.ownerId IN (:...mockUserIds)', { mockUserIds })
          .orWhere("app.appId LIKE 'mock-%'")
          .orWhere("app.appId LIKE 'demo-%'")
          .orWhere("app.appId LIKE 'kh.gov.fsa.mock%'")
          .getMany();

        const mockAppIds = mockApps.map((a) => a.id);

        // 3. Atomically delete dependent MiniApp child records via QueryBuilder
        if (mockAppIds.length > 0) {
          await manager
            .createQueryBuilder()
            .delete()
            .from(MiniAppIssue)
            .where('"miniappId" IN (:...mockAppIds)', { mockAppIds })
            .execute();

          await manager
            .createQueryBuilder()
            .delete()
            .from(MiniAppBuild)
            .where('"miniappId" IN (:...mockAppIds)', { mockAppIds })
            .execute();

          await manager
            .createQueryBuilder()
            .delete()
            .from(MiniAppVersion)
            .where('"miniappId" IN (:...mockAppIds)', { mockAppIds })
            .execute();

          await manager
            .createQueryBuilder()
            .delete()
            .from(MiniAppCollaborator)
            .where('"miniappId" IN (:...mockAppIds) OR "userId" IN (:...mockUserIds)', {
              mockAppIds,
              mockUserIds,
            })
            .execute();

          await manager
            .createQueryBuilder()
            .delete()
            .from(MiniApp)
            .where('id IN (:...mockAppIds)', { mockAppIds })
            .execute();
        }

        // 4. Delete mock capability proposals
        await manager
          .createQueryBuilder()
          .delete()
          .from(CapabilityProposal)
          .where('"requestedById" IN (:...mockUserIds)', { mockUserIds })
          .execute();

        // 5. Revoke/delete credentials and notifications
        await manager
          .createQueryBuilder()
          .delete()
          .from(RefreshToken)
          .where('"userId" IN (:...mockUserIds)', { mockUserIds })
          .execute();

        await manager
          .createQueryBuilder()
          .delete()
          .from(DeveloperToken)
          .where('"userId" IN (:...mockUserIds)', { mockUserIds })
          .execute();

        await manager
          .createQueryBuilder()
          .delete()
          .from(Notification)
          .where('"userId" IN (:...mockUserIds)', { mockUserIds })
          .execute();

        // 6. Delete legacy audit logs generated from mock accounts
        await manager
          .createQueryBuilder()
          .delete()
          .from(AuditLog)
          .where(
            '(actorEmail ILIKE :govPattern OR actorEmail ILIKE :examplePattern OR actorEmail ILIKE :testPattern)',
            {
              govPattern: '%@superapp.gov.kh',
              examplePattern: '%@example.com',
              testPattern: '%@test.com',
            },
          )
          .andWhere('actorEmail NOT IN (:...officialEmails)', {
            officialEmails,
          })
          .execute();

        // 7. Delete mock users themselves
        await manager
          .createQueryBuilder()
          .delete()
          .from(User)
          .where('id IN (:...mockUserIds)', { mockUserIds })
          .execute();

        this.logger.log(
          `Purged ${mockUsers.length} legacy mock account(s) and ${mockAppIds.length} mock mini-app(s) atomically inside database transaction.`,
        );
      });
    } catch (err: any) {
      this.logger.warn(`Could not purge mock records: ${err?.message}`);
    }
  }
}
