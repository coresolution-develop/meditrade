import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class ProductAdminService {
  constructor(private readonly prisma: PrismaService) {}

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
