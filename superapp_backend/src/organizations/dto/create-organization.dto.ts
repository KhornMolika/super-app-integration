import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { OrganizationStatus } from '../entities/organization.entity';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  name!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  parentAuthority?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(OrganizationStatus, { message: 'Status must be ACTIVE or INACTIVE' })
  @IsOptional()
  status?: OrganizationStatus;
}
