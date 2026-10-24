import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role identifier/name is required' })
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionNames?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
