import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProductStatusDto } from './dto/admin.dto';

function serialize(p: any) {
  return {
    id: p.id.toString(),
    sellerId: p.sellerId.toString(),
    categoryId: p.categoryId.toString(),
    name: p.name,
    status: p.status,
    price: p.price === null ? null : Number(p.price),
  };
}

// 검수 목록용 — 카드 식별에 필요한 필드 추가(모델명/상태/등록일).
function serializeListItem(p: any) {
  return {
    ...serialize(p),
    modelName: p.modelName,
    conditionType: p.conditionType,
    createdAt: p.createdAt,
  };
}

function parseProductStatus(status?: string): ProductStatus | undefined {
  if (status === undefined || status === '') return undefined;
  if (!Object.values(ProductStatus).includes(status as ProductStatus)) {
    throw new BadRequestException('유효하지 않은 status 값입니다.');
  }
  return status as ProductStatus;
}

@Injectable()
export class ProductAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 상품 검수 목록. status 미지정 시 전체(DRAFT/PENDING/ON_SALE/SOLD_OUT/HIDDEN).
   * 최신순 페이징.
   */
  async findAll(status?: string, page = 1, size = 20) {
    const productStatus = parseProductStatus(status);
    const where = productStatus ? { status: productStatus } : {};
    const skip = (page - 1) * size;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: items.map(serializeListItem), total, page, size };
  }

  /** 관리자 검수: 어떤 상태로든 변경 가능(PENDING/ON_SALE/HIDDEN 등). */
  async updateStatus(id: bigint, dto: UpdateProductStatusDto) {
    const found = await this.prisma.product.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('상품을 찾을 수 없습니다.');

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: dto.status },
    });
    return serialize(updated);
  }
}
