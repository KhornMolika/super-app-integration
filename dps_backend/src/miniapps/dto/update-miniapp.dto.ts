import { PartialType } from '@nestjs/mapped-types';
import { CreateMiniAppDto } from './create-miniapp.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum AppStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
}

export class UpdateMiniAppDto extends PartialType(CreateMiniAppDto) {
  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  publishedPermissions?: any;
}
