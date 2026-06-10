import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VerifyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.types';
import { UpdateBusinessInfoVerifyDto } from './dto/admin.dto';

function serialize(b: any) {
  return {
    id: b.id.toString(),
    memberId: b.memberId.toString(),
    companyName: b.companyName,
    bizRegNo: b.bizRegNo,
    deviceSalesLicenseNo: b.deviceSalesLicenseNo,
    verifyStatus: b.verifyStatus,
    createdAt: b.createdAt,
  };
}

// 심사 목록용 — 신청자 식별을 위해 member(이메일/이름) 조인 포함.
function serializeWithMember(b: any) {
  return {
    ...serialize(b),
    member: b.member
      ? {
          id: b.member.id.toString(),
          email: b.member.email,
          name: b.member.name,
        }
      : null,
  };
}

function parseVerifyStatus(status?: string): VerifyStatus | undefined {
  if (status === undefined || status === '') return undefined;
  if (!Object.values(VerifyStatus).includes(status as VerifyStatus)) {
    throw new BadRequestException('유효하지 않은 status 값입니다.');
  }
  return status as VerifyStatus;
}

@Injectable()
export class BusinessInfoAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
  ) {}

  /**
   * 사업자 인증 심사 목록. status 미지정 시 전체, 지정 시 해당 상태만.
   * 신청자 식별을 위해 member(이메일/이름)를 조인한다. 최신순.
   */
  async findAll(status?: string) {
    const verifyStatus = parseVerifyStatus(status);
    const items = await this.prisma.businessInfo.findMany({
      where: verifyStatus ? { verifyStatus } : {},
      include: { member: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { items: items.map(serializeWithMember), total: items.length };
  }

  /**
   * 사업자 인증 승인/반려. 결과를 해당 SELLER 에게 알림(best-effort).
   * 알림 type 은 INQUIRY_RECEIVED 등과 동일하게 VARCHAR(40) 사용.
   */
  async updateVerify(id: bigint, dto: UpdateBusinessInfoVerifyDto) {
    const found = await this.prisma.businessInfo.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('사업자 정보를 찾을 수 없습니다.');

    const updated = await this.prisma.businessInfo.update({
      where: { id },
      data: { verifyStatus: dto.verifyStatus },
    });

    // 알림 (NOTI-001~004 외 운영 알림 — 별도 type 코드)
    const approved = dto.verifyStatus === VerifyStatus.APPROVED;
    await this.notification.notify(updated.memberId, {
      type: NotificationType.BUSINESS_INFO_VERIFIED,
      title: approved
        ? '사업자 인증이 승인되었습니다.'
        : '사업자 인증이 반려되었습니다.',
      body: approved
        ? '이제 정식 거래 기능을 이용할 수 있습니다.'
        : dto.reason
          ? '관리자의 메모: 사유는 마이페이지에서 확인하세요.'
          : '재제출이 필요합니다. 마이페이지에서 다시 등록해 주세요.',
      linkUrl: '/seller/business-info',
    });

    return serialize(updated);
  }
}
