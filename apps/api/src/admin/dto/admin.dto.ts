import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { MemberStatus, ProductStatus, VerifyStatus } from '@prisma/client';

// business-info
export class UpdateBusinessInfoVerifyDto {
  /** 관리자 결정: 승인 / 반려 (PENDING 으로 되돌리는 건 별도 절차) */
  @IsIn([VerifyStatus.APPROVED, VerifyStatus.REJECTED])
  verifyStatus!: VerifyStatus;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;
}

// product status
export class UpdateProductStatusDto {
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}

// member status
export class UpdateMemberStatusDto {
  /** 관리자 결정: ACTIVE(해제) / SUSPENDED(정지) */
  @IsIn([MemberStatus.ACTIVE, MemberStatus.SUSPENDED])
  status!: MemberStatus;
}

// category
export class CreateCategoryDto {
  @IsString()
  @Length(1, 50)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

// manufacturer
export class CreateManufacturerDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  country?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateManufacturerDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  country?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
