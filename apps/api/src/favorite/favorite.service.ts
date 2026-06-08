import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** 카드 노출용 상품 정보 직렬화. (Favorite 엔티티는 Prisma 관계 미정의이므로 수동 join) */
function serializeProductCard(p: any) {
  return {
    id: p.id.toString(),
    sellerId: p.sellerId.toString(),
    categoryId: p.categoryId.toString(),
    name: p.name,
    modelName: p.modelName,
    conditionType: p.conditionType,
    price: p.price === null ? null : Number(p.price),
    priceNegotiable: p.priceNegotiable,
    region: p.region,
    status: p.status,
  };
}

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  /** 찜 추가. 동일 (buyer, product) 중복은 @@unique 로 409. */
  async create(buyerId: bigint, productId: bigint) {
    // 상품 존재 확인 — 없는 상품 찜 시 명확한 404
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('상품을 찾을 수 없습니다.');

    try {
      const favorite = await this.prisma.favorite.create({
        data: { buyerId, productId },
      });
      return {
        id: favorite.id.toString(),
        buyerId: favorite.buyerId.toString(),
        productId: favorite.productId.toString(),
        createdAt: favorite.createdAt,
      };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('이미 찜한 상품입니다.');
      }
      throw e;
    }
  }

  /** 찜 해제. 본인 + 해당 상품 조합이 없으면 404. */
  async remove(buyerId: bigint, productId: bigint) {
    const found = await this.prisma.favorite.findUnique({
      where: { buyerId_productId: { buyerId, productId } },
    });
    if (!found) throw new NotFoundException('찜한 내역이 없습니다.');

    await this.prisma.favorite.delete({
      where: { buyerId_productId: { buyerId, productId } },
    });
    return { productId: productId.toString() };
  }

  /** 본인 찜 목록 + 상품 카드 정보(수동 join). 최신순. */
  async findAll(buyerId: bigint) {
    const favorites = await this.prisma.favorite.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
    });
    if (favorites.length === 0) return { items: [], total: 0 };

    const productIds = favorites.map((f) => f.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const byId = new Map(products.map((p) => [p.id.toString(), p]));

    const items = favorites.map((f) => {
      const p = byId.get(f.productId.toString());
      return {
        id: f.id.toString(),
        productId: f.productId.toString(),
        createdAt: f.createdAt,
        product: p ? serializeProductCard(p) : null,
      };
    });
    return { items, total: items.length };
  }
}
