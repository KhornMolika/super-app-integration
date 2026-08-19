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

    // Create Permissions
    const perms = [
      'miniapp:create', 'miniapp:read', 'miniapp:update', 'miniapp:delete', 
      'miniapp_permission:approve', 'issue:resolve',
      'permission_proposal:read', 'permission_proposal:review', 'permission_proposal:approve'
    ];
    const savedPerms = await Promise.all(perms.map(async p => {
      let perm = this.permissionRepository.create({ name: p });
      return this.permissionRepository.save(perm);
    }));

    // Create Roles
    const adminRole = this.roleRepository.create({ name: 'ADMIN', permissions: savedPerms });
    const devRole = this.roleRepository.create({ name: 'DEVELOPER', permissions: savedPerms.filter(p => p.name === 'miniapp:read') });
    await this.roleRepository.save([adminRole, devRole]);

    // Create Users
    const adminUser = this.userRepository.create({ email: 'admin@example.com', name: 'Admin User', roles: [adminRole] });
    const devUser = this.userRepository.create({ email: 'dev@example.com', name: 'Developer User', roles: [devRole] });
    await this.userRepository.save([adminUser, devUser]);
    
    console.log('Database seeded with admin@example.com and dev@example.com');
  }
}