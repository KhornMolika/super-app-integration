import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
