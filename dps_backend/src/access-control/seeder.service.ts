import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
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
    @InjectRepository(Permission) private permissionRepository: Repository<Permission>
  ) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  async seed() {
    const count = await this.userRepository.count();
    if (count > 0) return; // Already seeded

    const allPerms = [
      'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:delete', 'miniapp:approve', 'miniapp:reject', 'miniapp:suspend', 'miniapp:submit',
      'miniapp_permission:approve', 'issue:resolve',
      'permission_proposal:read', 'permission_proposal:review', 'permission_proposal:approve',
      'super_app:read', 'super_app:manage',
      'user:read', 'user:manage',
      'role:read', 'role:manage',
      'permission:read', 'permission:manage',
      'organization:read', 'organization:manage',
      'audit_log:read', 'settings:manage'
    ];

    const savedPerms = await Promise.all(allPerms.map(async p => {
      let perm = this.permissionRepository.create({ name: p });
      return this.permissionRepository.save(perm);
    }));

    const superAdminRole = this.roleRepository.create({ name: 'SUPER_ADMIN', permissions: savedPerms });
    
    const adminRole = this.roleRepository.create({ name: 'ADMIN', permissions: savedPerms.filter(p => [
      'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:delete', 'miniapp:approve', 'miniapp:reject', 'miniapp:suspend',
      'miniapp_permission:approve', 'issue:resolve',
      'permission_proposal:read', 'permission_proposal:review',
      'super_app:read',
      'user:read',
      'permission:read',
      'organization:read'
    ].includes(p.name)) });

    const managerRole = this.roleRepository.create({ name: 'MINI_APP_MANAGER', permissions: savedPerms.filter(p => [
      'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:submit',
      'permission_proposal:read',
      'permission:read',
      'organization:read'
    ].includes(p.name)) });

    const devRole = this.roleRepository.create({ name: 'DEVELOPER', permissions: savedPerms.filter(p => [
      'miniapp:read',
      'permission:read',
      'super_app:read'
    ].includes(p.name)) });

    await this.roleRepository.save([superAdminRole, adminRole, managerRole, devRole]);

    const superAdminUser = this.userRepository.create({ email: 'superadmin@example.com', name: 'Super Admin', roles: [superAdminRole] });
    const adminUser = this.userRepository.create({ email: 'admin@example.com', name: 'Admin User', roles: [adminRole] });
    const managerUser = this.userRepository.create({ email: 'manager@example.com', name: 'Mini App Manager', roles: [managerRole] });
    const devUser = this.userRepository.create({ email: 'dev@example.com', name: 'Developer User', roles: [devRole] });
    
    await this.userRepository.save([superAdminUser, adminUser, managerUser, devUser]);
    
    console.log('Database seeded with new users and roles');
  }
}