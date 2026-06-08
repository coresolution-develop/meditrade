import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessInfoDto } from './dto/business-info.dto';

function serialize(b: any) {
  return {
    ...b,
    id: b.id.toString(),
    memberId: b.memberId.toString(),
  };
}

@Injectable()
export class BusinessInfoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * SELLER 본인 사업자 정보 등록.
   * memberId 가 @unique 이므로 1인 1건. 이미 있으면 409.
   * (재심사는 관리자(Step G) 또는 갱신 API 에서 처리)
   */
  async create(memberId: bigint, dto: CreateBusinessInfoDto) {
    const exists = await this.prisma.businessInfo.findUnique({
      where: { memberId },
    });
    if (exists) {
      throw new ConflictException('이미 사업자 정보가 등록되어 있습니다.');
    }

    const created = await this.prisma.businessInfo.create({
      data: {
        memberId,
        companyName: dto.companyName,
        bizRegNo: dto.bizRegNo,
        deviceSalesLicenseNo: dto.deviceSalesLicenseNo,
        // verifyStatus 는 schema 의 default(PENDING) 사용
      },
    });

    return serialize(created);
  }

  async findMine(memberId: bigint) {
    const found = await this.prisma.businessInfo.findUnique({
      where: { memberId },
    });
    if (!found) throw new NotFoundException('사업자 정보가 없습니다.');
    return serialize(found);
  }
}
