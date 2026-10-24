import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAppCapability } from './entities/super-app-capability.entity';
import { MiniApp } from '../miniapps/entities/miniapp.entity';
import { SuperAppController } from './super-app.controller';
import { SuperAppService } from './super-app.service';
import { CapabilitiesModule } from '../capabilities/capabilities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SuperAppCapability, MiniApp]),
    AuthModule,
    CapabilitiesModule,
  ],
  controllers: [SuperAppController],
  providers: [SuperAppService],
  exports: [SuperAppService],
})
export class SuperAppModule {}

