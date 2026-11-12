import { randomBytes } from 'crypto';
import { isPlatformAdmin } from './helpers/platform-admin.helper';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Identity } from '../identities/entities/identity.entity';
import { StaffProfile } from '../staff/entities/staff-profile.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { StorageService } from '../storage/storage.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

import { hashPassword } from '../common/utils/password.util';
import {
  formatUserResponse,
  FormattedUserResponse,
} from './helpers/user-response.helper';
import { QueryUsersDto } from './dto/query-users.dto';
import { QueryRolesDto } from './dto/query-roles.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { escapeLikeString } from '../common/utils/sql.util';
import { SortOrder } from '../common/dto/pagination-query.dto';
import { loadPasswordHash } from '../identities/identity-credentials.helper';

export const OFFICIAL_SEEDS: Record<
  string,
  { name: string; roleName: string }
> = {
  'molikakhorn71@gmail.com': { name: 'Molika Khorn', roleName: 'SUPER_ADMIN' },
  'thavorac.chun@gmail.com': { name: 'Thavorac Chun', roleName: 'SUPER_ADMIN' },
  'sea.hutmonineat@gmail.com': {
    name: 'Hutmonineat Sea',
    roleName: 'SUPER_ADMIN',
  },
  'lymoly1122@gmail.com': { name: 'Ly Moly', roleName: 'ADMIN' },
};

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  constructor(
    @InjectRepository(Identity)
    private identityRepository: Repository<Identity>,
    @InjectRepository(StaffProfile)
    private staffProfileRepository: Repository<StaffProfile>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @Optional()
    private storageService?: StorageService,
  ) {}

  /** The stored password hash, for credential checks only. Never put it in a response. */
  async getPasswordHash(identityId: string): Promise<string | null> {
    return loadPasswordHash(this.identityRepository, identityId);
  }

  /**
   * Sets a new password hash and nothing else. It used to also set
   * status ACTIVE, so a password reset let a PENDING_APPROVAL, SUSPENDED or
   * INACTIVE account skip Super Administrator approval. Status changes go
   * through updateUserStatus.
   */
  async updatePasswordDirectly(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.identityRepository.update({ id: userId }, { passwordHash });
  }

  async findByEmailWithPermissions(
    email: string,
  ): Promise<FormattedUserResponse | null> {
    const normalized = (email || '').toLowerCase().trim();
    if (!normalized) return null;

    let identity = await this.identityRepository
      .createQueryBuilder('ident')
      .leftJoinAndSelect('ident.staffProfile', 'staffProfile')
      .leftJoinAndSelect('staffProfile.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('staffProfile.organization', 'organization')
      .where('LOWER(TRIM(ident.email)) = :email', { email: normalized })
      .getOne();

    if (!identity && OFFICIAL_SEEDS[normalized]) {
      identity = await this.ensureSeedAccount(normalized);
    } else if (identity && OFFICIAL_SEEDS[normalized]) {
      let identityChanged = false;

      // Only initialize default seed password if account has NO password hash yet.
      // If user already has a passwordHash, preserve it so user can update their password later.
      // passwordHash is select:false, so it must be read explicitly — an unloaded
      // (undefined) hash would otherwise reset the password on every lookup.
      if (!(await loadPasswordHash(this.identityRepository, identity.id))) {
        const defaultPassword = process.env.SUPERADMIN_PASSWORD;
        if (defaultPassword) {
          identity.passwordHash = await hashPassword(defaultPassword);
          identityChanged = true;
        }
      }
      if (identity.status !== 'ACTIVE') {
        identity.status = 'ACTIVE';
        identityChanged = true;
      }
      // Official seed address: the mobile sign-in refuses an unverified email
      if (!identity.emailVerifiedAt) {
        identity.emailVerifiedAt = new Date();
        identityChanged = true;
      }
      if (identityChanged) {
        await this.identityRepository.save(identity);
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

      let staffProfile = identity.staffProfile;
      if (!staffProfile) {
        let ftcOrgId: string | null = null;
        try {
          const ftcOrgs = await this.identityRepository.manager.query(
            "SELECT id, name, code FROM organizations WHERE code = 'FTC' OR name ILIKE '%Financial Technology Center%' LIMIT 1",
          );
          if (ftcOrgs && ftcOrgs.length > 0) ftcOrgId = ftcOrgs[0].id;
        } catch (_) {}

        staffProfile = this.staffProfileRepository.create({
          identityId: identity.id,
          identity: identity,
          roleId: role.id,
          role: role,
          organizationId: ftcOrgId!,
          status: 'ACTIVE',
        });
        await this.staffProfileRepository.save(staffProfile);
      } else {
        let spChanged = false;
        if (!staffProfile.role || staffProfile.role.name !== targetRoleName) {
          staffProfile.role = role;
          staffProfile.roleId = role.id;
          spChanged = true;
        }
        if (!staffProfile.organizationId) {
          try {
            const ftcOrgs = await this.identityRepository.manager.query(
              "SELECT id, name, code FROM organizations WHERE code = 'FTC' OR name ILIKE '%Financial Technology Center%' LIMIT 1",
            );
            if (ftcOrgs && ftcOrgs.length > 0) {
              staffProfile.organizationId = ftcOrgs[0].id;
              spChanged = true;
            }
          } catch (_) {}
        }
        if (spChanged) {
          await this.staffProfileRepository.save(staffProfile);
        }
      }

      identity = await this.identityRepository
        .createQueryBuilder('ident')
        .leftJoinAndSelect('ident.staffProfile', 'staffProfile')
        .leftJoinAndSelect('staffProfile.role', 'role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .leftJoinAndSelect('staffProfile.organization', 'organization')
        .where('LOWER(TRIM(ident.email)) = :email', { email: normalized })
        .getOne();
    }

    return identity ? formatUserResponse(identity) : null;
  }

  private async ensureSeedAccount(email: string): Promise<Identity | null> {
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

    const defaultPassword = process.env.SUPERADMIN_PASSWORD;
    if (!defaultPassword) {
      throw new Error(
        'SUPERADMIN_PASSWORD environment variable is required to bootstrap seed accounts. Please configure it in super-app-backend-secret.',
      );
    }
    const passwordHash = await hashPassword(defaultPassword);

    let ftcOrgId: string | null = null;
    try {
      const ftcOrgs = await this.identityRepository.manager.query(
        "SELECT id, name, code FROM organizations WHERE code = 'FTC' OR name ILIKE '%Financial Technology Center%' LIMIT 1",
      );
      if (ftcOrgs && ftcOrgs.length > 0) ftcOrgId = ftcOrgs[0].id;
    } catch (_) {}

    let identity = this.identityRepository.create({
      email,
      name: seedInfo.name,
      status: 'ACTIVE',
      passwordHash,
      emailVerifiedAt: new Date(), // official seed address, configured by the platform owners
    });
    identity = await this.identityRepository.save(identity);

    const staffProfile = this.staffProfileRepository.create({
      identityId: identity.id,
      identity: identity,
      roleId: role.id,
      role: role,
      organizationId: ftcOrgId!,
      status: 'ACTIVE',
    });
    await this.staffProfileRepository.save(staffProfile);

    return this.identityRepository
      .createQueryBuilder('ident')
      .leftJoinAndSelect('ident.staffProfile', 'staffProfile')
      .leftJoinAndSelect('staffProfile.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('staffProfile.organization', 'organization')
      .where('LOWER(TRIM(ident.email)) = :email', { email })
      .getOne();
  }

  // --- User Management ---
  async findAllUsers(
    query?: QueryUsersDto,
    includeUnverified = false,
  ): Promise<PaginatedResult<FormattedUserResponse> | FormattedUserResponse[]> {
    const qb = this.identityRepository
      .createQueryBuilder('ident')
      .leftJoinAndSelect('ident.staffProfile', 'staffProfile')
      .leftJoinAndSelect('staffProfile.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('staffProfile.organization', 'organization');

    const isUnverifiedQuery =
      query?.status === 'PENDING_EMAIL_VERIFICATION';
    const isAllStatusQuery = query?.status === 'ALL';

    if (!includeUnverified && !isUnverifiedQuery && !isAllStatusQuery) {
      // Stop unverified self-registered emails from cluttering default list
      qb.where('ident.status != :unverifiedStatus', {
        unverifiedStatus: 'PENDING_EMAIL_VERIFICATION',
      });
    }

    if (!query) {
      qb.orderBy('ident.createdAt', 'DESC');
      const identities = await qb.getMany();
      return identities.map(formatUserResponse);
    }

    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      organizationId,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
    } = query;

    // Search across name, email, and telegram username
    if (search?.trim()) {
      const sanitized = escapeLikeString(search.trim());
      qb.andWhere(
        '(ident.name ILIKE :search OR ident.email ILIKE :search OR ident.telegramUsername ILIKE :search)',
        { search: `%${sanitized}%` },
      );
    }

    // Filter by Role
    if (role && role !== 'ALL') {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          role,
        );
      if (isUuid) {
        qb.andWhere('(role.name = :role OR role.id = :roleUuid)', {
          role,
          roleUuid: role,
        });
      } else {
        qb.andWhere('role.name = :role', { role });
      }
    }

    // Filter by Status (Normalize INACTIVE/DEACTIVATED/SUSPENDED & PENDING statuses)
    if (status && status !== 'ALL') {
      const upperStatus = String(status).toUpperCase();
      if (
        upperStatus === 'INACTIVE' ||
        upperStatus === 'DEACTIVATED' ||
        upperStatus === 'SUSPENDED'
      ) {
        qb.andWhere('ident.status IN (:...inactiveStatuses)', {
          inactiveStatuses: ['INACTIVE', 'DEACTIVATED', 'SUSPENDED'],
        });
      } else if (
        upperStatus === 'PENDING_APPROVAL' ||
        upperStatus === 'PENDING'
      ) {
        qb.andWhere('ident.status IN (:...pendingStatuses)', {
          pendingStatuses: ['PENDING_APPROVAL', 'PENDING'],
        });
      } else if (upperStatus === 'PENDING_EMAIL_VERIFICATION') {
        qb.andWhere('ident.status = :status', {
          status: 'PENDING_EMAIL_VERIFICATION',
        });
      } else {
        qb.andWhere('ident.status = :status', { status: upperStatus });
      }
    }

    // Filter by Organization
    if (organizationId && organizationId !== 'ALL') {
      qb.andWhere('staffProfile.organizationId = :organizationId', {
        organizationId,
      });
    }

    // Allowlisted Sorting
    const sortColumns: Record<string, string> = {
      createdAt: 'ident.createdAt',
      updatedAt: 'ident.updatedAt',
      name: 'ident.name',
      email: 'ident.email',
      status: 'ident.status',
    };
    const orderColumn = sortColumns[sortBy] || 'ident.createdAt';
    const direction = sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    qb.orderBy(orderColumn, direction).addOrderBy('ident.id', 'ASC');

    // Safe offset pagination via TypeORM .skip() & .take()
    qb.skip((page - 1) * limit).take(limit);

    const [identities, totalItems] = await qb.getManyAndCount();
    const formatted = identities.map(formatUserResponse);

    return createPaginatedResponse(formatted, totalItems, page, limit);
  }

  async getUserStats(requester?: any): Promise<{
    total: number;
    active: number;
    pending: number;
    unverified: number;
    inactive: number;
  }> {
    const qb = this.identityRepository
      .createQueryBuilder('ident')
      .leftJoin('ident.staffProfile', 'staffProfile');

    const userPerms = new Set<string>(
      Array.isArray(requester?.permissions) ? requester.permissions : [],
    );
    const isSuperOrAdmin = isPlatformAdmin(requester);

    if (
      !userPerms.has('user:read') &&
      !isSuperOrAdmin &&
      requester?.organizationId
    ) {
      qb.andWhere('staffProfile.organizationId = :orgId', {
        orgId: requester.organizationId,
      });
    }

    const rawCounts = await qb
      .select('ident.status', 'status')
      .addSelect('COUNT(ident.id)', 'count')
      .groupBy('ident.status')
      .getRawMany();

    let active = 0;
    let pending = 0;
    let unverified = 0;
    let inactive = 0;
    let total = 0;

    for (const row of rawCounts) {
      const c = parseInt(row.count, 10) || 0;
      total += c;
      if (row.status === 'ACTIVE') {
        active += c;
      } else if (
        row.status === 'PENDING_APPROVAL' ||
        row.status === 'PENDING'
      ) {
        pending += c;
      } else if (row.status === 'PENDING_EMAIL_VERIFICATION') {
        unverified += c;
      } else if (
        row.status === 'INACTIVE' ||
        row.status === 'DEACTIVATED' ||
        row.status === 'SUSPENDED'
      ) {
        inactive += c;
      } else {
        active += c;
      }
    }

    return { total, active, pending, unverified, inactive };
  }

  async findUserById(id: string): Promise<FormattedUserResponse> {
    const identity = await this.identityRepository.findOne({
      where: { id },
      relations: {
        staffProfile: {
          role: { permissions: true },
          organization: true,
        },
      },
    });
    if (!identity) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return formatUserResponse(identity);
  }

  private isRequesterSuperAdmin(requester?: any): boolean {
    if (!requester) return true; // Internal calls (seeder / registration)
    const roles: string[] = Array.isArray(requester.roles)
      ? requester.roles
          .map((r: any) => (typeof r === 'string' ? r : r?.name))
          .filter(Boolean)
      : requester.role
        ? [requester.role]
        : [];
    const email = (requester.email || '').toLowerCase().trim();
    return (
      roles.some(
        (r) =>
          r.toUpperCase() === 'SUPER_ADMIN' || r.toUpperCase() === 'SUPERADMIN',
      ) || Boolean(OFFICIAL_SEEDS[email])
    );
  }

  async createUser(
    dto: CreateUserDto,
    requester?: any,
  ): Promise<FormattedUserResponse> {
    const existing = await this.identityRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new BadRequestException(
        `User with email '${dto.email}' already exists.`,
      );
    }

    const isSuperAdmin = this.isRequesterSuperAdmin(requester);

    let roles: Role[] = [];
    if (dto.roleId) {
      const singleRole = await this.roleRepository.findOne({
        where: { id: dto.roleId },
      });
      if (singleRole) roles = [singleRole];
    } else if (dto.roleIds && dto.roleIds.length > 0) {
      roles = await this.roleRepository.findBy({ id: In(dto.roleIds) });
    } else if (dto.roleNames && dto.roleNames.length > 0) {
      roles = await this.roleRepository.findBy({ name: In(dto.roleNames) });
    }

    // Always fallback to MA_DEVELOPER if no role was found or specified
    if (roles.length === 0) {
      const defaultRole = await this.roleRepository.findOne({
        where: { name: 'MA_DEVELOPER' },
      });
      if (defaultRole) {
        roles = [defaultRole];
      } else {
        const anyRole = await this.roleRepository.findOne({ where: {} });
        if (anyRole) roles = [anyRole];
      }
    }

    if (roles.length === 0) {
      throw new BadRequestException(
        'No roles exist in the system to assign to user.',
      );
    }

    if (!isSuperAdmin && roles.some((r) => r.name === 'SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Only Super Administrators can assign the Super Admin role',
      );
    }

    let passwordHash = dto.passwordHash || undefined;
    if (dto.password && dto.password.trim()) {
      passwordHash = await hashPassword(dto.password.trim());
    }
    if (!passwordHash) {
      // The backoffice lets an admin create a user without a password, but
      // identities.passwordHash is NOT NULL. Store a hash of a random secret
      // nobody knows: the account cannot be logged into until the user sets a
      // password (reset flow).
      passwordHash = await hashPassword(randomBytes(32).toString('hex'));
    }

    let organization: Organization | null = null;
    const targetOrgId =
      dto.organizationId && dto.organizationId.trim()
        ? dto.organizationId.trim()
        : null;
    if (!targetOrgId) {
      throw new BadRequestException(
        'Organization is required when creating a user.',
      );
    }
    const orgRepo =
      this.identityRepository.manager.getRepository(Organization);
    organization = await orgRepo.findOne({ where: { id: targetOrgId } });
    if (!organization) {
      throw new BadRequestException(
        `Organization with ID '${targetOrgId}' not found.`,
      );
    }

    const identityStatus =
      dto.status ||
      (dto.isActive === false || roles.length === 0
        ? 'PENDING_APPROVAL'
        : 'ACTIVE');

    const identity = this.identityRepository.create({
      name: dto.name,
      email: dto.email.toLowerCase().trim(),
      telegramChatId:
        dto.telegramChatId || (dto as any).teamTelegramChatId || undefined,
      telegramUsername: dto.telegramUsername || undefined,
      status: identityStatus,
      passwordHash,
      // Provisioned by an administrator for this address: the user does not verify it
      // again, and the mobile sign-in (which requires a verified email) accepts it.
      // Self-registration (PENDING_EMAIL_VERIFICATION) still has to prove it with the code.
      emailVerifiedAt: identityStatus === 'PENDING_EMAIL_VERIFICATION' ? null : new Date(),
    });
    const savedIdentity = await this.identityRepository.save(identity);

    const staffProfile = this.staffProfileRepository.create({
      identityId: savedIdentity.id,
      identity: savedIdentity,
      roleId: roles[0]?.id,
      role: roles[0],
      organizationId: targetOrgId,
      organization: organization,
      position: dto.position || undefined,
      staffId: dto.staffId || undefined,
      phoneNumber: dto.phoneNumber || undefined,
      status: identityStatus,
    });
    await this.staffProfileRepository.save(staffProfile);

    return this.findUserById(savedIdentity.id);
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    requester?: any,
  ): Promise<FormattedUserResponse> {
    const identity = await this.identityRepository.findOne({
      where: { id },
      relations: {
        staffProfile: {
          role: { permissions: true },
          organization: true,
        },
      },
    });
    if (!identity) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const isSuperAdmin = this.isRequesterSuperAdmin(requester);
    const isSelf =
      requester &&
      (requester.id === id ||
        requester.sub === id ||
        (requester.email &&
          requester.email.toLowerCase() === identity.email.toLowerCase()));

    let staffProfile = identity.staffProfile;
    const targetRoles =
      (staffProfile as any)?.roles || (staffProfile?.role ? [staffProfile.role] : []);
    const isTargetSuperAdmin = targetRoles.some(
      (r: any) => r.name === 'SUPER_ADMIN',
    );
    if (isTargetSuperAdmin && requester && !isSelf) {
      throw new ForbiddenException(
        'Protected Account Guard: Super Administrators cannot modify other Super Administrator accounts. Each Super Administrator must manage their own credentials.',
      );
    }

    // Super Admin Protection Guard: Super Admin accounts cannot be deactivated, suspended, or demoted
    if (isTargetSuperAdmin) {
      if (
        dto.isActive === false ||
        dto.status === 'DEACTIVATED' ||
        dto.status === 'INACTIVE' ||
        dto.status === 'SUSPENDED'
      ) {
        throw new ForbiddenException(
          'Protected Account Guard: Super Admin accounts cannot be set to inactive or suspended.',
        );
      }
      if (dto.roleNames && !dto.roleNames.includes('SUPER_ADMIN')) {
        throw new ForbiddenException(
          'Protected Role Guard: Super Admin role authority cannot be revoked or demoted.',
        );
      }
    }

    if (dto.name !== undefined) identity.name = dto.name;
    if (
      dto.email !== undefined &&
      dto.email.toLowerCase().trim() !== identity.email
    ) {
      const targetEmail = dto.email.toLowerCase().trim();
      const existing = await this.identityRepository.findOne({
        where: { email: targetEmail },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Email '${dto.email}' is already in use.`,
        );
      }
      identity.email = targetEmail;
    }
    if (dto.telegramChatId !== undefined)
      identity.telegramChatId = dto.telegramChatId;
    if (dto.telegramUsername !== undefined)
      identity.telegramUsername = dto.telegramUsername;
    if (dto.teamTelegramChatId !== undefined && !dto.telegramChatId) {
      identity.telegramChatId = dto.teamTelegramChatId;
    }
    if (dto.status !== undefined)
      identity.status = dto.status === 'DEACTIVATED' ? 'INACTIVE' : dto.status;

    if (dto.password && dto.password.trim()) {
      identity.passwordHash = await hashPassword(dto.password.trim());
    } else if (dto.passwordHash) {
      identity.passwordHash = dto.passwordHash;
    }

    // Only administrators or superadmins can modify account active status and roles
    if (!isSelf || isSuperAdmin) {
      if (dto.isActive !== undefined) {
        identity.status = dto.isActive ? 'ACTIVE' : 'INACTIVE';
      }
    }

    // A staff profile (organizationId + roleId are NOT NULL) is only touched when the
    // identity already has one or the request sets staff fields. Editing a consumer's
    // name or status must not try to create an incomplete staff profile.
    const touchesStaff =
      dto.position !== undefined ||
      dto.staffId !== undefined ||
      dto.phoneNumber !== undefined ||
      dto.organizationId !== undefined ||
      dto.roleIds !== undefined ||
      dto.roleNames !== undefined;

    if (!staffProfile && !touchesStaff) {
      await this.identityRepository.save(identity);
      return this.findUserById(identity.id);
    }

    if (!staffProfile) {
      staffProfile = this.staffProfileRepository.create({
        identityId: identity.id,
        identity: identity,
        status: identity.status,
      });
    }

    if (dto.position !== undefined) staffProfile.position = dto.position;
    if (dto.staffId !== undefined) staffProfile.staffId = dto.staffId;
    if (dto.phoneNumber !== undefined) staffProfile.phoneNumber = dto.phoneNumber;

    if (dto.organizationId !== undefined) {
      const targetOrgId =
        dto.organizationId && dto.organizationId.trim()
          ? dto.organizationId.trim()
          : null;
      staffProfile.organizationId = targetOrgId as any;
      if (targetOrgId) {
        const orgRepo =
          this.identityRepository.manager.getRepository(Organization);
        const org = await orgRepo.findOne({ where: { id: targetOrgId } });
        if (!org) {
          throw new BadRequestException(
            `Organization with ID '${targetOrgId}' not found.`,
          );
        }
        staffProfile.organization = org;
      } else {
        staffProfile.organization = null as any;
      }
    }

    if (dto.roleIds !== undefined || dto.roleNames !== undefined) {
      if (isSelf && !isSuperAdmin) {
        throw new ForbiddenException('Users cannot change their own roles');
      }
      let newRoles: Role[] = [];
      if (dto.roleIds !== undefined) {
        newRoles =
          dto.roleIds.length > 0
            ? await this.roleRepository.findBy({ id: In(dto.roleIds) })
            : [];
      } else if (dto.roleNames !== undefined) {
        newRoles =
          dto.roleNames.length > 0
            ? await this.roleRepository.findBy({ name: In(dto.roleNames) })
            : [];
      }

      if (!isSuperAdmin && newRoles.some((r) => r.name === 'SUPER_ADMIN')) {
        throw new ForbiddenException(
          'Only Super Administrators can assign the Super Admin role',
        );
      }
      staffProfile.role = newRoles[0];
      staffProfile.roleId = newRoles[0]?.id;
      if (newRoles.length > 0 && identity.status === 'PENDING_APPROVAL') {
        identity.status = 'ACTIVE';
        staffProfile.status = 'ACTIVE';
      }
    }

    // Validate before writing anything, so a rejected request never half-saves
    if (!staffProfile.organizationId) {
      throw new BadRequestException(
        'A staff member must belong to an organization. Provide a valid organizationId.',
      );
    }
    if (!staffProfile.roleId) {
      throw new BadRequestException(
        'A staff member must have a role. Provide roleIds or roleNames.',
      );
    }

    const profileToSave = staffProfile;
    await this.identityRepository.manager.transaction(async (manager) => {
      await manager.save(identity);
      await manager.save(profileToSave);
    });
    return this.findUserById(identity.id);
  }

  async approveUser(
    id: string,
    roleName = 'MA_DEVELOPER',
    requester?: any,
    organizationId?: string,
  ): Promise<FormattedUserResponse> {
    const isSuperAdmin = this.isRequesterSuperAdmin(requester);
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Only Super Administrators can approve pending accounts and assign roles',
      );
    }

    const user = await this.findUserById(id);
    if (user.status === 'PENDING_EMAIL_VERIFICATION') {
      throw new BadRequestException(
        'User has not verified their email address with OTP yet. Only email-verified accounts can be approved.',
      );
    }
    const targetRoleName =
      roleName === 'MINI_APP_DEVELOPER' ? 'MA_DEVELOPER' : roleName;
    const role = await this.roleRepository.findOne({
      where: { name: targetRoleName },
    });
    if (!role) {
      throw new BadRequestException(`Role '${targetRoleName}' does not exist.`);
    }

    const identity = await this.identityRepository.findOne({
      where: { id },
      relations: { staffProfile: true },
    });
    if (!identity) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    let staffProfile = identity.staffProfile;
    if (!staffProfile) {
      // staff_profiles.organizationId is NOT NULL: an account without an agency
      // (e.g. a legacy user migrated without one) cannot be approved as staff yet.
      const targetOrgId = organizationId?.trim();
      if (!targetOrgId) {
        throw new BadRequestException(
          'This account has no organization. Provide organizationId when approving it, or assign one with PUT /users/:id first.',
        );
      }
      const org = await this.identityRepository.manager
        .getRepository(Organization)
        .findOne({ where: { id: targetOrgId } });
      if (!org) {
        throw new BadRequestException(`Organization with ID '${targetOrgId}' not found.`);
      }
      staffProfile = this.staffProfileRepository.create({
        identityId: identity.id,
        identity: identity,
        roleId: role.id,
        role: role,
        organizationId: org.id,
        organization: org,
        status: 'ACTIVE',
      });
    } else {
      staffProfile.role = role;
      staffProfile.roleId = role.id;
      staffProfile.status = 'ACTIVE';
    }

    identity.status = 'ACTIVE';
    const profileToSave = staffProfile;
    await this.identityRepository.manager.transaction(async (manager) => {
      await manager.save(identity);
      await manager.save(profileToSave);
    });

    return this.findUserById(identity.id);
  }

  async manuallyVerifyEmail(
    id: string,
    requester?: any,
  ): Promise<FormattedUserResponse> {
    const isSuperAdmin = this.isRequesterSuperAdmin(requester);
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Only Super Administrators can manually verify user email addresses',
      );
    }

    const identity = await this.identityRepository.findOne({
      where: { id },
      relations: { staffProfile: { role: true } },
    });
    if (!identity) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (identity.status !== 'PENDING_EMAIL_VERIFICATION') {
      throw new BadRequestException(
        `User is not pending email verification (current status: ${identity.status}).`,
      );
    }

    const roleName = identity.staffProfile?.role?.name;
    const isPrivileged = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';
    const nextStatus = isPrivileged ? 'ACTIVE' : 'PENDING_APPROVAL';
    identity.status = nextStatus;
    identity.emailVerifiedAt = new Date();

    const saved = await this.identityRepository.save(identity);
    this.logger.log(
      `[ADMIN] SuperAdmin manually verified email for ${saved.email} (id: ${saved.id}). Status -> ${nextStatus}`,
    );
    return this.findUserById(saved.id);
  }

  async deleteUser(
    id: string,
    requester?: any,
  ): Promise<{ success: boolean; message: string }> {
    const identity = await this.identityRepository.findOne({
      where: { id },
      relations: { staffProfile: { role: true } },
    });
    if (!identity) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const targetRoles =
      (identity.staffProfile as any)?.roles ||
      (identity.staffProfile?.role ? [identity.staffProfile.role] : []);
    const isTargetSuperAdmin = targetRoles.some(
      (r: any) => r.name === 'SUPER_ADMIN',
    );

    // Super Admin Protection Guard: Super Admin accounts cannot be deleted by anyone, including other super admins
    if (isTargetSuperAdmin) {
      throw new ForbiddenException(
        'Protected Account Guard: Super Admin accounts cannot be deleted by any operator.',
      );
    }

    const isSelf =
      requester &&
      (requester.id === id ||
        requester.sub === id ||
        (requester.email &&
          requester.email.toLowerCase() === identity.email.toLowerCase()));

    if (isSelf) {
      throw new ForbiddenException(
        'Self-deletion guard: You cannot delete your own account.',
      );
    }

    await this.identityRepository.remove(identity);
    return {
      success: true,
      message: `User ${identity.name} removed successfully.`,
    };
  }

  async updateUserStatus(
    id: string,
    status: string,
  ): Promise<FormattedUserResponse> {
    const identity = await this.identityRepository.findOne({
      where: { id },
      relations: { staffProfile: { role: true } },
    });
    if (!identity) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const targetRoles =
      (identity.staffProfile as any)?.roles ||
      (identity.staffProfile?.role ? [identity.staffProfile.role] : []);
    const isTargetSuperAdmin = targetRoles.some(
      (r: any) => r.name === 'SUPER_ADMIN',
    );

    if (
      isTargetSuperAdmin &&
      (status === 'DEACTIVATED' ||
        status === 'INACTIVE' ||
        status === 'SUSPENDED')
    ) {
      throw new ForbiddenException(
        'Protected Account Guard: Super Admin accounts cannot be set to inactive or suspended.',
      );
    }

    identity.status = status;
    const saved = await this.identityRepository.save(identity);
    return this.findUserById(saved.id);
  }

  /**
   * Records that this identity proved it owns its email (verification or recovery code).
   * The mobile sign-in requires it (MOBILE_REQUIRE_EMAIL_VERIFICATION); the status alone
   * is not enough. Keeps the first verification time.
   */
  async recordEmailVerified(id: string): Promise<void> {
    await this.identityRepository.update(
      { id, emailVerifiedAt: IsNull() },
      { emailVerifiedAt: new Date() },
    );
  }

  // --- Role Management ---
  async findAllRoles(
    query: QueryRolesDto = new QueryRolesDto(),
  ): Promise<PaginatedResult<any>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 20);
    const skip = (page - 1) * limit;

    const qb = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('role.staffProfiles', 'staffProfile');

    if (query.isActive !== undefined) {
      qb.andWhere('role.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.search?.trim()) {
      const sanitized = escapeLikeString(query.search.trim().toLowerCase());
      qb.andWhere(
        '(LOWER(role.name) LIKE :pattern OR LOWER(role.description) LIKE :pattern)',
        { pattern: `%${sanitized}%` },
      );
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'ASC';
    const allowedSortFields: Record<string, string> = {
      createdAt: 'role.createdAt',
      updatedAt: 'role.updatedAt',
      name: 'role.name',
    };
    const dbSortField = allowedSortFields[sortField] || 'role.createdAt';
    qb.orderBy(dbSortField, sortOrder);

    qb.skip(skip).take(limit);

    const [roles, totalItems] = await qb.getManyAndCount();

    const formatted = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      userCount: (r as any).staffProfiles?.length || 0,
      permissions: r.permissions?.map((p) => p.name) || [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return createPaginatedResponse(formatted, totalItems, page, limit);
  }

  async findRoleById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: { permissions: true, staffProfiles: true },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(
        `Role with name '${dto.name}' already exists.`,
      );
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

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
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
      role.permissions =
        permsToFind.length > 0
          ? await this.permissionRepository.findBy({ name: In(permsToFind) })
          : [];
    }

    return this.roleRepository.save(role);
  }

  async deleteRole(id: string): Promise<{ success: boolean; message: string }> {
    const role = await this.findRoleById(id);
    const systemRoles = ['SUPER_ADMIN', 'ADMIN', 'MA_DEVELOPER'];
    if (systemRoles.includes(role.name.toUpperCase())) {
      throw new BadRequestException(
        `System role '${role.name}' is a core system role and cannot be deleted.`,
      );
    }

    const assignedUsersCount = await this.staffProfileRepository.count({
      where: { roleId: id },
    });
    if (assignedUsersCount > 0) {
      throw new BadRequestException(
        `Role '${role.name}' cannot be deleted because it is currently assigned to ${assignedUsersCount} active user(s). Please reassign them first.`,
      );
    }

    try {
      await this.roleRepository.manager.transaction(async (manager) => {
        // Clean up role_permissions join table
        await manager
          .query(`DELETE FROM "role_permissions" WHERE "roleId" = $1`, [id])
          .catch(() => {});

        await manager.delete(Role, id);
      });

      return {
        success: true,
        message: `Role ${role.name} removed successfully.`,
      };
    } catch (err: any) {
      throw new BadRequestException(
        `Failed to delete role '${role.name}': ${err?.message || 'Database dependency constraint'}`,
      );
    }
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({
      order: { name: 'ASC' },
    });
  }

  async uploadUserAvatar(
    userId: string,
    file: Express.Multer.File,
    currentUser?: any,
  ): Promise<FormattedUserResponse> {
    const identity = await this.identityRepository.findOne({
      where: { id: userId },
      relations: { staffProfile: { role: true, organization: true } },
    });
    if (!identity) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!this.storageService) {
      throw new BadRequestException('Storage service is unavailable');
    }

    // Clean up previous avatar if it exists
    if (identity.avatarKey) {
      await this.storageService.deleteBackofficeUserAvatar(identity.avatarKey);
    }

    const { key, url } = await this.storageService.uploadBackofficeUserAvatar(
      userId,
      file,
    );
    identity.avatarKey = key || url;
    identity.avatarUpdatedAt = new Date();
    const saved = await this.identityRepository.save(identity);
    return formatUserResponse(saved);
  }

  async deleteUserAvatar(
    userId: string,
    currentUser?: any,
  ): Promise<FormattedUserResponse> {
    const identity = await this.identityRepository.findOne({
      where: { id: userId },
      relations: { staffProfile: { role: true, organization: true } },
    });
    if (!identity) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (identity.avatarKey && this.storageService) {
      await this.storageService.deleteBackofficeUserAvatar(identity.avatarKey);
    }
    identity.avatarKey = null;
    identity.avatarUpdatedAt = new Date();
    const saved = await this.identityRepository.save(identity);
    return formatUserResponse(saved);
  }
}
