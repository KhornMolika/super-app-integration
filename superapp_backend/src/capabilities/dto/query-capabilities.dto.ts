import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { QueryBoolean } from '../../common/transformers/query-boolean';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryCapabilitiesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  @QueryBoolean()
  isActive?: boolean;
}

// Backwards-compatible alias
export { QueryCapabilitiesDto as QueryPermissionsDto };
