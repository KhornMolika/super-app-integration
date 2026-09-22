import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class InjectDependencyDto {
  @IsString()
  packageName: string;

  @IsOptional()
  @IsString()
  gitUrl?: string;

  @IsOptional()
  @IsString()
  ref?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsBoolean()
  isHosted?: boolean;

  @IsOptional()
  @IsString()
  hostedUrl?: string;
}

export class RemoveDependencyDto {
  @IsString()
  packageName: string;
}

export class ValidateDependencyDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = true;
}

export class PrecheckConflictDto {
  @IsOptional()
  @IsString()
  miniAppId?: string;

  @IsString()
  packageName: string;

  @IsOptional()
  @IsString()
  gitUrl?: string;

  @IsOptional()
  @IsString()
  ref?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsBoolean()
  isHosted?: boolean;

  @IsOptional()
  @IsString()
  hostedUrl?: string;

  @IsOptional()
  @IsString()
  deployKey?: string;

  @IsOptional()
  @IsString()
  gitAccessToken?: string;
}
