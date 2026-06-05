import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ConditionType, ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsInt()
  categoryId!: number;

  @IsEnum(ConditionType)
  conditionType!: ConditionType;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() modelName?: string;
  @IsOptional() @IsInt() price?: number;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}
