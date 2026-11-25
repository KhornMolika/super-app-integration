import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PG_UUID_PATTERN } from '../../common/utils/uuid.util';
import { CollaboratorRole } from '../entities/miniapp-collaborator.entity';

export class ReviewChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsBoolean()
  @IsOptional()
  resolved?: boolean;

  @IsString()
  @IsOptional()
  resolutionNote?: string;
}

export class ReasonDto {
  @IsString()
  @IsNotEmpty({ message: 'Reason is required' })
  reason!: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsOptional()
  checklist?: ReviewChecklistItemDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetFiles?: string[];

  @IsBoolean()
  @IsOptional()
  notifyDev?: boolean;
}

export class StructuredReviewDecisionDto extends ReasonDto {}

export class SubmitReviewDto {
  @IsArray()
  @IsOptional()
  checklistResolutions?: Array<{
    id: string;
    resolved: boolean;
    resolutionNote?: string;
  }>;
}

export class RescanDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  securityChecks?: string[];

  @IsBoolean()
  @IsOptional()
  failedOnly?: boolean;
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

  @IsString()
  @IsOptional()
  androidStoragePath?: string;

  @IsString()
  @IsOptional()
  iosStoragePath?: string;
}

export class AddCollaboratorDto {
  @Matches(PG_UUID_PATTERN, { message: 'userId must be a valid identity UUID' })
  userId!: string;

  @IsOptional()
  // Clients built before the rename still send ADMIN for the per-app maintainer
  @Transform(({ value }) =>
    typeof value === 'string' && value.toUpperCase() === 'ADMIN'
      ? CollaboratorRole.MAINTAINER
      : value,
  )
  @IsEnum(CollaboratorRole, {
    message: `role must be one of: ${Object.values(CollaboratorRole).join(', ')}`,
  })
  role?: CollaboratorRole;
}

export class TransferOwnershipDto {
  @Matches(PG_UUID_PATTERN, {
    message: 'newOwnerId must be a valid identity UUID',
  })
  newOwnerId!: string;

  /** The previous owner stays on as a MAINTAINER collaborator (default true). */
  @IsOptional()
  @IsBoolean()
  keepPreviousOwner?: boolean;
}
