import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryMiniAppsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  /**
   * The runtime gate, apart from the lifecycle stage: LIVE (users can open it),
   * SUSPENDED (taken down) or NOT_LIVE (not released yet).
   */
  @IsOptional()
  @IsIn(['ALL', 'LIVE', 'SUSPENDED', 'NOT_LIVE'])
  availability?: 'ALL' | 'LIVE' | 'SUSPENDED' | 'NOT_LIVE';

  @IsOptional()
  @IsString()
  integrationMethod?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  mine?: boolean;

  /** Archived apps are left out of the list unless asked for. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  includeArchived?: boolean;
}
