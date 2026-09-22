import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // Length/equality policy is enforced by PasswordService (single source).
  @IsString()
  @MaxLength(1024)
  password!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}

export class LoginDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  password!: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token!: string;

  /** Must be the password chosen at (the latest) registration of this email. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  password!: string;
}

/** Logout is idempotent: a missing/empty token is a silent no-op (204). */
export class LogoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  refresh_token?: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refresh_token!: string;
}
