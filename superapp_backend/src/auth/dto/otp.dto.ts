import { IsEmail, IsNotEmpty, IsString, Length, IsOptional, IsIn } from 'class-validator';

export class RequestOtpDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email address cannot be empty' })
  email!: string;

  @IsOptional()
  @IsIn(['PASSWORD_RESET', 'EMAIL_VERIFICATION'], {
    message: 'Purpose must be PASSWORD_RESET or EMAIL_VERIFICATION',
  })
  purpose?: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email address cannot be empty' })
  email!: string;

  @IsString({ message: 'Verification code must be a string' })
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  code!: string;

  @IsOptional()
  @IsIn(['PASSWORD_RESET', 'EMAIL_VERIFICATION'], {
    message: 'Purpose must be PASSWORD_RESET or EMAIL_VERIFICATION',
  })
  purpose?: string;
}

export class ResetPasswordDto {
  @IsString({ message: 'Reset token is required' })
  @IsNotEmpty({ message: 'Reset token cannot be empty' })
  resetToken!: string;

  @IsString({ message: 'New password must be a string' })
  @Length(8, 128, { message: 'New password must be at least 8 characters long' })
  newPassword!: string;
}
