import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum RetentionScheduleType {
  RECURRING = 'recurring',
  SPECIFIC_DATETIME = 'specific_datetime',
}

export enum RetentionFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export class UpdateArtifactRetentionDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsEnum(RetentionScheduleType)
  @IsOptional()
  scheduleType?: RetentionScheduleType;

  @IsString()
  @IsOptional()
  scheduleTime?: string;

  @IsEnum(RetentionFrequency)
  @IsOptional()
  frequency?: RetentionFrequency;

  @IsNumber()
  @Min(0)
  @Max(6)
  @IsOptional()
  weeklyDay?: number;

  @IsString()
  @IsOptional()
  specificRunDateTime?: string | null;

  @IsNumber()
  @Min(1)
  @Max(365)
  @IsOptional()
  retentionDays?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  maxTestBuildsPerApp?: number;

  @IsBoolean()
  @IsOptional()
  pruneSuperAppTestBuilds?: boolean;

  @IsBoolean()
  @IsOptional()
  pruneMiniAppArtifacts?: boolean;
}
