import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryCapabilityProposalsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  miniAppId?: string;
}

// Backwards-compatible alias
export { QueryCapabilityProposalsDto as QueryPermissionProposalsDto };
