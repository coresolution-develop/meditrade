// apps/api/prisma/seed.ts
// 실행: npx prisma db seed   (사전: npm i -D ts-node, package.json 에 prisma.seed 설정)
// 멱등(idempotent): 카테고리가 이미 있으면 시드를 건너뛴다.
import { PrismaClient, Role, ConditionType, ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const CATEGORY_NAMES = [
  '영상진단기기',   // X-ray, 초음파, CT, MRI 등
  '치료기기',
  '검사·측정기기',
  '치과기기',
  '한방기기',
  '수술·마취기기',
  '재활·물리치료',
  '환자모니터링',
  '소모품·기타',
];

async function main() {
  const existing = await prisma.category.count();
  if (existing > 0) {
    console.log('ℹ️  Seed skipped: 카테고리가 이미 존재합니다.');
    return;
  }

  // 1) 카테고리 마스터
  const categories = await Promise.all(
    CATEGORY_NAMES.map((name, i) =>
      prisma.category.create({ data: { name, sortOrder: i + 1 } }),
    ),
  );
  console.log(`✅ 카테고리 ${categories.length}개 생성`);

  // 2) 테스트 회원 (로컬 개발 전용 계정 — 운영 배포 금지)
  const pw = await bcrypt.hash('test1234', 10);
  const seller = await prisma.member.create({
    data: {
      email: 'seller@test.com',
      password: pw,
      name: '테스트판매자',
      phone: '010-0000-0001',
      role: Role.SELLER,
      status: 'ACTIVE',
    },
  });
  const buyer = await prisma.member.create({
    data: {
      email: 'buyer@test.com',
      password: pw,
      name: '테스트구매자',
      phone: '010-0000-0002',
      role: Role.BUYER,
      status: 'ACTIVE',
    },
  });
  console.log('✅ 테스트 계정 생성 (seller@test.com / buyer@test.com, 비밀번호: test1234)');

  // 3) 샘플 상품
  await prisma.product.createMany({
    data: [
      {
        sellerId: seller.id,
        categoryId: categories[0].id, // 영상진단기기
        name: '중고 휴대용 초음파 진단기',
        modelName: 'US-200',
        conditionType: ConditionType.USED,
        price: 3500000n,
        priceNegotiable: true,
        stock: 1,
        region: '전북 전주',
        description: '2021년식, 사용기간 1년 미만. 프로브 2종 포함. 실물 확인 가능.',
        status: ProductStatus.ON_SALE,
      },
      {
        sellerId: seller.id,
        categoryId: categories[7].id, // 환자모니터링
        name: '환자 감시 모니터 (신품)',
        modelName: 'PM-900',
        conditionType: ConditionType.NEW,
        price: null, // 가격 문의
        priceNegotiable: false,
        stock: 5,
        region: '서울',
        description: '심전도/SpO2/NIBP 통합 모니터. 대량 구매 시 견적 문의.',
        status: ProductStatus.ON_SALE,
      },
      {
        sellerId: seller.id,
        categoryId: categories[3].id, // 치과기기
        name: '리퍼 치과용 유닛체어',
        modelName: 'DC-7',
        conditionType: ConditionType.REFURBISHED,
        price: 2800000n,
        priceNegotiable: true,
        stock: 2,
        region: '전북 군산',
        description: '정비 완료 리퍼 제품. 설치 상담 가능.',
        status: ProductStatus.ON_SALE,
      },
    ],
  });
  console.log('✅ 샘플 상품 3건 생성');
  console.log(`(참고) buyerId=${buyer.id} 로 문의/미팅 테스트 가능`);
}

main()
  .catch((e) => {
    console.error('❌ Seed 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
