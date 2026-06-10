import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus, Role } from '@prisma/client';
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

// 목록용 — 연락처/가입일 추가. password 등 민감정보는 select 단계에서 제외.
function serializeListItem(m: any) {
  return {
    ...serialize(m),
    phone: m.phone,
    createdAt: m.createdAt,
  };
}

function parseRole(role?: string): Role | undefined {
  if (role === undefined || role === '') return undefined;
  if (!Object.values(Role).includes(role as Role)) {
    throw new BadRequestException('유효하지 않은 role 값입니다.');
  }
  return role as Role;
}

function parseMemberStatus(status?: string): MemberStatus | undefined {
  if (status === undefined || status === '') return undefined;
  if (!Object.values(MemberStatus).includes(status as MemberStatus)) {
    throw new BadRequestException('유효하지 않은 status 값입니다.');
  }
  return status as MemberStatus;
}

@Injectable()
export class MemberAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
  ) {}

  /**
   * 회원 목록. role/status 필터(선택), 최신순 페이징.
   * password 는 select 에서 제외하여 응답에 노출하지 않는다.
   */
  async findAll(role?: string, status?: string, page = 1, size = 20) {
    const where: { role?: Role; status?: MemberStatus } = {};
    const memberRole = parseRole(role);
    const memberStatus = parseMemberStatus(status);
    if (memberRole) where.role = memberRole;
    if (memberStatus) where.status = memberStatus;

    const skip = (page - 1) * size;
    const [items, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.member.count({ where }),
    ]);
    return { items: items.map(serializeListItem), total, page, size };
  }

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
