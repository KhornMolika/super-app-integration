import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BannersService } from './banners.service';
import {
  SuperAppBanner,
  BannerActionType,
  BannerAudience,
} from './entities/banner.entity';
import { StorageService } from '../storage/storage.service';

describe('BannersService', () => {
  let service: BannersService;
  let mockBannerRepo: any;
  let mockStorageService: any;

  const mockBanner: SuperAppBanner = {
    id: 'b-1',
    title: 'Welcome Campaign',
    description: 'Special promotion for new users',
    imageUrl: '/api/storage/asset?key=platform%2Fbanners%2Ftest.png',
    actionType: BannerActionType.MINI_APP,
    actionValue: 'cambodia-tax',
    displayOrder: 1,
    isActive: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    targetAudience: BannerAudience.PUBLIC,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockBannerRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'b-new' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(mockBanner),
      createQueryBuilder: jest.fn(),
      manager: {
        transaction: jest.fn().mockImplementation(async (cb) => {
          return cb({
            update: jest.fn().mockResolvedValue({}),
          });
        }),
      },
    };

    mockStorageService = {
      uploadBannerImage: jest.fn().mockResolvedValue({
        url: '/api/storage/asset?key=platform%2Fbanners%2Fuploaded.png',
        key: 'platform/banners/uploaded.png',
      }),
      deleteBannerImage: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BannersService,
        {
          provide: getRepositoryToken(SuperAppBanner),
          useValue: mockBannerRepo,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<BannersService>(BannersService);
  });

  describe('findAllAdmin', () => {
    it('should query banners with search and filters, returning formatted banners', async () => {
      const qb: any = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockBanner]),
      };
      mockBannerRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllAdmin({
        search: 'Welcome',
        isActive: true,
        targetAudience: BannerAudience.PUBLIC,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(LOWER(banner.title) LIKE :term OR LOWER(banner.description) LIKE :term)',
        { term: '%welcome%' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('banner.isActive = :isActive', {
        isActive: true,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'banner.targetAudience = :audience',
        { audience: BannerAudience.PUBLIC },
      );
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Welcome Campaign');
    });
  });

  describe('findOne', () => {
    it('should return banner if found', async () => {
      mockBannerRepo.findOne.mockResolvedValue(mockBanner);
      const result = await service.findOne('b-1');
      expect(result.id).toBe('b-1');
    });

    it('should throw NotFoundException if banner does not exist', async () => {
      mockBannerRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should upload image file if provided and save new banner', async () => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 3 }),
      };
      mockBannerRepo.createQueryBuilder.mockReturnValue(qb);

      const fakeFile: any = {
        buffer: Buffer.from('test'),
        originalname: 'hero.png',
        mimetype: 'image/png',
      };

      const result = await service.create(
        {
          title: 'New Launch',
          actionType: BannerActionType.EXTERNAL_URL,
          actionValue: 'https://example.com',
          targetAudience: BannerAudience.PUBLIC,
        },
        fakeFile,
      );

      expect(mockStorageService.uploadBannerImage).toHaveBeenCalledWith(fakeFile);
      expect(mockBannerRepo.save).toHaveBeenCalled();
      expect(result.imageUrl).toContain('uploaded.png');
      expect(result.displayOrder).toBe(4);
    });

    it('should throw BadRequestException if no image file or URL is provided', async () => {
      await expect(
        service.create({
          title: 'Missing Image',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update fields and delete old image when new image file uploaded', async () => {
      mockBannerRepo.findOne.mockResolvedValue({ ...mockBanner });

      const fakeFile: any = {
        buffer: Buffer.from('new-image'),
        originalname: 'new.png',
        mimetype: 'image/png',
      };

      const result = await service.update(
        'b-1',
        { title: 'Updated Title' },
        fakeFile,
      );

      expect(mockStorageService.deleteBannerImage).toHaveBeenCalledWith(
        mockBanner.imageUrl,
      );
      expect(mockStorageService.uploadBannerImage).toHaveBeenCalledWith(fakeFile);
      expect(result.title).toBe('Updated Title');
      expect(mockBannerRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete image from storage and remove entity', async () => {
      mockBannerRepo.findOne.mockResolvedValue(mockBanner);

      await service.remove('b-1');

      expect(mockStorageService.deleteBannerImage).toHaveBeenCalledWith(
        mockBanner.imageUrl,
      );
      expect(mockBannerRepo.remove).toHaveBeenCalledWith(mockBanner);
    });
  });

  describe('reorder', () => {
    it('should run transaction to update displayOrder', async () => {
      await service.reorder([
        { id: 'b-1', displayOrder: 0 },
        { id: 'b-2', displayOrder: 1 },
      ]);
      expect(mockBannerRepo.manager.transaction).toHaveBeenCalled();
    });
  });

  describe('findActiveForMobile', () => {
    it('should filter active, unexpired banners for given audiences', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockBanner]),
      };
      mockBannerRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findActiveForMobile([
        BannerAudience.PUBLIC,
        BannerAudience.ALL_FSA_STAFF,
      ]);

      expect(qb.where).toHaveBeenCalledWith('banner.isActive = :isActive', {
        isActive: true,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'banner.targetAudience IN (:...audiences)',
        expect.objectContaining({
          audiences: [BannerAudience.PUBLIC, BannerAudience.ALL_FSA_STAFF],
        }),
      );
      expect(result.length).toBe(1);
    });
  });
});
