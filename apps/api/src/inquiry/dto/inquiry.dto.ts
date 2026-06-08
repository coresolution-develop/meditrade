import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateInquiryDto {
  @IsInt()
  @Min(1)
  productId!: number;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  message?: string;
}

export type InquiryRole = 'buyer' | 'seller';

export class FindInquiriesQueryDto {
  @IsIn(['buyer', 'seller'])
  role!: InquiryRole;
}

export class CreateQuoteDto {
  @IsInt()
  @Min(0)
  quotePrice!: number;

  /** yyyy-MM-dd 또는 ISO 8601 (날짜만 사용) */
  @IsDateString()
  validUntil!: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  memo?: string;
}
