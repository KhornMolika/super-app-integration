import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAppCapability } from './entities/super-app-capability.entity';
import { SuperAppController } from './super-app.controller';
import { SuperAppService } from './super-app.service';

@Module({
  imports: [TypeOrmModule.forFeature([SuperAppCapability]), AuthModule],
  controllers: [SuperAppController],
  providers: [SuperAppService],
  exports: [SuperAppService],
})
export class SuperAppModule {}
