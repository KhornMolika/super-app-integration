import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  targetVersion?: string;
}
