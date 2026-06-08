import { IsOptional, IsString, Length } from 'class-validator';

export class CreateBusinessInfoDto {
  @IsString()
  @Length(1, 100)
  companyName!: string;

  @IsString()
  @Length(1, 20)
  bizRegNo!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  deviceSalesLicenseNo?: string;
}
