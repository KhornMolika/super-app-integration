import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ManualConnectDto {
  @IsString()
  @IsNotEmpty({ message: 'Telegram chat ID is required' })
  chatId!: string;

  @IsString()
  @IsOptional()
  username?: string;
}

export class SaveTeamChatDto {
  @IsString()
  @IsOptional()
  teamTelegramChatId?: string;
}

export class TestTeamAlertDto {
  @IsString()
  @IsOptional()
  chatId?: string;

  @IsString()
  @IsOptional()
  miniAppName?: string;

  @IsString()
  @IsOptional()
  message?: string;
}

export class ReassignGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'oldChatId is required' })
  oldChatId!: string;

  @IsString()
  @IsOptional()
  newChatId?: string | null;
}

export class AssignAppGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'miniAppId is required' })
  miniAppId!: string;

  @IsString()
  @IsOptional()
  newChatId?: string | null;
}
