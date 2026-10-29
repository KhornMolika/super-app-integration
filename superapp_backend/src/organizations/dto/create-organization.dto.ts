import {
  IsString,
  ValidateIf,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { OrganizationStatus } from '../entities/organization.entity';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  name!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @ValidateIf((o) => o.parentId !== null && o.parentId !== '' && o.parentId !== undefined)
  @IsUUID('4', { message: 'parentId must be a valid UUID' })
  @IsOptional()
  parentId?: string | null;

  @IsString()
  @IsOptional()
  parentAuthority?: string | null;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(OrganizationStatus, { message: 'Status must be ACTIVE or INACTIVE' })
  @IsOptional()
  status?: OrganizationStatus;
}
