import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { Identity } from '../identities/entities/identity.entity';
import { StaffProfile } from '../staff/entities/staff-profile.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

describe('AccessControlService - User Organization Updates & Creation', () => {
  let service: AccessControlService;
  let mockIdentityRepo: any;
  let mockStaffProfileRepo: any;
  let mockRoleRepo: any;
  let mockPermRepo: any;
  let mockOrgRepo: any;

  const mockExistingOrg = {
    id: 'org-old-111',
    name: 'Old Organization',
    code: 'OLD',
  };

  const mockTargetOrg = {
    id: 'org-new-222',
    name: 'New Authority',
    code: 'NEW',
  };

  const mockIdentityEntity = {
    id: 'user-uuid-1',
    name: 'John Doe',
    email: 'john@example.com',
    status: 'ACTIVE',
    staffProfile: {
      id: 'staff-uuid-1',
      identityId: 'user-uuid-1',
      roleId: 'role-dev-id',
      role: { id: 'role-dev-id', name: 'MA_DEVELOPER', permissions: [] },
      organizationId: 'org-old-111',
      organization: mockExistingOrg,
      status: 'ACTIVE',
    },
  };

  beforeEach(async () => {
    mockOrgRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'org-new-222') return Promise.resolve(mockTargetOrg);
        return Promise.resolve(null);
      }),
    };

    const mockManager = {
      query: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockIdentityRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.email) return Promise.resolve(null); // No existing email conflict for creation
        return Promise.resolve({ ...mockIdentityEntity });
      }),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ ...dto, id: 'user-created-1' })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ ...entity, id: entity.id || 'user-saved-1' }),
        ),
      manager: {
        getRepository: jest.fn().mockReturnValue(mockOrgRepo),
        // updateUser/approveUser save identity + staff profile in one transaction;
        // route each entity to its repository mock so assertions stay per-repo.
        transaction: jest.fn().mockImplementation(async (cb) =>
          cb({
            save: (entity: any) =>
              'identityId' in entity
                ? mockStaffProfileRepo.save(entity)
                : mockIdentityRepo.save(entity),
          }),
        ),
      },
    };

    mockStaffProfileRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve({ ...mockIdentityEntity.staffProfile });
      }),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ ...dto, id: 'staff-created-1' })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ ...entity, id: entity.id || 'staff-saved-1' }),
        ),
    };

    mockRoleRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'role-dev-id', name: 'MA_DEVELOPER' }),
      findBy: jest
        .fn()
        .mockResolvedValue([{ id: 'role-dev-id', name: 'MA_DEVELOPER' }]),
      manager: {
        transaction: jest.fn().mockImplementation(async (cb) => cb(mockManager)),
      },
    };

    mockPermRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessControlService,
        {
          provide: getRepositoryToken(Identity),
          useValue: mockIdentityRepo,
        },
        {
          provide: getRepositoryToken(StaffProfile),
          useValue: mockStaffProfileRepo,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepo,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermRepo,
        },
      ],
    }).compile();

    service = module.get<AccessControlService>(AccessControlService);
  });

  describe('updateUser', () => {
    it('should successfully update user organization to new organization', async () => {
      await service.updateUser('user-uuid-1', {
        organizationId: 'org-new-222',
      });

      expect(mockOrgRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'org-new-222' },
      });
      expect(mockStaffProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-new-222',
          organization: mockTargetOrg,
        }),
      );
    });

    // staff_profiles.organizationId is NOT NULL: a staff member cannot be detached
    // from their agency, and the rejected request must not half-save the identity.
    it('rejects detaching the organization (empty organizationId) with 400 and saves nothing', async () => {
      await expect(
        service.updateUser('user-uuid-1', { organizationId: '' }),
      ).rejects.toThrow(/must belong to an organization/);

      expect(mockStaffProfileRepo.save).not.toHaveBeenCalled();
      expect(mockIdentityRepo.save).not.toHaveBeenCalled();
    });

    it('updates a consumer (no staff profile) without creating an incomplete staff profile', async () => {
      mockIdentityRepo.findOne.mockImplementation(({ where }: any) =>
        where.email
          ? Promise.resolve(null)
          : Promise.resolve({ id: 'consumer-1', name: 'Old', email: 'c@example.com', status: 'ACTIVE' }),
      );

      await service.updateUser('consumer-1', { name: 'New Name' }).catch(() => undefined);

      expect(mockIdentityRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'consumer-1', name: 'New Name' }),
      );
      expect(mockStaffProfileRepo.create).not.toHaveBeenCalled();
      expect(mockStaffProfileRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if target organization is not found', async () => {
      await expect(
        service.updateUser('user-uuid-1', {
          organizationId: 'non-existent-org-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createUser', () => {
    it('should throw BadRequestException if organizationId is missing or empty when creating a user', async () => {
      await expect(
        service.createUser({
          name: 'Alice',
          email: 'alice@example.com',
          organizationId: '',
        } as any),
      ).rejects.toThrow('Organization is required when creating a user.');
    });

    it('should throw BadRequestException if organization does not exist when creating a user', async () => {
      await expect(
        service.createUser({
          name: 'Alice',
          email: 'alice@example.com',
          organizationId: 'non-existent-org',
        } as any),
      ).rejects.toThrow("Organization with ID 'non-existent-org' not found.");
    });

    it('should successfully create user with required valid organization', async () => {
      const created = await service.createUser({
        name: 'Alice',
        email: 'alice@example.com',
        organizationId: 'org-new-222',
        roleNames: ['MA_DEVELOPER'],
      });

      expect(mockIdentityRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Alice',
          email: 'alice@example.com',
        }),
      );
      expect(mockStaffProfileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-new-222',
          organization: mockTargetOrg,
        }),
      );
      expect(created).toBeDefined();
    });

    describe('a mobile app user (CONSUMER)', () => {
      const consumerRepo = {
        create: jest.fn((x: any) => x),
        save: jest.fn(async (x: any) => ({ ...x, id: 'consumer-1' })),
      };
      const SUPER = { sub: 'sa', roles: ['SUPER_ADMIN'] };

      beforeEach(() => {
        consumerRepo.create.mockClear();
        consumerRepo.save.mockClear();
        mockIdentityRepo.manager.getRepository.mockImplementation((e: any) =>
          e?.name === 'ConsumerProfile' ? consumerRepo : mockOrgRepo,
        );
      });

      it('gets a consumer profile, no organization, role or staff profile', async () => {
        await service.createUser(
          { accountType: 'CONSUMER', name: ' Dara ', email: 'Dara@Example.io', phoneNumber: '+855 12 345 678' } as any,
          SUPER,
        );
        expect(mockIdentityRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Dara', email: 'dara@example.io', status: 'ACTIVE', emailVerifiedAt: expect.any(Date) }),
        );
        expect(consumerRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ phoneNumber: '+855 12 345 678' }),
        );
        expect(mockStaffProfileRepo.create).not.toHaveBeenCalled();
      });

      it('only a Super Admin can create one', async () => {
        await expect(
          service.createUser(
            { accountType: 'CONSUMER', name: 'Dara', email: 'dara@example.io' } as any,
            { sub: 'admin', roles: ['ADMIN'], organizationId: 'org-1' },
          ),
        ).rejects.toThrow('Only Super Administrators can create mobile app users');
        expect(consumerRepo.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('deleteRole', () => {
    it('should throw BadRequestException when attempting to delete system roles', async () => {
      mockRoleRepo.findOne.mockResolvedValueOnce({
        id: 'role-sa-id',
        name: 'SUPER_ADMIN',
      });
      await expect(service.deleteRole('role-sa-id')).rejects.toThrow(
        /core system role and cannot be deleted/,
      );

      mockRoleRepo.findOne.mockResolvedValueOnce({
        id: 'role-admin-id',
        name: 'ADMIN',
      });
      await expect(service.deleteRole('role-admin-id')).rejects.toThrow(
        /core system role and cannot be deleted/,
      );

      mockRoleRepo.findOne.mockResolvedValueOnce({
        id: 'role-dev-id',
        name: 'MA_DEVELOPER',
      });
      await expect(service.deleteRole('role-dev-id')).rejects.toThrow(
        /core system role and cannot be deleted/,
      );
    });

    it('should throw BadRequestException if users are currently assigned to the role', async () => {
      mockRoleRepo.findOne.mockResolvedValueOnce({
        id: 'custom-role-id',
        name: 'CUSTOM_AUDITOR',
      });
      mockStaffProfileRepo.count.mockResolvedValueOnce(3);

      await expect(service.deleteRole('custom-role-id')).rejects.toThrow(
        /currently assigned to 3 active user\(s\)/,
      );
    });

    it('should successfully delete an unassigned custom role cleanly', async () => {
      mockRoleRepo.findOne.mockResolvedValueOnce({
        id: 'custom-role-id',
        name: 'CUSTOM_AUDITOR',
      });
      mockStaffProfileRepo.count.mockResolvedValueOnce(0);

      const result = await service.deleteRole('custom-role-id');
      expect(result).toEqual({
        success: true,
        message: 'Role CUSTOM_AUDITOR removed successfully.',
      });
    });
  });
});
