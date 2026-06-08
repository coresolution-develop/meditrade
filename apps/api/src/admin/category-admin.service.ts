import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/admin.dto';

function serialize(c: any) {
  return {
    id: c.id.toString(),
    name: c.name,
    parentId: c.parentId === null ? null : c.parentId.toString(),
    sortOrder: c.sortOrder,
  };
}

@Injectable()
export class CategoryAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { items: items.map(serialize), total: items.length };
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parentId !== undefined) {
      const parent = await this.prisma.category.findUnique({
        where: { id: BigInt(dto.parentId) },
      });
      if (!parent)
        throw new NotFoundException('상위 카테고리를 찾을 수 없습니다.');
    }
    const created = await this.prisma.category.create({
      data: {
        name: dto.name,
        parentId: dto.parentId !== undefined ? BigInt(dto.parentId) : null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return serialize(created);
  }

  async update(id: bigint, dto: UpdateCategoryDto) {
    const found = await this.prisma.category.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('카테고리를 찾을 수 없습니다.');

    if (dto.parentId !== undefined) {
      if (BigInt(dto.parentId) === id) {
        throw new ConflictException('자기 자신을 상위로 지정할 수 없습니다.');
      }
      const parent = await this.prisma.category.findUnique({
        where: { id: BigInt(dto.parentId) },
      });
      if (!parent)
        throw new NotFoundException('상위 카테고리를 찾을 수 없습니다.');
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        parentId: dto.parentId === undefined ? undefined : BigInt(dto.parentId),
        sortOrder: dto.sortOrder,
      },
    });
    return serialize(updated);
  }

  /**
   * 정책: 사용 중인 카테고리(상품이 참조) 삭제 → 409 CONFLICT.
   * 하위 카테고리가 있어도 409 (참조 무결성 보호).
   */
  async remove(id: bigint) {
    const found = await this.prisma.category.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('카테고리를 찾을 수 없습니다.');

    const [productCount, childCount] = await Promise.all([
      this.prisma.product.count({ where: { categoryId: id } }),
      this.prisma.category.count({ where: { parentId: id } }),
    ]);
    if (productCount > 0) {
      throw new ConflictException(
        '해당 카테고리를 사용 중인 상품이 있어 삭제할 수 없습니다.',
      );
    }
    if (childCount > 0) {
      throw new ConflictException('하위 카테고리가 있어 삭제할 수 없습니다.');
    }

    await this.prisma.category.delete({ where: { id } });
    return { id: id.toString() };
  }
}
