import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrganizationStatus } from '../entities/organization.entity';

export class QueryOrganizationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
