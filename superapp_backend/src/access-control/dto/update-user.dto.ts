import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

/**
 * Every field optional. organizationId is re-declared: on an update an empty
 * value means "unchanged / none" (a mobile app user has no organization), not
 * a missing required field.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['organizationId'] as const),
) {
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  teamTelegramChatId?: string;

  @IsString()
  @IsOptional()
  password?: string;
}
