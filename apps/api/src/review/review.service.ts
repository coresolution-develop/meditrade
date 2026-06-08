import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DealStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/review.dto';

function serializeReview(r: any) {
  return {
    id: r.id.toString(),
    dealId: r.dealId.toString(),
    buyerId: r.buyerId.toString(),
    sellerId: r.sellerId.toString(),
    rating: r.rating,
    content: r.content,
    createdAt: r.createdAt,
  };
}

function illegalState(message: string) {
  return new ConflictException({ code: 'ILLEGAL_STATE', message });
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * BUYER: COMPLETED 거래에만 작성. 거래당 1회.
   * sellerId 는 거래에서 도출.
   */
  async create(buyerId: bigint, dto: CreateReviewDto) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: BigInt(dto.dealId) },
    });
    if (!deal) throw new NotFoundException('거래를 찾을 수 없습니다.');

    if (deal.buyerId !== buyerId) {
      throw new ForbiddenException('본인 거래에만 리뷰를 작성할 수 있습니다.');
    }

    if (deal.status !== DealStatus.COMPLETED) {
      this.logger.warn(
        `review blocked: deal ${deal.id} not COMPLETED (buyer=${buyerId})`,
      );
      throw illegalState('완료된 거래에만 리뷰를 작성할 수 있습니다.');
    }

    const exists = await this.prisma.review.findFirst({
      where: { dealId: deal.id },
    });
    if (exists) {
      throw new ConflictException('이미 해당 거래에 리뷰가 작성되어 있습니다.');
    }

    const review = await this.prisma.review.create({
      data: {
        dealId: deal.id,
        buyerId: deal.buyerId,
        sellerId: deal.sellerId,
        rating: dto.rating,
        content: dto.content,
      },
    });
    return serializeReview(review);
  }

  /** 판매자별 리뷰 목록 + 평균 평점. 공개. */
  async findForSeller(sellerId: bigint) {
    const seller = await this.prisma.member.findUnique({
      where: { id: sellerId },
    });
    if (!seller) throw new NotFoundException('판매자를 찾을 수 없습니다.');

    const [items, agg] = await Promise.all([
      this.prisma.review.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.aggregate({
        where: { sellerId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    return {
      sellerId: sellerId.toString(),
      total: agg._count._all,
      averageRating:
        agg._avg.rating === null
          ? null
          : Math.round(agg._avg.rating * 100) / 100,
      items: items.map(serializeReview),
    };
  }
}
