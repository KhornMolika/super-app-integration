import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** Shortest rejection reason accepted, so the developer learns why. */
export const MIN_REJECT_REASON_LENGTH = 10;

export enum ProposalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_DEVELOPMENT = 'IN_DEVELOPMENT',
}

export class ReviewProposalDto {
  @IsEnum(ProposalDecision, {
    message: 'Decision must be one of: APPROVED, REJECTED, IN_DEVELOPMENT',
  })
  @IsNotEmpty({ message: 'Decision is required' })
  decision!: ProposalDecision;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((o) => o.decision === ProposalDecision.REJECTED)
  @IsString()
  @MinLength(MIN_REJECT_REASON_LENGTH, {
    message: `Please give a reason of at least ${MIN_REJECT_REASON_LENGTH} characters so the developer knows why.`,
  })
  reason?: string;

  @IsString()
  @IsOptional()
  targetVersion?: string;

  @IsString()
  @IsOptional()
  targetBranch?: string;

  @IsOptional()
  createMr?: boolean;

  @IsOptional()
  metadata?: any;
}
