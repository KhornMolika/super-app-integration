import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  currentPassword!: string;

  // Policy is enforced by PasswordService (single source).
  @IsString()
  @MaxLength(1024)
  newPassword!: string;
}

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  password!: string;
}
