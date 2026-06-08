import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.types';
import { UpdateMemberStatusDto } from './dto/admin.dto';

function serialize(m: any) {
  return {
    id: m.id.toString(),
    email: m.email,
    name: m.name,
    role: m.role,
    status: m.status,
  };
}

@Injectable()
export class MemberAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
  ) {}

  /**
   * 회원 정지(SUSPENDED) / 해제(ACTIVE).
   * 참고: 정지 시 보유 토큰 강제 무효화는 별도 작업(Redis 블랙리스트 확장)로 추후.
   */
  async updateStatus(id: bigint, dto: UpdateMemberStatusDto) {
    const found = await this.prisma.member.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('회원을 찾을 수 없습니다.');

    const updated = await this.prisma.member.update({
      where: { id },
      data: { status: dto.status },
    });

    const suspended = dto.status === MemberStatus.SUSPENDED;
    await this.notification.notify(updated.id, {
      type: NotificationType.MEMBER_STATUS_CHANGED,
      title: suspended
        ? '계정이 정지되었습니다.'
        : '계정 정지가 해제되었습니다.',
      body: suspended
        ? '플랫폼 정책 위반으로 일부 기능 사용이 제한됩니다.'
        : '정상적으로 모든 기능을 이용할 수 있습니다.',
      linkUrl: '/mypage',
    });

    return serialize(updated);
  }
}
