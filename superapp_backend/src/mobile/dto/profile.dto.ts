import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EndUserHonorific } from '../entities/end-user.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** '' / whitespace clears the field (null); an absent key leaves it unchanged. */
const trimToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value.trim() === ''
      ? null
      : value.trim()
    : value;

export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(trimToNull)
  @IsIn(Object.values(EndUserHonorific))
  honorific?: EndUserHonorific | null;

  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(100)
  position?: string | null;

  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(150)
  organizationUnit?: string | null;

  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'Staff ID may contain letters, digits and dashes only',
  })
  staffId?: string | null;
}
