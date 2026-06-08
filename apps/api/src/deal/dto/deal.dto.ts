import { IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { DealStatus } from '@prisma/client';

export class CreateDealDto {
  @IsInt()
  @Min(1)
  inquiryId!: number;

  /** 사용할 견적 id. 없으면 해당 문의의 가장 최근 견적을 사용. */
  @IsOptional()
  @IsInt()
  @Min(1)
  quoteId?: number;
}

export type DealRole = 'buyer' | 'seller';

export class FindDealsQueryDto {
  @IsIn(['buyer', 'seller'])
  role!: DealRole;
}

export class UpdateDealStatusDto {
  @IsEnum(DealStatus)
  status!: DealStatus;
}
