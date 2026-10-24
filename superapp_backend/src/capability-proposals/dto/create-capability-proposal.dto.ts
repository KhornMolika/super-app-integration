import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCapabilityProposalDto {
  @IsString()
  @IsOptional()
  capabilityKey?: string;

  @IsString()
  @IsOptional()
  capabilityName?: string;

  // Backwards-compatible aliases
  @IsString()
  @IsOptional()
  permissionKey?: string;

  @IsString()
  @IsOptional()
  permissionName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  miniAppId?: string;

  @IsOptional()
  metadata?: any;
}

export { CreateCapabilityProposalDto as CreatePermissionProposalDto };
