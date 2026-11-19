import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAppBanner } from './entities/banner.entity';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SuperAppBanner]),
    StorageModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [BannersController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule {}
