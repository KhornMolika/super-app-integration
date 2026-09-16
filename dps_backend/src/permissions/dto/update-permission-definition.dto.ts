import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdatePermissionDefinitionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isDeprecated?: boolean;

  @IsString()
  @IsOptional()
  introducedInVersion?: string;

  @IsString()
  @IsOptional()
  deprecatedInVersion?: string;

  @IsString()
  @IsOptional()
  minSuperAppVersion?: string;

  @IsString()
  @IsOptional()
  maxSuperAppVersion?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
