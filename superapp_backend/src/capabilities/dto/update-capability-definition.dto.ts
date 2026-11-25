import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import type {
  CapabilityDetectionRules,
  CapabilityStoreMapping,
} from '../entities/capability-definition.entity';

export class CreateCapabilityDefinitionDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

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
  isAllowed?: boolean;

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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aliases?: string[];

  @IsObject()
  @IsOptional()
  detectionRules?: CapabilityDetectionRules;

  @IsObject()
  @IsOptional()
  storeMapping?: CapabilityStoreMapping;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateCapabilityDefinitionDto {
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
  isAllowed?: boolean;

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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aliases?: string[];

  @IsObject()
  @IsOptional()
  detectionRules?: CapabilityDetectionRules;

  @IsObject()
  @IsOptional()
  storeMapping?: CapabilityStoreMapping;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

// Backwards-compatible alias
export { UpdateCapabilityDefinitionDto as UpdatePermissionDefinitionDto };
