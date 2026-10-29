import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

describe('AccessControlService - User Organization Updates & Creation', () => {
  let service: AccessControlService;
  let mockUserRepo: any;
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

  const mockUserEntity = {
    id: 'user-uuid-1',
    name: 'John Doe',
    email: 'john@example.com',
    roleId: 'role-dev-id',
    role: { id: 'role-dev-id', name: 'MA_DEVELOPER', permissions: [] },
    organizationId: 'org-old-111',
    organization: mockExistingOrg,
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    mockOrgRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'org-new-222') return Promise.resolve(mockTargetOrg);
        return Promise.resolve(null);
      }),
    };

    mockUserRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.email) return Promise.resolve(null); // No existing email conflict for creation
        return Promise.resolve({ ...mockUserEntity });
      }),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'user-created-1' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: entity.id || 'user-saved-1' })),
      manager: {
        getRepository: jest.fn().mockReturnValue(mockOrgRepo),
      },
    };

    mockRoleRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'role-dev-id', name: 'MA_DEVELOPER' }),
      findBy: jest.fn().mockResolvedValue([{ id: 'role-dev-id', name: 'MA_DEVELOPER' }]),
    };

    mockPermRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessControlService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
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

      expect(mockOrgRepo.findOne).toHaveBeenCalledWith({ where: { id: 'org-new-222' } });
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-new-222',
          organization: mockTargetOrg,
        }),
      );
    });

    it('should successfully detach organization when organizationId is empty string', async () => {
      await service.updateUser('user-uuid-1', {
        organizationId: '',
      });

      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: null,
          organization: null,
        }),
      );
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
      } as any);

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Alice',
          email: 'alice@example.com',
          organizationId: 'org-new-222',
          organization: mockTargetOrg,
        }),
      );
      expect(created).toBeDefined();
    });
  });
});
