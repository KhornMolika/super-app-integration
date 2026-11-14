import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { QueryBoolean } from '../../common/transformers/query-boolean';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryMiniAppsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  /**
   * The runtime gate, apart from the lifecycle stage: LIVE (users can open it),
   * SUSPENDED (taken down), NOT_LIVE (draft: not released yet) or ARCHIVED
   * (mini_apps.status).
   */
  @IsOptional()
  @IsIn(['ALL', 'LIVE', 'SUSPENDED', 'NOT_LIVE', 'ARCHIVED'])
  availability?: 'ALL' | 'LIVE' | 'SUSPENDED' | 'NOT_LIVE' | 'ARCHIVED';

  @IsOptional()
  @IsString()
  integrationMethod?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  mine?: boolean;

  /** Archived apps are left out of the list unless asked for. */
  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  includeArchived?: boolean;
}
