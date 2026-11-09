import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class NexusPackageDto {
  @IsString()
  @IsNotEmpty({ message: 'packageName is required' })
  packageName!: string;
}

export class NexusSnippetDto extends NexusPackageDto {
  @IsOptional()
  @IsString()
  versionConstraint?: string;
}
