import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccessTokenDto {
  @IsString({ message: 'Token name must be a string' })
  @IsNotEmpty({ message: 'Token name is required' })
  name!: string;

  @IsInt({ message: 'Expiration days must be an integer' })
  @Min(1, { message: 'Expiration must be at least 1 day' })
  @IsOptional()
  expirationDays?: number;

  @IsArray({ message: 'Scopes must be an array of strings' })
  @IsString({ each: true, message: 'Each scope must be a string' })
  @IsOptional()
  scopes?: string[];
}
