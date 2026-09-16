import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
  IsObject,
} from 'class-validator';
import { OrganizationStatus } from '../entities/organization.entity';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Domain is required' })
  domain!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(OrganizationStatus, { message: 'Status must be ACTIVE, INACTIVE, or PENDING' })
  @IsOptional()
  status?: OrganizationStatus;

  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
