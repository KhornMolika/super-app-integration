import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PG_UUID_PATTERN } from '../../common/utils/uuid.util';
import { CollaboratorRole } from '../entities/miniapp-collaborator.entity';

export class ReasonDto {
  @IsString()
  @IsNotEmpty({ message: 'Reason is required' })
  reason!: string;
}

export class RescanDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  securityChecks?: string[];
}

export class VerifyDomainStandaloneDto {
  @IsString()
  @IsNotEmpty({ message: 'productionUrl is required' })
  productionUrl!: string;

  @IsString()
  @IsNotEmpty({ message: 'appId is required' })
  appId!: string;

  @IsString()
  @IsNotEmpty({ message: 'verificationToken is required' })
  verificationToken!: string;
}

export class DetectPermissionsDto {
  @IsString()
  @IsOptional()
  productionUrl?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  appId?: string;

  @IsString()
  @IsOptional()
  gitUrl?: string;

  @IsString()
  @IsOptional()
  gitBranch?: string;

  @IsString()
  @IsOptional()
  gitPath?: string;
}

export class AddCollaboratorDto {
  @Matches(PG_UUID_PATTERN, { message: 'userId must be a valid identity UUID' })
  userId!: string;

  @IsOptional()
  @IsEnum(CollaboratorRole, {
    message: `role must be one of: ${Object.values(CollaboratorRole).join(', ')}`,
  })
  role?: CollaboratorRole;
}
