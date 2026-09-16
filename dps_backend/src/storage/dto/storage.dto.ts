import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateLicenseDto {
  @IsString()
  @IsNotEmpty({ message: 'License key string is required' })
  licenseKey!: string;
}

export class UploadBase64Dto {
  @IsString()
  @IsNotEmpty({ message: 'Base64 image data is required' })
  base64!: string;

  @IsString()
  @IsOptional()
  nameHint?: string;
}
