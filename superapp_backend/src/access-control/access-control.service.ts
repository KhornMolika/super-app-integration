import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

import { hashPassword, verifyPassword } from '../common/utils/password.util';

export const OFFICIAL_SEEDS: Record<string, { name: string; roleName: string }> = {
  'molikakhorn71@gmail.com': { name: 'Molika Khorn', roleName: 'SUPER_ADMIN' },
  'thavorac.chun@gmail.com': { name: 'Thavorac Chun', roleName: 'SUPER_ADMIN' },
  'sea.hutmonineat@gmail.com': { name: 'Hutmonineat Sea', roleName: 'SUPER_ADMIN' },
  'lymoly1122@gmail.com': { name: 'Ly Moly', roleName: 'ADMIN' },
};

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

  async updatePasswordDirectly(userId: string, passwordHash: string): Promise<void> {
    await this.userRepository.update({ id: userId }, { passwordHash, isActive: true, status: 'ACTIVE' });
  }

  async findByEmailWithPermissions(email: string): Promise<User | null> {
    const normalized = (email || '').toLowerCase().trim();
    if (!normalized) return null;

    let user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('user.organization', 'organization')
      .where('LOWER(TRIM(user.email)) = :email', { email: normalized })
      .getOne();

    if (!user && OFFICIAL_SEEDS[normalized]) {
      user = await this.ensureSeedAccount(normalized);
    } else if (user && OFFICIAL_SEEDS[normalized]) {
      let userChanged = false;

      // Only initialize default seed password if account has NO password hash yet.
      // If user already has a passwordHash, preserve it so user can update their password later.
      if (!user.passwordHash) {
        const defaultPassword =
          process.env.SUPERADMIN_PASSWORD ||
          (process.env.NODE_ENV !== 'production' ? 'Password123!@#' : '');
        if (defaultPassword) {
          user.passwordHash = await hashPassword(defaultPassword);
          userChanged = true;
        }
      }
      if (user.isActive !== true) {
        user.isActive = true;
        userChanged = true;
      }
      if (user.status !== 'ACTIVE') {
        user.status = 'ACTIVE';
        userChanged = true;
      }

      const targetRoleName = OFFICIAL_SEEDS[normalized].roleName;
      let role = await this.roleRepository.findOne({
        where: { name: targetRoleName },
        relations: { permissions: true },
      });
      if (!role) {
        role = this.roleRepository.create({
          name: targetRoleName,
          description: `${targetRoleName} role`,
          isActive: true,
        });
        role = await this.roleRepository.save(role);
      }

      if (!user.role || user.role.name !== targetRoleName) {
        user.role = role;
        user.roleId = role.id;
        userChanged = true;
      }

      if (userChanged) {
        await this.userRepository.save(user);
        user = await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.role', 'role')
          .leftJoinAndSelect('role.permissions', 'permission')
          .leftJoinAndSelect('user.organization', 'organization')
          .where('LOWER(TRIM(user.email)) = :email', { email: normalized })
          .getOne();
      }
    }

    return user;
  }

  private async ensureSeedAccount(email: string): Promise<User | null> {
    const seedInfo = OFFICIAL_SEEDS[email];
    if (!seedInfo) return null;

    let role = await this.roleRepository.findOne({
      where: { name: seedInfo.roleName },
      relations: { permissions: true },
    });

    if (!role) {
      role = this.roleRepository.create({
        name: seedInfo.roleName,
        description: `${seedInfo.roleName} role`,
        isActive: true,
      });
      role = await this.roleRepository.save(role);
    }

    const defaultPassword =
      process.env.SUPERADMIN_PASSWORD ||
      (process.env.NODE_ENV !== 'production' ? 'Password123!@#' : '');
    if (!defaultPassword) {
      throw new Error('SUPERADMIN_PASSWORD must be configured to bootstrap seed accounts');
    }
    const passwordHash = await hashPassword(defaultPassword);

    let user = this.userRepository.create({
      email,
      name: seedInfo.name,
      roleId: role.id,
      role: role,
      isActive: true,
      status: 'ACTIVE',
      passwordHash,
    });

    await this.userRepository.save(user);

    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('user.organization', 'organization')
      .where('LOWER(TRIM(user.email)) = :email', { email })
      .getOne();
  }

  // --- User Management ---
  async findAllUsers(includeUnverified = false): Promise<User[]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('user.organization', 'organization')
      .orderBy('user.createdAt', 'DESC');

    if (!includeUnverified) {
      // Stop unverified self-registered emails from cluttering the Super Admin's pending review list
      qb.where('user.status != :unverifiedStatus', {
        unverifiedStatus: 'PENDING_EMAIL_VERIFICATION',
      });
    }

    const users = await qb.getMany();
    return users.map((u) => {
      (u as any).roles = u.role ? [u.role] : [];
      (u as any).isActive = u.status === 'ACTIVE';
      return u;
    });
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { role: { permissions: true }, organization: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    (user as any).roles = user.role ? [user.role] : [];
    (user as any).isActive = user.status === 'ACTIVE';
    return user;
  }

  private isRequesterSuperAdmin(requester?: any): boolean {
    if (!requester) return true; // Internal calls (seeder / registration)
    const roles: string[] = Array.isArray(requester.roles)
      ? requester.roles.map((r: any) => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
      : requester.role
      ? [requester.role]
      : [];
    const email = (requester.email || '').toLowerCase().trim();
    return (
      roles.some((r) => r.toUpperCase() === 'SUPER_ADMIN' || r.toUpperCase() === 'SUPERADMIN') ||
      email === 'molikakhorn71@gmail.com' ||
      email === 'thavorac.chun@gmail.com' ||
      email === 'sea.hutmonineat@gmail.com'
    );
  }

  async createUser(dto: CreateUserDto, requester?: any): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email.toLowerCase().trim() } });
    if (existing) {
      throw new BadRequestException(`User with email '${dto.email}' already exists.`);
    }

    const isSuperAdmin = this.isRequesterSuperAdmin(requester);

    let roles: Role[] = [];
    if (dto.roleIds && dto.roleIds.length > 0) {
      roles = await this.roleRepository.findBy({ id: In(dto.roleIds) });
    } else if (dto.roleNames && dto.roleNames.length > 0) {
      roles = await this.roleRepository.findBy({ name: In(dto.roleNames) });
    } else if (dto.roleNames === undefined && dto.roleIds === undefined) {
      const defaultRole = await this.roleRepository.findOne({ where: { name: 'MA_DEVELOPER' } });
      if (defaultRole) roles = [defaultRole];
    }

    if (!isSuperAdmin && roles.some((r) => r.name === 'SUPER_ADMIN')) {
      throw new ForbiddenException('Only Super Administrators can assign the Super Admin role');
    }

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email.toLowerCase().trim(),
      roleId: roles[0]?.id,
      role: roles[0],
      roles,
      organizationId: dto.organizationId || undefined,
      telegramChatId: dto.telegramChatId || undefined,
      telegramUsername: dto.telegramUsername || undefined,
      isActive: dto.isActive !== undefined ? dto.isActive : roles.length > 0,
      status: dto.status || (dto.isActive === false || roles.length === 0 ? 'PENDING_APPROVAL' : 'ACTIVE'),
      passwordHash: dto.passwordHash || undefined,
    });

    return this.userRepository.save(user);
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    requester?: any,
  ): Promise<User> {
    const user = await this.findUserById(id);
    const isSuperAdmin = this.isRequesterSuperAdmin(requester);
    const isSelf =
      requester &&
      (requester.id === id ||
        requester.sub === id ||
        (requester.email && requester.email.toLowerCase() === user.email.toLowerCase()));

    const isTargetSuperAdmin = (user.roles || []).some((r) => r.name === 'SUPER_ADMIN');
    if (isTargetSuperAdmin && !isSuperAdmin && !isSelf) {
      throw new ForbiddenException('Administrators cannot modify Super Admin accounts');
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.email !== undefined && dto.email.toLowerCase().trim() !== user.email) {
      const targetEmail = dto.email.toLowerCase().trim();
      const existing = await this.userRepository.findOne({ where: { email: targetEmail } });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Email '${dto.email}' is already in use.`);
      }
      user.email = targetEmail;
    }
    if (dto.telegramChatId !== undefined) user.telegramChatId = dto.telegramChatId;
    if (dto.telegramUsername !== undefined) user.telegramUsername = dto.telegramUsername;
    if (dto.teamTelegramChatId !== undefined) user.teamTelegramChatId = dto.teamTelegramChatId;
    if (dto.organizationId !== undefined) user.organizationId = dto.organizationId;
    if (dto.status !== undefined) user.status = dto.status;

    if (dto.password) {
      user.passwordHash = await hashPassword(dto.password);
    } else if (dto.passwordHash) {
      user.passwordHash = dto.passwordHash;
    }
    
    // Only administrators or superadmins can modify account active status and roles
    if (!isSelf || isSuperAdmin) {
      if (dto.isActive !== undefined) {
        user.isActive = dto.isActive;
        user.status = dto.isActive ? 'ACTIVE' : 'DEACTIVATED';
      }
    }

    if (dto.roleIds !== undefined || dto.roleNames !== undefined) {
      if (isSelf && !isSuperAdmin) {
        throw new ForbiddenException('Users cannot change their own roles');
      }
      let newRoles: Role[] = [];
      if (dto.roleIds !== undefined) {
        newRoles = dto.roleIds.length > 0 ? await this.roleRepository.findBy({ id: In(dto.roleIds) }) : [];
      } else if (dto.roleNames !== undefined) {
        newRoles = dto.roleNames.length > 0 ? await this.roleRepository.findBy({ name: In(dto.roleNames) }) : [];
      }

      if (!isSuperAdmin && newRoles.some((r) => r.name === 'SUPER_ADMIN')) {
        throw new ForbiddenException('Only Super Administrators can assign the Super Admin role');
      }
      user.role = newRoles[0];
      user.roleId = newRoles[0]?.id;
      user.roles = newRoles;
      if (newRoles.length > 0 && user.status === 'PENDING_APPROVAL') {
        user.status = 'ACTIVE';
        user.isActive = true;
      }
    }

    return this.userRepository.save(user);
  }

  async approveUser(
    id: string,
    roleName = 'MA_DEVELOPER',
    requester?: any,
  ): Promise<User> {
    const isSuperAdmin = this.isRequesterSuperAdmin(requester);
    if (!isSuperAdmin) {
      throw new ForbiddenException('Only Super Administrators can approve pending accounts and assign roles');
    }

    const user = await this.findUserById(id);
    if (user.status === 'PENDING_EMAIL_VERIFICATION') {
      throw new BadRequestException('User has not verified their email address with OTP yet. Only email-verified accounts can be approved.');
    }
    const targetRoleName = roleName === 'MINI_APP_DEVELOPER' ? 'MA_DEVELOPER' : roleName;
    const role = await this.roleRepository.findOne({ where: { name: targetRoleName } });
    if (!role) {
      throw new BadRequestException(`Role '${targetRoleName}' does not exist.`);
    }

    user.role = role;
    user.roleId = role.id;
    user.roles = [role];
    user.isActive = true;
    user.status = 'ACTIVE';

    return this.userRepository.save(user);
  }

  async deleteUser(id: string, requester?: any): Promise<{ success: boolean; message: string }> {
    const user = await this.findUserById(id);
    const isSuperAdmin = this.isRequesterSuperAdmin(requester);
    const isTargetSuperAdmin = (user.roles || []).some((r) => r.name === 'SUPER_ADMIN');

    if (isTargetSuperAdmin && !isSuperAdmin) {
      throw new ForbiddenException('Administrators cannot delete Super Admin accounts');
    }

    await this.userRepository.remove(user);
    return { success: true, message: `User ${user.name} removed successfully.` };
  }

  async updateUserStatus(id: string, status: string): Promise<User> {
    const user = await this.findUserById(id);
    user.status = status;
    if (status === 'ACTIVE') {
      user.isActive = true;
    } else if (
      status === 'PENDING_APPROVAL' ||
      status === 'PENDING_EMAIL_VERIFICATION' ||
      status === 'INACTIVE' ||
      status === 'SUSPENDED' ||
      status === 'REJECTED'
    ) {
      user.isActive = false;
    }
    return this.userRepository.save(user);
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

  async createRole(dto: CreateRoleDto): Promise<Role> {
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
    dto: UpdateRoleDto,
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
