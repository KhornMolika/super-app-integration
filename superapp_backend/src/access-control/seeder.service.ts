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
          'miniapp_permission:approve',
          'issue:resolve',
          'permission_proposal:read',
          'permission_proposal:review',
          'super_app:read',
          'user:read',
          'permission:read',
          'organization:read',
          'audit_log:read',
        ],
      },
      {
        name: 'MINI_APP_DEVELOPER',
        description: 'Mini App Developer for creating, testing, and submitting Mini Apps',
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
        perms: ['miniapp:read', 'permission:read', 'super_app:read'],
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

    const superAdminEmail = this.configService.get<string>('SUPERADMIN_EMAIL', 'superadmin@superapp.gov.kh');
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL', 'admin@superapp.gov.kh');
    const devEmail = this.configService.get<string>('DEV_EMAIL', 'developer@superapp.gov.kh');

    // Standard test accounts for QA
    const defaultUsers = [
      { email: superAdminEmail, name: 'Super Admin', role: superAdminRole },
      { email: adminEmail, name: 'Admin User', role: adminRole },
      { email: devEmail, name: 'Mini App Developer', role: devRole },
      { email: 'superadmin@superapp.gov.kh', name: 'Super Admin', role: superAdminRole },
      { email: 'admin@superapp.gov.kh', name: 'Admin User', role: adminRole },
      { email: 'developer@superapp.gov.kh', name: 'Mini App Developer', role: devRole },
      { email: 'dev@superapp.gov.kh', name: 'Mini App Developer', role: devRole },
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

    this.logger.log('Database seeded with standard permissions and MINI_APP_DEVELOPER role');
  }
}
