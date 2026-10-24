import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Organization, OrganizationStatus } from './entities/organization.entity';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockOrgRepo: any;

  beforeEach(async () => {
    mockOrgRepo = {
      count: jest.fn().mockResolvedValue(11),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      merge: jest.fn((org, dto) => ({ ...org, ...dto })),
      delete: jest.fn(),
      manager: {
        getRepository: jest.fn().mockReturnValue({
          find: jest.fn().mockResolvedValue([]),
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrgRepo,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  describe('update status & security guards', () => {
    it('should throw BadRequestException when attempting to deactivate root system anchor (FTC)', async () => {
      const ftcOrg = {
        id: 'ftc-id-123',
        name: 'Financial Technology Center',
        code: 'FTC',
        status: OrganizationStatus.ACTIVE,
      };
      mockOrgRepo.findOne.mockResolvedValue(ftcOrg);

      await expect(
        service.update(
          'ftc-id-123',
          { status: OrganizationStatus.INACTIVE },
          { organizationId: 'other-org-id' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when attempting to deactivate root system anchor (FSA)', async () => {
      const fsaOrg = {
        id: 'fsa-id-456',
        name: 'Non-Bank Financial Services Authority',
        code: 'FSA',
        status: OrganizationStatus.ACTIVE,
      };
      mockOrgRepo.findOne.mockResolvedValue(fsaOrg);

      await expect(
        service.update(
          'fsa-id-456',
          { status: OrganizationStatus.INACTIVE },
          { organizationId: 'other-org-id' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when operator attempts to deactivate their own assigned organization', async () => {
      const sercOrg = {
        id: 'serc-id-789',
        name: 'Securities and Exchange Regulator of Cambodia',
        code: 'SERC',
        status: OrganizationStatus.ACTIVE,
      };
      mockOrgRepo.findOne.mockResolvedValue(sercOrg);

      await expect(
        service.update(
          'serc-id-789',
          { status: OrganizationStatus.INACTIVE },
          { organizationId: 'serc-id-789' }, // current user belongs to SERC
        ),
      ).rejects.toThrow(
        /Self-deactivation guard: You cannot deactivate your own assigned organization/,
      );
    });

    it('should allow deactivating a standard subordinate regulator for a non-assigned operator', async () => {
      const sercOrg = {
        id: 'serc-id-789',
        name: 'Securities and Exchange Regulator of Cambodia',
        code: 'SERC',
        status: OrganizationStatus.ACTIVE,
      };
      mockOrgRepo.findOne.mockResolvedValue(sercOrg);

      const result = await service.update(
        'serc-id-789',
        { status: OrganizationStatus.INACTIVE },
        { organizationId: 'ftc-admin-id' },
      );

      expect(result.status).toBe(OrganizationStatus.INACTIVE);
      expect(mockOrgRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove & root anchor guards', () => {
    it('should reject deleting a root system anchor organization', async () => {
      const ftcOrg = {
        id: 'ftc-id-123',
        name: 'Financial Technology Center',
        code: 'FTC',
        status: OrganizationStatus.ACTIVE,
      };
      mockOrgRepo.findOne.mockResolvedValue(ftcOrg);

      await expect(service.remove('ftc-id-123')).rejects.toThrow(
        /Regulatory system anchor .* cannot be deleted/,
      );
    });
  });
});
