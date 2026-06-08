import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { MeetingStatus, MeetingType } from '@prisma/client';

export class CreateMeetingDto {
  @IsInt()
  @Min(1)
  sellerId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number;

  @IsEnum(MeetingType)
  meetingType!: MeetingType;

  @IsString()
  @Length(1, 100)
  purpose!: string;

  /** ISO 8601 datetime, 1~3개. 미래 시점만 허용(서비스에서 추가 검증). */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsDateString({}, { each: true })
  preferredSlots!: string[];

  @IsOptional()
  @IsString()
  @Length(1, 200)
  location?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  message?: string;
}

export type MeetingRole = 'buyer' | 'seller';

export class FindMeetingsQueryDto {
  @IsIn(['buyer', 'seller'])
  role!: MeetingRole;
}

/**
 * 상태 변경 본문.
 * - status: 전이 목표
 * - selectedSlot: ACCEPTED, CONFIRMED 시 사용 (해당 meeting 의 slot.proposedAt 과 일치)
 * - proposedSlot: RESCHEDULE_PROPOSED 시 사용 (새 slot 추가)
 */
export class UpdateMeetingDto {
  @IsEnum(MeetingStatus)
  status!: MeetingStatus;

  @IsOptional()
  @IsDateString()
  selectedSlot?: string;

  @IsOptional()
  @IsDateString()
  proposedSlot?: string;
}
