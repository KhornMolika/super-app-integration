import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryCapabilityProposalsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  miniAppId?: string;

  /** "true": only requests the caller made or supports */
  @IsOptional()
  @IsString()
  mine?: string;
}

// Backwards-compatible alias
export { QueryCapabilityProposalsDto as QueryPermissionProposalsDto };
