# PHASE 2 작업지시서 — 백엔드 확장 (사업자인증·찜·문의·견적·미팅·거래·리뷰·알림·관리자)

> Claude Code 실행용. **규칙은 `CLAUDE.md`, 계약은 `api-spec.md`·`functional-spec.md`, 데이터 설계는 `medical-device-platform.md`를 참조한다.**
> P2는 범위가 크다. **아래 묶음(A~G) 단위로 끊어서 진행**하고, 각 묶음마다 `npm run build` + 동작 검증을 통과한 뒤 다음으로 넘어간다. **한 번에 전부 시키지 말 것.**

---

## 목표

P1(인증·상품) 위에 거래 흐름 전체를 올린다: 사업자 인증, 찜, 문의·견적, **미팅 요청**, 거래, 리뷰, 알림, 관리자. 확장성 기반(Redis·refresh 토큰)도 함께 도입한다.

## 사전 조건
- **P1 완료**: `auth`·`product` 모듈, 공통(`ApiResponse` 인터셉터·전역 예외필터·`JwtAuthGuard`·`RolesGuard`), `PrismaService`, 시드가 동작.
- 모든 P2 구현은 **P1 패턴을 그대로 따른다**: 모듈은 `controller/service/dto`, 응답은 공통 포맷, 권한은 가드, BigInt는 `serialize()`로 문자열화, 입력 검증은 `class-validator`.

## 공통 구현 규칙
- 엔드포인트·요청/응답은 `api-spec.md` 계약을 따른다(임의 필드·경로 변경 금지).
- 상태 전이는 본 문서의 "상태 전이 규칙"을 강제한다(허용되지 않은 전이는 409 `ILLEGAL_STATE` 또는 400).
- 권한: 소유자 검증 필수(본인 문의/미팅/거래만 조작). 위반 시 403 `FORBIDDEN`.
- 알림은 도메인 이벤트 발생 시 생성(동기 INSERT로 시작, 추후 큐로 분리).

---

## 진행 묶음 (각각 한 세션 권장)

| 묶음 | 내용 | 의존 |
| --- | --- | --- |
| A | 인프라(Redis·refresh) + Prisma 스키마 확장·마이그레이션 | P1 |
| B | 사업자 인증(business-info) + 찜(favorites) | A |
| C | 문의·견적(inquiry/quote) | A |
| D | 미팅 요청(meetings) | A |
| E | 거래(deals) + 리뷰(reviews) | C |
| F | 알림(notifications) | B~E |
| G | 관리자(admin) | B |

---

## Step A — 인프라 + 스키마 확장

### A-1. (확장성) Redis + refresh 토큰
- `@nestjs/config` 환경에 `REDIS_URL` 추가, `docker-compose.yml`에 redis 서비스 추가(`redis:7-alpine`).
- refresh 토큰 발급/저장(Redis), `POST /auth/refresh`(AUTH-003), `POST /auth/logout`(AUTH-004, 블랙리스트).
- **검증**: 로그인 → refresh로 액세스 재발급 → 로그아웃 후 재사용 차단.

### A-2. Prisma 스키마 확장 & 마이그레이션
- 아래 모델/enum을 `schema.prisma`에 추가하고 `npx prisma migrate dev --name p2` → `generate`.
- `medical-device-platform.md`의 테이블 설계와 일치시킨다.

