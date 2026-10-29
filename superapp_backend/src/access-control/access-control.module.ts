import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { AccessToken } from './entities/access-token.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { AccessControlService } from './access-control.service';
import { SeederService } from './seeder.service';
import { UsersController } from './users.controller';
import { RolesController } from './roles.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      AccessToken,
      Organization,
    ]),
    forwardRef(() => AuthModule),
    StorageModule,
  ],
  controllers: [UsersController, RolesController],
  providers: [AccessControlService, SeederService],
  exports: [AccessControlService, TypeOrmModule],
})
export class AccessControlModule {}
