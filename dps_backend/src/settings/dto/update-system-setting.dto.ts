import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSystemSettingDto {
  @IsNotEmpty({ message: 'Setting value cannot be empty' })
  value!: any;

  @IsString()
  @IsOptional()
  description?: string;
}
