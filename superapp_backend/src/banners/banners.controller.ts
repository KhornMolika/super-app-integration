import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerAudience } from './entities/banner.entity';

@Controller(['banners', 'api/banners'])
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  /**
   * Public/Mobile endpoint: List active unexpired banners
   */
  @Get('active')
  async getActiveBanners(@Query('audience') audience?: BannerAudience) {
    const audiences = [BannerAudience.PUBLIC];
    if (audience === BannerAudience.ALL_FSA_STAFF) {
      audiences.push(BannerAudience.ALL_FSA_STAFF);
    }
    return this.bannersService.findActiveForMobile(audiences);
  }

  /**
   * Admin: List all banners
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('targetAudience') targetAudience?: BannerAudience,
  ) {
    const activeFilter =
      isActive === undefined ? undefined : isActive === 'true';
    return this.bannersService.findAllAdmin({
      search,
      isActive: activeFilter,
      targetAudience,
    });
  }

  /**
   * Admin: Get single banner by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bannersService.findOne(id);
  }

  /**
   * Admin: Create a new banner (supports JSON or multipart/form-data)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    }),
  )
  async create(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const dto: CreateBannerDto = { ...body };
    if (typeof (body as any).isActive === 'string') {
      dto.isActive = (body as any).isActive === 'true';
    }
    if (typeof (body as any).displayOrder === 'string') {
      dto.displayOrder = parseInt((body as any).displayOrder, 10);
    }
    return this.bannersService.create(dto, file);
  }

  /**
   * Admin: Update an existing banner (supports PUT or PATCH)
   */
  @Put(':id')
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const dto: UpdateBannerDto = { ...body };
    if (typeof (body as any).isActive === 'string') {
      dto.isActive = (body as any).isActive === 'true';
    }
    if (typeof (body as any).displayOrder === 'string') {
      dto.displayOrder = parseInt((body as any).displayOrder, 10);
    }
    return this.bannersService.update(id, dto, file);
  }

  /**
   * Admin: Delete a banner
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.bannersService.remove(id);
    return { success: true };
  }

  /**
   * Admin: Reorder banners
   */
  @Patch('reorder')
  @UseGuards(JwtAuthGuard)
  async reorder(
    @Body() body: { items: Array<{ id: string; displayOrder: number }> },
  ) {
    await this.bannersService.reorder(body.items || []);
    return { success: true };
  }
}
