import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

function serialize(p: any) {
  return {
    ...p,
    id: p.id.toString(),
    sellerId: p.sellerId.toString(),
    categoryId: p.categoryId.toString(),
    price: p.price === null ? null : Number(p.price),
    ...(p.category && {
      category: { ...p.category, id: p.category.id.toString() },
    }),
    ...(p.images && {
      images: p.images.map((img: any) => ({
        ...img,
        id: img.id.toString(),
        productId: img.productId.toString(),
      })),
    }),
  };
}

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, size = 20) {
    const skip = (page - 1) * size;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'ON_SALE' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.product.count({ where: { status: 'ON_SALE' } }),
    ]);
    return { items: items.map(serialize), total, page, size };
  }

  /**
   * 판매자 본인 상품 목록. status 필터 없이(DRAFT/HIDDEN 포함) 전체 최신순.
   * 컨트롤러에서 SELLER 가드 + 토큰의 sellerId 로 호출된다.
   */
  async findMine(sellerId: bigint, page = 1, size = 20) {
    const skip = (page - 1) * size;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.product.count({ where: { sellerId } }),
    ]);
    return { items: items.map(serialize), total, page, size };
  }

  async findOne(id: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true, category: true },
    });
    if (!product) throw new NotFoundException('상품을 찾을 수 없습니다.');
    return serialize(product);
  }

  async create(sellerId: bigint, dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        sellerId,
        categoryId: BigInt(dto.categoryId),
        name: dto.name,
        modelName: dto.modelName,
        conditionType: dto.conditionType,
        price: dto.price != null ? BigInt(dto.price) : null,
        region: dto.region,
        description: dto.description,
        status: 'ON_SALE',
      },
    });
    return serialize(product);
  }

  async update(sellerId: bigint, id: bigint, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('상품을 찾을 수 없습니다.');
    if (product.sellerId !== sellerId)
      throw new ForbiddenException('본인 상품만 수정할 수 있습니다.');

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        price: dto.price != null ? BigInt(dto.price) : undefined,
      },
    });
    return serialize(updated);
  }

  async remove(sellerId: bigint, id: bigint) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('상품을 찾을 수 없습니다.');
    if (product.sellerId !== sellerId)
      throw new ForbiddenException('본인 상품만 삭제할 수 있습니다.');

    await this.prisma.product.delete({ where: { id } });
    return { id: id.toString() };
  }
}
