import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManufacturerDto, UpdateManufacturerDto } from './dto/admin.dto';

function serialize(m: any) {
  return {
    id: m.id.toString(),
    name: m.name,
    country: m.country,
    sortOrder: m.sortOrder,
  };
}

@Injectable()
export class ManufacturerAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.manufacturer.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { items: items.map(serialize), total: items.length };
  }

  async create(dto: CreateManufacturerDto) {
    const created = await this.prisma.manufacturer.create({
      data: {
        name: dto.name,
        country: dto.country,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return serialize(created);
  }

  async update(id: bigint, dto: UpdateManufacturerDto) {
    const found = await this.prisma.manufacturer.findUnique({
      where: { id },
    });
    if (!found) throw new NotFoundException('제조사를 찾을 수 없습니다.');

    const updated = await this.prisma.manufacturer.update({
      where: { id },
      data: {
        name: dto.name,
        country: dto.country,
        sortOrder: dto.sortOrder,
      },
    });
    return serialize(updated);
  }

  /**
   * 정책: 현재 Product 에 manufacturerId FK 가 없으므로 항상 삭제 허용.
   * (도메인에 제조사 연결 시 카테고리와 동일한 사용중 검사 추가 예정)
   */
  async remove(id: bigint) {
    const found = await this.prisma.manufacturer.findUnique({
      where: { id },
    });
    if (!found) throw new NotFoundException('제조사를 찾을 수 없습니다.');

    await this.prisma.manufacturer.delete({ where: { id } });
    return { id: id.toString() };
  }
}
