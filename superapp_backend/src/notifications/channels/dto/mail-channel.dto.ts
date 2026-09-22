import { IsEmail, IsOptional } from 'class-validator';

export class SendTestEmailDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsOptional()
  email?: string;
}
