import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuperAppBanner, BannerAudience } from './entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { StorageService } from '../storage/storage.service';
import { signAssetLink } from '../storage/asset-url-signer';

@Injectable()
export class BannersService {
  private readonly logger = new Logger(BannersService.name);

  constructor(
    @InjectRepository(SuperAppBanner)
    private readonly bannerRepo: Repository<SuperAppBanner>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Helper to ensure the banner imageUrl has a fresh signature if it is an asset proxy link
   */
  private formatBanner(banner: SuperAppBanner): SuperAppBanner {
    if (banner.imageUrl) {
      banner.imageUrl = signAssetLink(banner.imageUrl);
    }
    return banner;
  }

  async findAllAdmin(query?: {
    search?: string;
    isActive?: boolean;
    targetAudience?: BannerAudience;
  }): Promise<SuperAppBanner[]> {
    const qb = this.bannerRepo.createQueryBuilder('banner');

    if (query?.search) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(banner.title) LIKE :term OR LOWER(banner.description) LIKE :term)',
        { term },
      );
    }

    if (query?.isActive !== undefined) {
      qb.andWhere('banner.isActive = :isActive', { isActive: query.isActive });
    }

    if (query?.targetAudience) {
      qb.andWhere('banner.targetAudience = :audience', {
        audience: query.targetAudience,
      });
    }

    qb.orderBy('banner.displayOrder', 'ASC').addOrderBy(
      'banner.createdAt',
      'DESC',
    );

    const banners = await qb.getMany();
    return banners.map((b) => this.formatBanner(b));
  }

  async findOne(id: string): Promise<SuperAppBanner> {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Banner with ID "${id}" not found`);
    }
    return this.formatBanner(banner);
  }

  async create(
    dto: CreateBannerDto,
    file?: Express.Multer.File,
  ): Promise<SuperAppBanner> {
    let imageUrl = dto.imageUrl;

    if (file) {
      const upload = await this.storageService.uploadBannerImage(file);
      imageUrl = upload.url;
    }

    if (!imageUrl) {
      throw new BadRequestException('A banner image file or URL is required');
    }

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined || displayOrder === null) {
      const maxOrderBanner = await this.bannerRepo
        .createQueryBuilder('banner')
        .select('MAX(banner.displayOrder)', 'max')
        .getRawOne();
      displayOrder =
        maxOrderBanner && maxOrderBanner.max !== null
          ? Number(maxOrderBanner.max) + 1
          : 0;
    }

    const banner = this.bannerRepo.create({
      ...dto,
      imageUrl,
      displayOrder,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });

    const saved = await this.bannerRepo.save(banner);
    this.logger.log(`Created banner "${saved.title}" (${saved.id})`);
    return this.formatBanner(saved);
  }

  async update(
    id: string,
    dto: UpdateBannerDto,
    file?: Express.Multer.File,
  ): Promise<SuperAppBanner> {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Banner with ID "${id}" not found`);
    }

    if (file) {
      // Clean up old image if stored in our bucket
      if (banner.imageUrl) {
        await this.storageService.deleteBannerImage(banner.imageUrl);
      }
      const upload = await this.storageService.uploadBannerImage(file);
      banner.imageUrl = upload.url;
    } else if (dto.imageUrl !== undefined) {
      banner.imageUrl = dto.imageUrl;
    }

    if (dto.title !== undefined) banner.title = dto.title;
    if (dto.description !== undefined) banner.description = dto.description;
    if (dto.actionType !== undefined) banner.actionType = dto.actionType;
    if (dto.actionValue !== undefined) banner.actionValue = dto.actionValue;
    if (dto.displayOrder !== undefined) banner.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) banner.isActive = dto.isActive;
    if (dto.targetAudience !== undefined)
      banner.targetAudience = dto.targetAudience;

    if (dto.startDate !== undefined) {
      banner.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      banner.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    const updated = await this.bannerRepo.save(banner);
    this.logger.log(`Updated banner "${updated.title}" (${updated.id})`);
    return this.formatBanner(updated);
  }

  async remove(id: string): Promise<void> {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Banner with ID "${id}" not found`);
    }

    if (banner.imageUrl) {
      await this.storageService.deleteBannerImage(banner.imageUrl);
    }

    await this.bannerRepo.remove(banner);
    this.logger.log(`Deleted banner "${banner.title}" (${banner.id})`);
  }

  async reorder(items: Array<{ id: string; displayOrder: number }>): Promise<void> {
    if (!items || items.length === 0) return;

    await this.bannerRepo.manager.transaction(async (manager) => {
      for (const item of items) {
        await manager.update(SuperAppBanner, item.id, {
          displayOrder: item.displayOrder,
        });
      }
    });
    this.logger.log(`Reordered ${items.length} banners`);
  }

  /**
   * Client-facing query for active, non-expired banners
   */
  async findActiveForMobile(
    audiences: BannerAudience[] = [BannerAudience.PUBLIC],
  ): Promise<SuperAppBanner[]> {
    const now = new Date();
    const qb = this.bannerRepo.createQueryBuilder('banner');

    qb.where('banner.isActive = :isActive', { isActive: true })
      .andWhere('banner.targetAudience IN (:...audiences)', { audiences })
      .andWhere(
        '(banner.startDate IS NULL OR banner.startDate <= :now)',
        { now },
      )
      .andWhere(
        '(banner.endDate IS NULL OR banner.endDate >= :now)',
        { now },
      )
      .orderBy('banner.displayOrder', 'ASC')
      .addOrderBy('banner.createdAt', 'DESC');

    const banners = await qb.getMany();
    return banners.map((b) => this.formatBanner(b));
  }
}
