import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async findByEmailWithPermissions(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: { roles: { permissions: true } },
    });
  }

  // --- User Management ---
  async findAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      relations: { roles: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async createUser(dto: {
    name: string;
    email: string;
    roleIds?: string[];
    roleNames?: string[];
    telegramChatId?: string;
    telegramUsername?: string;
    isActive?: boolean;
  }): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException(`User with email '${dto.email}' already exists.`);
    }

    let roles: Role[] = [];
    if (dto.roleIds && dto.roleIds.length > 0) {
      roles = await this.roleRepository.findBy({ id: In(dto.roleIds) });
    } else if (dto.roleNames && dto.roleNames.length > 0) {
      roles = await this.roleRepository.findBy({ name: In(dto.roleNames) });
    } else {
      const defaultRole = await this.roleRepository.findOne({ where: { name: 'DEVELOPER' } });
      if (defaultRole) roles = [defaultRole];
    }

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      roles,
      telegramChatId: dto.telegramChatId || undefined,
      telegramUsername: dto.telegramUsername || undefined,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    return this.userRepository.save(user);
  }

  async updateUser(
    id: string,
    dto: {
      name?: string;
      email?: string;
      roleIds?: string[];
      roleNames?: string[];
      telegramChatId?: string;
      telegramUsername?: string;
      isActive?: boolean;
    },
  ): Promise<User> {
    const user = await this.findUserById(id);

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({ where: { email: dto.email } });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Email '${dto.email}' is already in use.`);
      }
      user.email = dto.email;
    }
    if (dto.telegramChatId !== undefined) user.telegramChatId = dto.telegramChatId;
    if (dto.telegramUsername !== undefined) user.telegramUsername = dto.telegramUsername;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    if (dto.roleIds !== undefined) {
      user.roles = dto.roleIds.length > 0 ? await this.roleRepository.findBy({ id: In(dto.roleIds) }) : [];
    } else if (dto.roleNames !== undefined) {
      user.roles = dto.roleNames.length > 0 ? await this.roleRepository.findBy({ name: In(dto.roleNames) }) : [];
    }

    return this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const user = await this.findUserById(id);
    await this.userRepository.remove(user);
    return { success: true, message: `User ${user.name} removed successfully.` };
  }

  // --- Role Management ---
  async findAllRoles(): Promise<any[]> {
    const roles = await this.roleRepository.find({
      relations: { permissions: true, users: true },
      order: { createdAt: 'ASC' },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      userCount: r.users?.length || 0,
      permissions: r.permissions?.map((p) => p.name) || [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async findRoleById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: { permissions: true, users: true },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async createRole(dto: {
    name: string;
    description?: string;
    permissions?: string[];
    permissionNames?: string[];
  }): Promise<Role> {
    const existing = await this.roleRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException(`Role with name '${dto.name}' already exists.`);
    }

    const permsToFind = dto.permissions || dto.permissionNames || [];
    let perms: Permission[] = [];
    if (permsToFind.length > 0) {
      perms = await this.permissionRepository.findBy({ name: In(permsToFind) });
    }

    const role = this.roleRepository.create({
      name: dto.name.toUpperCase().replace(/\s+/g, '_'),
      description: dto.description || '',
      permissions: perms,
      isActive: true,
    });

    return this.roleRepository.save(role);
  }

  async updateRole(
    id: string,
    dto: {
      name?: string;
      description?: string;
      permissions?: string[];
      permissionNames?: string[];
      isActive?: boolean;
    },
  ): Promise<Role> {
    const role = await this.findRoleById(id);

    if (dto.name !== undefined) {
      role.name = dto.name.toUpperCase().replace(/\s+/g, '_');
    }
    if (dto.description !== undefined) {
      role.description = dto.description;
    }
    if (dto.isActive !== undefined) {
      role.isActive = dto.isActive;
    }

    const permsToFind = dto.permissions || dto.permissionNames;
    if (permsToFind !== undefined) {
      role.permissions = permsToFind.length > 0 ? await this.permissionRepository.findBy({ name: In(permsToFind) }) : [];
    }

    return this.roleRepository.save(role);
  }

  async deleteRole(id: string): Promise<{ success: boolean; message: string }> {
    const role = await this.findRoleById(id);
    if (['SUPER_ADMIN', 'ADMIN'].includes(role.name)) {
      throw new BadRequestException(`System role '${role.name}' cannot be deleted.`);
    }
    await this.roleRepository.remove(role);
    return { success: true, message: `Role ${role.name} removed successfully.` };
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({
      order: { name: 'ASC' },
    });
  }
}
