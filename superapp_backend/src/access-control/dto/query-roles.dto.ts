import { IsOptional, IsBoolean } from 'class-validator';
import { QueryBoolean } from '../../common/transformers/query-boolean';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryRolesDto extends PaginationQueryDto {
  @IsOptional()
  @IsBoolean()
  @QueryBoolean()
  isActive?: boolean;
}
