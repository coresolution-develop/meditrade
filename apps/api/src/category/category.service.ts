import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function serialize(c: any) {
  return {
    id: c.id.toString(),
    name: c.name,
    parentId: c.parentId === null ? null : c.parentId.toString(),
    sortOrder: c.sortOrder,
  };
}

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** 공개 카테고리 목록 — 상품 등록 폼 등에서 사용. sortOrder ASC, id ASC. */
  async findAll() {
    const items = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { items: items.map(serialize), total: items.length };
  }
}