```prisma
enum VerifyStatus { PENDING APPROVED REJECTED }
enum InquiryStatus { OPEN QUOTED CLOSED }
enum MeetingType { ONLINE VISIT_SELLER VISIT_BUYER }
enum MeetingStatus { REQUESTED ACCEPTED REJECTED RESCHEDULE_PROPOSED CONFIRMED COMPLETED CANCELED }
enum DealStatus { REQUESTED IN_PROGRESS COMPLETED CANCELED }
enum SlotProposer { BUYER SELLER }

model BusinessInfo {
  id                   BigInt       @id @default(autoincrement())
  memberId             BigInt       @unique @map("member_id")
  companyName          String       @map("company_name") @db.VarChar(100)
  bizRegNo             String       @map("biz_reg_no") @db.VarChar(20)
  deviceSalesLicenseNo String?      @map("device_sales_license_no") @db.VarChar(50)
  verifyStatus         VerifyStatus @default(PENDING) @map("verify_status")
  createdAt            DateTime     @default(now()) @map("created_at")
  member               Member       @relation(fields: [memberId], references: [id])
  @@map("business_info")
}

model Favorite {
  id        BigInt   @id @default(autoincrement())
  buyerId   BigInt   @map("buyer_id")
  productId BigInt   @map("product_id")
  createdAt DateTime @default(now()) @map("created_at")
  @@unique([buyerId, productId])
  @@map("favorite")
}

model Inquiry {
  id        BigInt        @id @default(autoincrement())
  productId BigInt        @map("product_id")
  buyerId   BigInt        @map("buyer_id")
  sellerId  BigInt        @map("seller_id")
  message   String?
  status    InquiryStatus @default(OPEN)
  createdAt DateTime      @default(now()) @map("created_at")
  quotes    Quote[]
  @@index([sellerId])
  @@index([buyerId])
  @@map("inquiry")
}

model Quote {
  id         BigInt   @id @default(autoincrement())
  inquiryId  BigInt   @map("inquiry_id")
  quotePrice BigInt   @map("quote_price")
  validUntil DateTime @map("valid_until") @db.Date
  memo       String?
  createdAt  DateTime @default(now()) @map("created_at")
  inquiry    Inquiry  @relation(fields: [inquiryId], references: [id])
  @@map("quote")
}

model MeetingRequest {
  id          BigInt        @id @default(autoincrement())
  buyerId     BigInt        @map("buyer_id")
  sellerId    BigInt        @map("seller_id")
  productId   BigInt?       @map("product_id")
  meetingType MeetingType   @map("meeting_type")
  purpose     String        @db.VarChar(100)
  message     String?
  location    String?       @db.VarChar(200)
  confirmedAt DateTime?     @map("confirmed_at")
  status      MeetingStatus @default(REQUESTED)
  createdAt   DateTime      @default(now()) @map("created_at")
  slots       MeetingSlot[]
  @@index([sellerId])
  @@index([buyerId])
  @@map("meeting_request")
}

model MeetingSlot {
  id         BigInt         @id @default(autoincrement())
  meetingId  BigInt         @map("meeting_id")
  proposedAt DateTime       @map("proposed_at")
  proposedBy SlotProposer   @map("proposed_by")
  isSelected Boolean        @default(false) @map("is_selected")
  meeting    MeetingRequest @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  @@map("meeting_slot")
}

model Deal {
  id          BigInt     @id @default(autoincrement())
  inquiryId   BigInt?    @map("inquiry_id")
  productId   BigInt     @map("product_id")
  buyerId     BigInt     @map("buyer_id")
  sellerId    BigInt     @map("seller_id")
  finalPrice  BigInt     @map("final_price")
  status      DealStatus @default(REQUESTED)
  createdAt   DateTime   @default(now()) @map("created_at")
  completedAt DateTime?  @map("completed_at")
  reviews     Review[]
  @@map("deal")
}

model Review {
  id        BigInt   @id @default(autoincrement())
  dealId    BigInt   @map("deal_id")
  buyerId   BigInt   @map("buyer_id")
  sellerId  BigInt   @map("seller_id")
  rating    Int      @db.SmallInt
  content   String?
  createdAt DateTime @default(now()) @map("created_at")
  deal      Deal     @relation(fields: [dealId], references: [id])
  @@map("review")
}

model Notification {
  id        BigInt   @id @default(autoincrement())
  memberId  BigInt   @map("member_id")
  type      String   @db.VarChar(40)
  title     String   @db.VarChar(200)
  body      String?
  linkUrl   String?  @map("link_url") @db.VarChar(500)
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at")
  @@index([memberId, isRead])
  @@map("notification")
}
```
- **검증**: 마이그레이션 성공, `prisma generate` 후 `npm run build` 통과.

---

## Step B — 사업자 인증 + 찜

### B-1. business-info (MBR-002/003)
- `POST /business-info`(SELLER): 상호·사업자번호·판매업신고번호 제출 → verifyStatus=PENDING.
- `GET /business-info/me`: 본인 인증 상태 조회.
- **정책**: SELLER가 상품 등록 시 `verifyStatus=APPROVED` 요구할지 결정(미승인 시 등록 차단 옵션). 우선 경고만, 차단은 옵션 플래그로.
- **검증**: 등록 → PENDING 조회, 관리자 승인 후 APPROVED 반영(Step G 연계).

### B-2. favorites (FAV-001/002)
- `POST /favorites`(BUYER, body: productId), `DELETE /favorites/{productId}`(BUYER), `GET /favorites`(BUYER).
- 중복 찜 방지(@@unique). 상품 조인하여 카드 정보 반환.
- **검증**: 찜 추가/중복방지/해제/목록.

---

## Step C — 문의 · 견적

### C-1. inquiry (INQ-001/002/004/005)
- `POST /inquiries`(BUYER, body: productId, message): 상품에서 sellerId 도출 → status=OPEN → 판매자 알림.
- `GET /inquiries?role=seller|buyer`: 본인 문의 목록.
- `PATCH /inquiries/{id}/close`: OPEN/QUOTED → CLOSED(양측).

### C-2. quote (INQ-003)
- `POST /inquiries/{id}/quotes`(SELLER): quotePrice·validUntil·memo → inquiry.status=QUOTED → 구매자 알림.
- **검증**: 문의 생성(OPEN) → 견적 발송(QUOTED) → 종료(CLOSED). 타인 문의 접근 403.

---

## Step D — 미팅 요청 (MEET-001~006)

- `POST /meetings`(BUYER): body는 `api-spec.md` 참조(sellerId, productId?, meetingType, purpose, preferredSlots[1~3], location?, message?).
  - 처리: 판매자 존재 확인 → meeting(REQUESTED) + slots(proposedBy=BUYER) 생성 → 판매자 알림.
