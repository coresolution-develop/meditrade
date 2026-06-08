import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MeetingStatus, Prisma, SlotProposer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.types';
import {
  CreateMeetingDto,
  MeetingRole,
  UpdateMeetingDto,
} from './dto/meeting.dto';

// ─── 직렬화 ──────────────────────────────────────────────
function serializeSlot(s: any) {
  return {
    id: s.id.toString(),
    meetingId: s.meetingId.toString(),
    proposedAt: s.proposedAt,
    proposedBy: s.proposedBy,
    isSelected: s.isSelected,
  };
}

function serializeMeeting(m: any) {
  return {
    id: m.id.toString(),
    buyerId: m.buyerId.toString(),
    sellerId: m.sellerId.toString(),
    productId: m.productId === null ? null : m.productId.toString(),
    meetingType: m.meetingType,
    purpose: m.purpose,
    message: m.message,
    location: m.location,
    confirmedAt: m.confirmedAt,
    status: m.status,
    createdAt: m.createdAt,
    ...(m.slots !== undefined && { slots: m.slots.map(serializeSlot) }),
  };
}

// ─── 도메인 코드 ─────────────────────────────────────────
function illegalState(message: string) {
  return new ConflictException({ code: 'ILLEGAL_STATE', message });
}

// ─── 상태머신 (PHASE2-TASKS.md "상태 전이 규칙" 일치) ──
type Actor = 'buyer' | 'seller';

interface Transition {
  /** 어느 쪽이 수행할 수 있는가. ['buyer','seller'] = 양측. */
  by: Actor[];
}

const TRANSITIONS: Record<
  MeetingStatus,
  Partial<Record<MeetingStatus, Transition>>
