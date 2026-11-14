import { IsString, IsNotEmpty, IsEmail, IsOptional, IsArray, IsBoolean, MaxLength, MinLength, Matches, IsIn, ValidateIf } from 'class-validator';

export class CreateUserDto {
  /**
   * STAFF (default): a back-office user in an organization, with a role.
   * CONSUMER: a mobile app user; no organization, role or staff fields.
   */
  @IsOptional()
  @IsIn(['STAFF', 'CONSUMER'], { message: 'Account type is STAFF or CONSUMER' })
  accountType?: 'STAFF' | 'CONSUMER';

  @IsString()
  @IsNotEmpty({ message: 'User full name is required' })
  @MaxLength(120, { message: 'Name must be at most 120 characters' })
  name!: string;

  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email address is required' })
  email!: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleNames?: string[];

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Position must be at most 100 characters' })
  position?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Staff ID must be at most 50 characters' })
  staffId?: string;

  @IsString()
  @IsOptional()
  @Matches(/^$|^\+?[0-9 ()-]{6,30}$/, {
    message: 'Phone number: digits, spaces, ( ) - and an optional leading +, 6 to 30 characters',
  })
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  telegramChatId?: string;

  @IsString()
  @IsOptional()
  teamTelegramChatId?: string;

  @IsString()
  @IsOptional()
  telegramUsername?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  status?: string;

  // Consumers belong to no organization
  @ValidateIf((o: CreateUserDto) => o.accountType !== 'CONSUMER')
  @IsString({ message: 'Organization ID must be a string' })
  @IsNotEmpty({ message: 'Organization is required' })
  organizationId!: string;

  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password?: string;

  @IsString()
  @IsOptional()
  passwordHash?: string;
}
