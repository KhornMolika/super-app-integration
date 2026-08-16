import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniappService } from './miniapp.service';
import { MiniappController } from './miniapp.controller';
import { MiniApp } from './entities/miniapp.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MiniApp]),
    MailModule,
  ],
  controllers: [MiniappController],
  providers: [MiniappService],
})
export class MiniappModule {}
