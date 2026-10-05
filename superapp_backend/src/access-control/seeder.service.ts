import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
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

    const rolesConfig: Array<{ name: string; perms: string[] }> = [
      {
        name: 'SUPER_ADMIN',
        perms: allPerms,
      },
      {
        name: 'ADMIN',
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
        ],
      },
      {
        name: 'MINI_APP_MANAGER',
        perms: [
          'miniapp:create',
          'miniapp:read',
          'miniapp:update',
          'miniapp:submit',
          'permission_proposal:read',
          'permission:read',
          'organization:read',
        ],
      },
      {
        name: 'DEVELOPER',
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
          permissions: matchingPerms,
        });
        role = await this.roleRepository.save(role);
      } else {
        role.permissions = matchingPerms;
        role = await this.roleRepository.save(role);
      }
      rolesMap.set(rConfig.name, role);
    }

    const superAdminRole = rolesMap.get('SUPER_ADMIN')!;
    const adminRole = rolesMap.get('ADMIN')!;
    const managerRole = rolesMap.get('MINI_APP_MANAGER')!;
    const devRole = rolesMap.get('DEVELOPER')!;

    const superAdminEmail = this.configService.get<string>('SUPERADMIN_EMAIL', 'superadmin@superapp.gov.kh');
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL', 'admin@superapp.gov.kh');
    const managerEmail = this.configService.get<string>('MANAGER_EMAIL', 'manager@superapp.gov.kh');
    const devEmail = this.configService.get<string>('DEV_EMAIL', 'dev@superapp.gov.kh');

    // List of standard users to ensure exist across both production & mock domains
    const defaultUsers = [
      { email: superAdminEmail, name: 'Super Admin', role: superAdminRole },
      { email: adminEmail, name: 'Admin User', role: adminRole },
      { email: managerEmail, name: 'Mini App Manager', role: managerRole },
      { email: devEmail, name: 'Developer User', role: devRole },
      // Also ensure standard @superapp.gov.kh accounts exist
      { email: 'superadmin@superapp.gov.kh', name: 'Super Admin', role: superAdminRole },
      { email: 'admin@superapp.gov.kh', name: 'Admin User', role: adminRole },
      { email: 'manager@superapp.gov.kh', name: 'Mini App Manager', role: managerRole },
      { email: 'dev@superapp.gov.kh', name: 'Developer User', role: devRole },
      // Also ensure legacy @example.com accounts exist for backwards compatibility
      { email: 'superadmin@example.com', name: 'Super Admin', role: superAdminRole },
      { email: 'admin@example.com', name: 'Admin User', role: adminRole },
      { email: 'manager@example.com', name: 'Mini App Manager', role: managerRole },
      { email: 'dev@example.com', name: 'Developer User', role: devRole },
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
        });
        await this.userRepository.save(newUser);
      } else if (!existing.roles || existing.roles.length === 0) {
        existing.roles = [u.role];
        await this.userRepository.save(existing);
      }
    }

    console.log('Database seeded with standard and production users and roles');
  }
}