> = {
  REQUESTED: {
    ACCEPTED: { by: ['seller'] },
    REJECTED: { by: ['seller'] },
    RESCHEDULE_PROPOSED: { by: ['seller'] },
    // 사용자가 CANCELED 를 명시 요구하지 않았지만 안전망: REQUESTED→CANCELED 는 차단(요구사항에 미정의)
  },
  ACCEPTED: {
    CONFIRMED: { by: ['buyer', 'seller'] },
    CANCELED: { by: ['buyer', 'seller'] },
  },
  RESCHEDULE_PROPOSED: {
    ACCEPTED: { by: ['buyer', 'seller'] },
    CONFIRMED: { by: ['buyer', 'seller'] },
    CANCELED: { by: ['buyer', 'seller'] },
  },
  CONFIRMED: {
    COMPLETED: { by: ['buyer', 'seller'] },
    CANCELED: { by: ['buyer', 'seller'] },
  },
  // 최종 상태(전이 불가)
  REJECTED: {},
  CANCELED: {},
  COMPLETED: {},
};

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
  ) {}

  /** BUYER: 새 미팅 요청 생성 + 희망 슬롯(BUYER 제안). */
  async create(buyerId: bigint, dto: CreateMeetingDto) {
    const sellerId = BigInt(dto.sellerId);

    const seller = await this.prisma.member.findUnique({
      where: { id: sellerId },
    });
    if (!seller || seller.role !== 'SELLER') {
      throw new NotFoundException('판매자를 찾을 수 없습니다.');
    }
    if (sellerId === buyerId) {
      throw new BadRequestException('본인에게 미팅을 요청할 수 없습니다.');
    }

    if (dto.productId !== undefined) {
      const product = await this.prisma.product.findUnique({
        where: { id: BigInt(dto.productId) },
      });
      if (!product) throw new NotFoundException('상품을 찾을 수 없습니다.');
    }

    // 슬롯 미래시점 검증 + 중복 제거
    const now = Date.now();
    const seen = new Set<number>();
    const slotTimes: Date[] = [];
    for (const iso of dto.preferredSlots) {
      const t = new Date(iso).getTime();
      if (Number.isNaN(t) || t <= now) {
        throw new BadRequestException(
          '희망 일시는 모두 미래 시점이어야 합니다.',
        );
      }
      if (seen.has(t)) continue;
      seen.add(t);
      slotTimes.push(new Date(t));
    }

    const meeting = await this.prisma.meetingRequest.create({
      data: {
        buyerId,
        sellerId,
        productId: dto.productId !== undefined ? BigInt(dto.productId) : null,
        meetingType: dto.meetingType,
        purpose: dto.purpose,
        message: dto.message,
        location: dto.location,
        // status default = REQUESTED
        slots: {
          create: slotTimes.map((d) => ({
            proposedAt: d,
            proposedBy: SlotProposer.BUYER,
            isSelected: false,
          })),
        },
      },
      include: { slots: true },
    });

    // NOTI-004 — 판매자에게 미팅 요청 도착 알림 (best-effort)
    await this.notification.notify(meeting.sellerId, {
      type: NotificationType.MEETING_REQUESTED,
      title: '새 미팅 요청이 도착했습니다.',
      body: '받은 미팅 요청 목록에서 일정을 확인하세요.',
      linkUrl: `/seller/meetings/${meeting.id.toString()}`,
    });
    return serializeMeeting(meeting);
  }

  /** 본인 미팅 목록(역할 기준). 슬롯 포함, 최신순. */
  async findMine(memberId: bigint, role: MeetingRole) {
    const where =
      role === 'buyer' ? { buyerId: memberId } : { sellerId: memberId };
    const items = await this.prisma.meetingRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { slots: { orderBy: { proposedAt: 'asc' } } },
    });
    return { items: items.map(serializeMeeting), total: items.length };
  }

  /** 상태 변경. 상태머신 + 행위자 가드 + 슬롯 처리. */
  async update(memberId: bigint, meetingId: bigint, dto: UpdateMeetingDto) {
    const meeting = await this.prisma.meetingRequest.findUnique({
      where: { id: meetingId },
      include: { slots: true },
    });
    if (!meeting) throw new NotFoundException('미팅을 찾을 수 없습니다.');

    // 소유자 확인
    const actor: Actor =
      meeting.sellerId === memberId
        ? 'seller'
        : meeting.buyerId === memberId
          ? 'buyer'
          : (() => {
              throw new ForbiddenException('본인 미팅만 변경할 수 있습니다.');
            })();

    const target = dto.status;

    // 전이 허용 여부
    const transition = TRANSITIONS[meeting.status][target];
    if (!transition) {
      this.logger.warn(
        `meeting ${meetingId} transition blocked: ${meeting.status} → ${target} (actor=${actor})`,
      );
      throw illegalState('해당 상태로 전이할 수 없습니다.');
    }

    // 행위자(역할) 가드 — 동일 상태머신 안에서 buyer 시도 / seller 시도 구분
    if (!transition.by.includes(actor)) {
      this.logger.warn(
        `meeting ${meetingId} transition denied by role: ${meeting.status} → ${target} actor=${actor}`,
      );
      throw new ForbiddenException('해당 상태 변경을 수행할 권한이 없습니다.');
    }

    // 상태별 side-effect 준비
    type UpdateData = {
      status: MeetingStatus;
      confirmedAt?: Date;
    };
    const data: UpdateData = { status: target };
    const slotOps: Prisma.PrismaPromise<unknown>[] = [];

    if (target === MeetingStatus.ACCEPTED) {
      const selected = this.requireSelectedSlot(meeting, dto.selectedSlot);
      slotOps.push(
        this.prisma.meetingSlot.updateMany({
          where: { meetingId, isSelected: true },
          data: { isSelected: false },
        }),
        this.prisma.meetingSlot.update({
          where: { id: selected.id },
          data: { isSelected: true },
        }),
      );
    } else if (target === MeetingStatus.CONFIRMED) {
      // selectedSlot 이 오면 재설정, 없으면 기존 선택 슬롯이 있어야 한다
      if (dto.selectedSlot) {
        const selected = this.requireSelectedSlot(meeting, dto.selectedSlot);
        slotOps.push(
          this.prisma.meetingSlot.updateMany({
            where: { meetingId, isSelected: true },
            data: { isSelected: false },
          }),
          this.prisma.meetingSlot.update({
            where: { id: selected.id },
            data: { isSelected: true },
          }),
        );
      } else if (!meeting.slots.some((s) => s.isSelected)) {
        throw new BadRequestException(
          '확정하려면 선택된 일시(selectedSlot)가 필요합니다.',
        );
      }
      data.confirmedAt = new Date();
    } else if (target === MeetingStatus.RESCHEDULE_PROPOSED) {
      if (!dto.proposedSlot) {
        throw new BadRequestException(
          '재제안하려면 새 일시(proposedSlot)가 필요합니다.',
        );
      }
      const t = new Date(dto.proposedSlot).getTime();
      if (Number.isNaN(t) || t <= Date.now()) {
        throw new BadRequestException('재제안 일시는 미래 시점이어야 합니다.');
      }
      slotOps.push(
        this.prisma.meetingSlot.create({
          data: {
            meetingId,
            proposedAt: new Date(t),
            proposedBy: SlotProposer.SELLER,
            isSelected: false,
          },
        }),
      );
    }
    // REJECTED, CANCELED, COMPLETED 는 상태만 변경

    await this.prisma.$transaction([
      ...slotOps,
      this.prisma.meetingRequest.update({
        where: { id: meetingId },
        data,
      }),
    ]);

    // NOTI-004 — 상대방에게 응답 알림 (best-effort)
    const counterpartyId =
      actor === 'seller' ? meeting.buyerId : meeting.sellerId;
    await this.notification.notify(counterpartyId, {
      type: NotificationType.MEETING_RESPONDED,
      title: '미팅 요청 상태가 변경되었습니다.',
      body: '미팅 목록에서 최신 상태와 일정을 확인하세요.',
      linkUrl: `/meetings/${meetingId.toString()}`,
    });

    const fresh = await this.prisma.meetingRequest.findUnique({
      where: { id: meetingId },
      include: { slots: { orderBy: { proposedAt: 'asc' } } },
    });
    return serializeMeeting(fresh);
  }

  /** selectedSlot ISO → 이 meeting 의 slot 중 동일 시각 찾기. 없으면 400. */
  private requireSelectedSlot(
    meeting: { slots: { id: bigint; proposedAt: Date }[] },
    iso: string | undefined,
  ) {
    if (!iso) {
      throw new BadRequestException('선택된 일시(selectedSlot)가 필요합니다.');
    }
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) {
      throw new BadRequestException(
        '선택된 일시(selectedSlot) 형식이 잘못되었습니다.',
      );
    }
    const slot = meeting.slots.find((s) => s.proposedAt.getTime() === t);
    if (!slot) {
      throw new BadRequestException(
        '선택된 일시가 이 미팅의 후보 일시에 없습니다.',
      );
    }
    return slot;
  }
}
