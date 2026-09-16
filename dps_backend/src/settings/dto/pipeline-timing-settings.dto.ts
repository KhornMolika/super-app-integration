import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export enum PipelinePreset {
  INSTANT = 'instant',
  REALISTIC = 'realistic',
  DEMO = 'demo',
  CUSTOM = 'custom',
}

export enum TelegramStyle {
  RICH_CARDS = 'rich_cards',
  COMPACT = 'compact',
}

export class UpdatePipelineTimingDto {
  @IsEnum(PipelinePreset)
  @IsOptional()
  preset?: PipelinePreset;

  @IsNumber()
  @Min(0)
  @Max(300)
  @IsOptional()
  validationStartDelaySec?: number;

  @IsNumber()
  @Min(0)
  @Max(300)
  @IsOptional()
  securityScanPacingSec?: number;

  @IsNumber()
  @Min(0)
  @Max(300)
  @IsOptional()
  validationPassDelaySec?: number;

  @IsNumber()
  @Min(0)
  @Max(300)
  @IsOptional()
  buildTriggerDelaySec?: number;

  @IsBoolean()
  @IsOptional()
  enablePacing?: boolean;

  @IsEnum(TelegramStyle)
  @IsOptional()
  telegramStyle?: TelegramStyle;

  @IsBoolean()
  @IsOptional()
  enableTelegramActionButtons?: boolean;
}
