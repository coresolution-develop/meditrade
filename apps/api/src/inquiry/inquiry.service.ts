import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InquiryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.types';
import {
  CreateInquiryDto,
  CreateQuoteDto,
  InquiryRole,
} from './dto/inquiry.dto';

function serializeInquiry(i: any) {
  return {
    id: i.id.toString(),
    productId: i.productId.toString(),
    buyerId: i.buyerId.toString(),
    sellerId: i.sellerId.toString(),
    message: i.message,
    status: i.status,
    createdAt: i.createdAt,
    ...(i.quotes !== undefined && {
      quotes: i.quotes.map(serializeQuote),
    }),
  };
}

function serializeQuote(q: any) {
  return {
    id: q.id.toString(),
    inquiryId: q.inquiryId.toString(),
    quotePrice: Number(q.quotePrice),
    validUntil: q.validUntil,
    memo: q.memo,
    createdAt: q.createdAt,
  };
}

/**
 * 도메인 코드 `ILLEGAL_STATE` 를 명시적으로 응답에 담기 위한 예외.
 * 409 로 매핑되며 현재 상태값은 응답에 노출하지 않는다(로그에만).
 */
function illegalState(message: string) {
  return new ConflictException({ code: 'ILLEGAL_STATE', message });
}

@Injectable()
export class InquiryService {
  private readonly logger = new Logger(InquiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
  ) {}

  /** BUYER: 상품에 문의 발송. sellerId 는 상품에서 도출. */
  async create(buyerId: bigint, dto: CreateInquiryDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(dto.productId) },
    });
    if (!product) throw new NotFoundException('상품을 찾을 수 없습니다.');

    const inquiry = await this.prisma.inquiry.create({
      data: {
        productId: product.id,
        sellerId: product.sellerId,
        buyerId,
        message: dto.message,
        // status default = OPEN
      },
    });

    // NOTI-001 — 판매자에게 문의 도착 알림 (best-effort)
    await this.notification.notify(product.sellerId, {
      type: NotificationType.INQUIRY_RECEIVED,
      title: '새 문의가 도착했습니다.',
      body: '받은 문의 목록에서 내용을 확인하세요.',
      linkUrl: `/seller/inquiries/${inquiry.id.toString()}`,
    });
    return serializeInquiry(inquiry);
  }

  /** 본인 문의 목록(역할 기준). 견적까지 포함. 최신순. */
  async findMine(memberId: bigint, role: InquiryRole) {
    const where =
      role === 'buyer' ? { buyerId: memberId } : { sellerId: memberId };
    const items = await this.prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { quotes: { orderBy: { createdAt: 'desc' } } },
    });
    return { items: items.map(serializeInquiry), total: items.length };
  }

  /** OPEN/QUOTED → CLOSED. 양측(buyer or seller) 가능. 소유자만. */
  async close(memberId: bigint, inquiryId: bigint) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });
    if (!inquiry) throw new NotFoundException('문의를 찾을 수 없습니다.');

    if (inquiry.buyerId !== memberId && inquiry.sellerId !== memberId) {
      throw new ForbiddenException('본인 문의만 종료할 수 있습니다.');
    }

    if (inquiry.status === InquiryStatus.CLOSED) {
      this.logger.warn(
        `inquiry ${inquiryId} close blocked: already CLOSED (member=${memberId})`,
      );
      throw illegalState('이미 종료된 문의입니다.');
    }
    // 현재 enum 은 OPEN | QUOTED | CLOSED. CLOSED 를 위에서 걸렀으므로
    // 이 시점에서 남는 상태는 OPEN | QUOTED 뿐이며 모두 CLOSED 로 전이 허용.

    const updated = await this.prisma.inquiry.update({
      where: { id: inquiryId },
      data: { status: InquiryStatus.CLOSED },
    });
    return serializeInquiry(updated);
  }

  /** SELLER: 견적 발송. 해당 문의의 sellerId 본인만. CLOSED 에는 발송 금지. */
  async createQuote(memberId: bigint, inquiryId: bigint, dto: CreateQuoteDto) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });
    if (!inquiry) throw new NotFoundException('문의를 찾을 수 없습니다.');

    if (inquiry.sellerId !== memberId) {
      throw new ForbiddenException(
        '해당 문의의 판매자만 견적을 발송할 수 있습니다.',
      );
    }

    if (inquiry.status === InquiryStatus.CLOSED) {
      this.logger.warn(
        `quote blocked: inquiry ${inquiryId} is CLOSED (seller=${memberId})`,
      );
      throw illegalState('종료된 문의에는 견적을 발송할 수 없습니다.');
    }
    // OPEN → QUOTED 또는 QUOTED 재발송 허용 (status 는 QUOTED 유지/전이)

    const validUntil = new Date(dto.validUntil);

    const [quote] = await this.prisma.$transaction([
      this.prisma.quote.create({
        data: {
          inquiryId,
          quotePrice: BigInt(dto.quotePrice),
          validUntil,
          memo: dto.memo,
        },
      }),
      this.prisma.inquiry.update({
        where: { id: inquiryId },
        data: { status: InquiryStatus.QUOTED },
      }),
    ]);

    // NOTI-002 — 구매자에게 견적 발송 알림 (best-effort)
    await this.notification.notify(inquiry.buyerId, {
      type: NotificationType.QUOTE_RECEIVED,
      title: '견적이 도착했습니다.',
      body: '내 문의/견적 목록에서 견적을 확인하세요.',
      linkUrl: `/buyer/inquiries/${inquiry.id.toString()}`,
    });
    return serializeQuote(quote);
  }
}