- `GET /meetings?role=seller|buyer`: 본인 미팅 목록(+slots).
- `PATCH /meetings/{id}`: 상태 변경(아래 상태머신 강제).
  - 판매자: `ACCEPTED`(+selectedSlot=해당 slot.isSelected=true) / `REJECTED` / `RESCHEDULE_PROPOSED`(+새 slot proposedBy=SELLER).
  - 양측: `CONFIRMED`(confirmedAt 기록) / `CANCELED` / `COMPLETED`.
- **검증**: 요청→수락(택일)→확정→완료, 재제안 경로, 거절/취소. 잘못된 전이는 409 `ILLEGAL_STATE`.

---

## Step E — 거래 + 리뷰

### E-1. deals (DEAL-001/002/003)
- `POST /deals`(BUYER): 견적 수락으로 생성(inquiryId, productId, finalPrice=quotePrice) → status=REQUESTED → 양측 알림.
- `PATCH /deals/{id}/status`: REQUESTED→IN_PROGRESS→COMPLETED / →CANCELED(상태머신).
- `GET /deals?role=seller|buyer`: 본인 거래 목록/상세.

### E-2. reviews (REV-001/002)
- `POST /reviews`(BUYER): **COMPLETED 거래에만** 작성 가능, rating 1~5, 거래당 1회.
- `GET /sellers/{id}/reviews` 또는 상품/판매자 조회 시 평균 평점 노출.
- **검증**: 완료 거래만 리뷰 허용(미완료 409), 중복 방지, 평점 평균 계산.

---

## Step F — 알림 (NOTI-001~004)
- 도메인 이벤트에서 `Notification` 생성: 문의 도착(SELLER), 견적 발송(BUYER), 거래 상태(양측), 미팅 요청/응답(양측).
- `GET /notifications`(인증): 본인 알림 목록(미읽음 우선), `PATCH /notifications/{id}/read`.
- **검증**: 각 이벤트 발생 시 알림 생성, 읽음 처리.

---

## Step G — 관리자 (ADM-001~004)
- ADMIN 전용 가드. `@Roles('ADMIN')`.
- `PATCH /admin/business-info/{id}`(승인/반려) → 해당 SELLER verifyStatus 갱신 + 알림.
- `PATCH /admin/products/{id}/status`(게시 승인/HIDDEN).
- `GET/POST/PUT/DELETE /admin/categories`, `/admin/manufacturers`(마스터 관리).
- `PATCH /admin/members/{id}/status`(정지/해제).
- **검증**: 비ADMIN 접근 403, 승인 시 판매자 상태 반영.

---

## 상태 전이 규칙 (강제)

### 문의 (Inquiry.status)
`OPEN → QUOTED → CLOSED` / `OPEN → CLOSED`
(이미 CLOSED 인 문의에 견적 발송 시 409)

### 미팅 (MeetingRequest.status)
```
REQUESTED → ACCEPTED → CONFIRMED → COMPLETED
REQUESTED → REJECTED
REQUESTED → RESCHEDULE_PROPOSED → (ACCEPTED|CONFIRMED|CANCELED)
(ACCEPTED|RESCHEDULE_PROPOSED|CONFIRMED) → CANCELED
```
- `CONFIRMED` 시 selectedSlot 1개 isSelected=true, confirmedAt 기록.

### 거래 (Deal.status)
`REQUESTED → IN_PROGRESS → COMPLETED` / `(REQUESTED|IN_PROGRESS) → CANCELED`
- COMPLETED 시 completedAt 기록, 이후 리뷰 작성 가능.

> 허용되지 않은 전이는 409 `ILLEGAL_STATE`로 거부하고, 현재 상태를 메시지에 포함하지 않는다(로그에만 기록).

---

## 완료 기준 (Definition of Done) — P2 전체
1. 모든 묶음에서 `npm run build`/`npm run lint` 통과.
2. business-info 등록·관리자 승인 흐름 동작.
3. 찜 추가/해제/목록 동작(중복 방지).
4. 문의→견적→종료 흐름, 권한·상태전이 검증.
5. 미팅 요청→수락(택일)→확정→완료 + 재제안/거절/취소 동작.
6. 거래 생성→진행→완료, 완료 거래에만 리뷰 작성.
7. 각 이벤트에 알림 생성·읽음 처리.
8. 관리자 화면 권한(비ADMIN 403)·심사 동작.
9. (확장) refresh/logout, Redis 세션 동작.
10. 모든 응답이 공통 포맷, 상태전이 위반은 409 처리.

## 진행 원칙
- 묶음(Step) 단위로 끊어 진행, 각 묶음 후 빌드+동작 검증.
- `api-spec.md` 계약·본 문서 상태머신을 임의 변경하지 않는다(불일치 시 멈추고 보고).
- 소유자/권한 검증을 모든 변경 API에 적용.
- P1 패턴(공통 응답·예외·가드·serialize) 재사용, 중복 코드 최소화.
