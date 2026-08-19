import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { AccessControlService } from './access-control.service';
import { SeederService } from './seeder.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission]), forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [AccessControlService, SeederService],
  exports: [AccessControlService, TypeOrmModule],
})
export class AccessControlModule {}
