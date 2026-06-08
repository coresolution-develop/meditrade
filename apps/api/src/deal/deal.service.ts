import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DealStatus, InquiryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.types';
import { CreateDealDto, DealRole, UpdateDealStatusDto } from './dto/deal.dto';

function serializeDeal(d: any) {
  return {
    id: d.id.toString(),
    inquiryId: d.inquiryId === null ? null : d.inquiryId.toString(),
    productId: d.productId.toString(),
    buyerId: d.buyerId.toString(),
    sellerId: d.sellerId.toString(),
    finalPrice: Number(d.finalPrice),
    status: d.status,
    createdAt: d.createdAt,
    completedAt: d.completedAt,
  };
}

function illegalState(message: string) {
  return new ConflictException({ code: 'ILLEGAL_STATE', message });
}

// 거래 상태머신 — 행위자 구분 없이 양측(buyer/seller) 모두 수행 가능
const TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  REQUESTED: [DealStatus.IN_PROGRESS, DealStatus.CANCELED],
  IN_PROGRESS: [DealStatus.COMPLETED, DealStatus.CANCELED],
  COMPLETED: [],
  CANCELED: [],
};

@Injectable()
export class DealService {
  private readonly logger = new Logger(DealService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
  ) {}

  /**
   * BUYER: 견적 수락으로 거래 생성.
   * - 문의는 본인(buyerId) 소속이어야 하고 QUOTED 여야 한다.
   * - finalPrice = quote.quotePrice (quoteId 미지정 시 최신 견적).
   * - 동일 문의에 이미 활성 거래가 있으면 409.
   */
  async create(buyerId: bigint, dto: CreateDealDto) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id: BigInt(dto.inquiryId) },
      include: { quotes: { orderBy: { createdAt: 'desc' } } },
    });
    if (!inquiry) throw new NotFoundException('문의를 찾을 수 없습니다.');

    if (inquiry.buyerId !== buyerId) {
      throw new ForbiddenException(
        '본인 문의에서만 거래를 생성할 수 있습니다.',
      );
    }

    if (inquiry.status !== InquiryStatus.QUOTED) {
      this.logger.warn(
        `deal create blocked: inquiry ${inquiry.id} not QUOTED (buyer=${buyerId})`,
      );
      throw illegalState('견적이 발송된 문의에서만 거래를 만들 수 있습니다.');
    }

    let quote = inquiry.quotes[0];
    if (dto.quoteId !== undefined) {
      const target = inquiry.quotes.find((q) => q.id === BigInt(dto.quoteId!));
      if (!target) {
        throw new NotFoundException('해당 견적을 찾을 수 없습니다.');
      }
      quote = target;
    }
    if (!quote) throw new NotFoundException('견적을 찾을 수 없습니다.');

    // 동일 문의에 활성/완료 거래가 이미 있으면 거부
    const existing = await this.prisma.deal.findFirst({
      where: { inquiryId: inquiry.id },
    });
    if (existing) {
      throw new ConflictException('이미 해당 문의에 거래가 존재합니다.');
    }

    const deal = await this.prisma.deal.create({
      data: {
        inquiryId: inquiry.id,
        productId: inquiry.productId,
        buyerId: inquiry.buyerId,
        sellerId: inquiry.sellerId,
        finalPrice: quote.quotePrice,
        // status default = REQUESTED
      },
    });

    // NOTI-003 — 양측에 거래 시작 알림 (best-effort)
    const dealLink = `/deals/${deal.id.toString()}`;
    await Promise.all([
      this.notification.notify(deal.buyerId, {
        type: NotificationType.DEAL_STATUS_CHANGED,
        title: '거래가 시작되었습니다.',
        body: '거래 내역에서 진행 상태를 확인하세요.',
        linkUrl: dealLink,
      }),
      this.notification.notify(deal.sellerId, {
        type: NotificationType.DEAL_STATUS_CHANGED,
        title: '새 거래가 시작되었습니다.',
        body: '거래 관리에서 진행 상태를 확인하세요.',
        linkUrl: dealLink,
      }),
    ]);
    return serializeDeal(deal);
  }

  async findMine(memberId: bigint, role: DealRole) {
    const where =
      role === 'buyer' ? { buyerId: memberId } : { sellerId: memberId };
    const items = await this.prisma.deal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return { items: items.map(serializeDeal), total: items.length };
  }

  /**
   * 상태 변경 (양측). 상태머신 강제.
   * COMPLETED 진입 시 completedAt 기록.
   */
  async updateStatus(
    memberId: bigint,
    dealId: bigint,
    dto: UpdateDealStatusDto,
  ) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('거래를 찾을 수 없습니다.');

    if (deal.buyerId !== memberId && deal.sellerId !== memberId) {
      throw new ForbiddenException('본인 거래만 변경할 수 있습니다.');
    }

    const allowed = TRANSITIONS[deal.status];
    if (!allowed.includes(dto.status)) {
      this.logger.warn(
        `deal ${dealId} transition blocked: ${deal.status} → ${dto.status} (member=${memberId})`,
      );
      throw illegalState('해당 상태로 전이할 수 없습니다.');
    }

    const data: { status: DealStatus; completedAt?: Date } = {
      status: dto.status,
    };
    if (dto.status === DealStatus.COMPLETED) {
      data.completedAt = new Date();
    }

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data,
    });

    // NOTI-003 — 상대방에게 상태 변경 알림 (본인 제외, best-effort)
    const counterpartyId =
      memberId === deal.buyerId ? deal.sellerId : deal.buyerId;
    await this.notification.notify(counterpartyId, {
      type: NotificationType.DEAL_STATUS_CHANGED,
      title: '거래 상태가 변경되었습니다.',
      body: '거래 내역에서 최신 상태를 확인하세요.',
      linkUrl: `/deals/${dealId.toString()}`,
    });
    return serializeDeal(updated);
  }
}
