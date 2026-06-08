import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTypeCode } from './notification.types';

function serialize(n: any) {
  return {
    id: n.id.toString(),
    memberId: n.memberId.toString(),
    type: n.type,
    title: n.title,
    body: n.body,
    linkUrl: n.linkUrl,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

interface NotifyPayload {
  type: NotificationTypeCode;
  title: string;
  body?: string;
  linkUrl?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 도메인 이벤트에서 호출하는 best-effort 알림.
   * 실패가 호출자 트랜잭션을 깨뜨리지 않도록 try/catch 내장 + 로그만 남긴다.
   * 호출자는 await 해도 되고 fire-and-forget(void) 해도 된다.
   */
  async notify(memberId: bigint, payload: NotifyPayload): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          memberId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          linkUrl: payload.linkUrl,
        },
      });
    } catch (e) {
      this.logger.warn(
        `notify failed: type=${payload.type} memberId=${memberId.toString()} err=${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  /** 본인 알림 목록. 미읽음 우선 → 최신순. */
  async findMine(memberId: bigint) {
    const items = await this.prisma.notification.findMany({
      where: { memberId },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    });
    const unread = items.filter((i) => !i.isRead).length;
    return {
      items: items.map(serialize),
      total: items.length,
      unread,
    };
  }

  /** 읽음 처리. 본인 알림만(아니면 403). */
  async markRead(memberId: bigint, notificationId: bigint) {
    const found = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!found) throw new NotFoundException('알림을 찾을 수 없습니다.');
    if (found.memberId !== memberId) {
      throw new ForbiddenException('본인 알림만 변경할 수 있습니다.');
    }
    if (found.isRead) return serialize(found);

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    return serialize(updated);
  }
}
