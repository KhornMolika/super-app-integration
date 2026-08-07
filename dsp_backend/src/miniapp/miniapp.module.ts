import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniappService } from './miniapp.service';
import { MiniappController } from './miniapp.controller';
import { MiniApp } from './entities/miniapp.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MiniApp])],
  controllers: [MiniappController],
  providers: [MiniappService],
})
export class MiniappModule {}
