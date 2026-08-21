import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { GitProviderType } from '../git-provider.interface';

export class DetectGitProviderDto {
  @IsString()
  @IsNotEmpty()
  url!: string;
}

export class GitRepoQueryDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsEnum(['github', 'gitlab'])
  @IsOptional()
  provider?: GitProviderType;

  @IsString()
  @IsOptional()
  token?: string;
}

export class GitCommitsQueryDto extends GitRepoQueryDto {
  @IsString()
  @IsOptional()
  ref?: string;

  @IsOptional()
  limit?: number;
}

export class ValidateGitPackageDto extends GitRepoQueryDto {
  @IsString()
  @IsOptional()
  ref?: string;

  @IsString()
  @IsOptional()
  path?: string;
}

export class GenerateGitSnippetDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsEnum(['github', 'gitlab'])
  @IsOptional()
  provider?: GitProviderType;

  @IsString()
  @IsOptional()
  packageName?: string;

  @IsEnum(['tag', 'branch', 'commit'])
  @IsOptional()
  refType?: 'tag' | 'branch' | 'commit';

  @IsString()
  @IsOptional()
  ref?: string;

  @IsString()
  @IsOptional()
  path?: string;
}
