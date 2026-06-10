# WEB PHASE 2 작업지시서 — 웹(Next.js) 확장 (찜·문의·견적·미팅·거래·리뷰·알림·관리자)

> Claude Code 실행용. **규칙은 `apps/web/CLAUDE.md`, 화면은 `screen-spec.md`, API 계약은 `api-spec.md`를 참조한다.**
> 백엔드 P2가 이미 완료되어 있고(`apps/api`), 본 문서는 그 기능들을 **웹 화면으로 노출**한다.
> P2는 범위가 크다. **아래 묶음(W-0 ~ W-F) 단위로 끊어서 진행**하고, 각 묶음마다 `npm run build` + `npm run lint`를 통과한 뒤 다음으로 넘어간다. **한 번에 전부 시키지 말 것.**

---

## 목표

웹 P1(인증·상품) 위에 백엔드 P2 거래 흐름 전체의 화면을 올린다:
찜, 사업자 인증, 문의·견적, 미팅 요청, 거래, 리뷰, 알림, 관리자.

## 사전 조건

- **웹 P1 완료**: 로그인/회원가입, 상품 목록·상세, 판매자 상품 CRUD, 마이페이지, 프록시 인증.
- **백엔드 P2 가동**: `http://localhost:3001/api/v1`에서 favorites/business-info/inquiries/meetings/deals/reviews/notifications/admin 동작.
- 테스트 계정(시드): `seller@test.com` / `buyer@test.com` / (ADMIN 시드 계정) — 비밀번호 `test1234`.

## 공통 구현 규칙 (P1 패턴 그대로)

- **API 클라이언트 단일화**: 모든 호출은 `lib/api.ts`의 `api.*` 래퍼 → 프록시(`/api/proxy/*`) 경유. 토큰은 httpOnly 쿠키에서 프록시가 부착(클라이언트는 토큰 미접근).
- **응답 포맷**: `{ success, code, message, data }`. 실패 시 `ApiError(code, message)` throw, 화면은 `message` 노출(내부 상세 비표시).
- **타입**: `api-spec.md` 응답 구조에 맞춰 `types/api.ts`에 정의. BigInt PK는 `string`.
- **권한 가드**: 미인증 → `/login?next=`. 역할 불일치 화면은 진입 차단/안내(BUYER 전용·SELLER 전용·ADMIN 전용).
- **상태/로딩/에러**: 목록·상세 스켈레톤, 액션 버튼 로딩 중 비활성화, 파괴적 동작은 `ConfirmDialog`.
- **계약 불변**: `api-spec.md` 엔드포인트·필드·상태머신을 임의로 바꾸지 않는다. 불일치 발견 시 멈추고 보고.
- **버킷 라우팅**: 구매자 P2 화면은 `/buyer/*`, 판매자 P2는 `/seller/*`, 관리자는 `/admin/*`. (알림 `linkUrl`이 `/buyer/...` 형태이므로 통일)

---

## 진행 묶음 (각각 한 세션 권장)

| 묶음 | 화면(screen-spec) | API(api-spec) | 의존 |
| --- | --- | --- | --- |
| **W-0** | 공통 기반(타입·`api.patch`·공통 컴포넌트·네비/마이페이지 P2 진입·알림 벨) | — | WEB-P1 |
| **W-A** | 찜(BUY-003), 사업자 인증(SEL-007) | favorites, business-info | W-0 |
| **W-B** | 문의(BUY-004), 내 문의(BUY-005), 받은 문의(SEL-004), 견적 발송(SEL-005) | inquiries, quotes | W-0 |
| **W-C** | 미팅 요청(BUY-008), 내 미팅(BUY-009), 받은 미팅·응답(SEL-008/009) | meetings | W-0 |
| **W-D** | 거래 내역(BUY-006), 거래 관리(SEL-006), 리뷰 작성(BUY-007), 판매자 대시보드(SEL-003) | deals, reviews | W-B |
| **W-E** | 알림 목록(COM-007) + 헤더 미읽음 뱃지 | notifications | W-A~D |
| **W-F** | 관리자(ADM-001 대시보드·002 사업자심사·003 상품검수·004 카테고리/제조사·005 회원) | admin/* | W-A |

### 범위 밖 / 보류 (이번 P2 웹에서 만들지 않음)
- **COM-005 내 정보 수정**, **COM-006 비밀번호 변경/재설정** — 백엔드에 해당 API가 `api-spec.md`에 미정의. 백엔드 추가 후 별도 진행.
- **ADM-006 신고/분쟁 처리** — P3.
- **상품 이미지 업로드** — 백엔드 업로드 엔드포인트 부재(P2 상품폼은 이미지 자리만 유지).
- **상품 목록 P2 필터(가격대/지역/제조사/정렬)** — 백엔드 `GET /products` 미지원. 키워드/페이징 유지.

---

## W-0 — 공통 기반

목적: 묶음 A~F가 공유하는 토대.

1. **API 클라이언트 확장**: `lib/api.ts`에 `api.patch<T>(path, body)` 추가(`apiRequest`는 이미 PATCH 지원). DELETE에 body가 필요한 경우는 없음.
2. **타입 추가**(`types/api.ts`): `api-spec.md` 4~11장 기준
   - `VerifyStatus`, `BusinessInfo`, `Favorite`/`FavoriteItem`,
   - `InquiryStatus`, `Inquiry`, `Quote`,
   - `MeetingType`, `MeetingStatus`, `SlotProposer`, `MeetingSlot`, `MeetingRequest`,
   - `DealStatus`, `Deal`, `Review`, `SellerReviews`,
   - `Notification`, `NotificationList`,
   - 관리자: `AdminCategory`, `Manufacturer`, `MemberSummary` 등. 목록 응답은 `{ items, total }` 형태.
3. **라벨/포맷 확장**(`lib/format.ts`): 상태값 라벨/뱃지 톤 매핑
   - `VERIFY_STATUS_LABEL`, `INQUIRY_STATUS_LABEL`, `MEETING_STATUS_LABEL`, `DEAL_STATUS_LABEL`, `MEETING_TYPE_LABEL`, `NOTI_TYPE_LABEL`.
   - `formatDateTime(iso)`(Asia/Seoul), `formatDate(iso)`.
4. **공통 컴포넌트**:
   - `StatusBadge`(상태값→색상 톤) — 기존 `Badge` 재사용/확장.
   - `Rating`(별점 표시/입력), `Tabs`(role=buyer|seller 전환), `Field` 보강(textarea/select/datetime).
5. **네비/진입점**:
   - `Header`에 **알림 벨**(미읽음 수) + 역할별 진입 추가.
   - `mypage`에 역할별 P2 메뉴(BUYER: 찜·내 문의·내 미팅·거래 / SELLER: 받은 문의·받은 미팅·거래 관리·사업자 인증 / ADMIN: 관리자 콘솔).
6. **가드 유틸**: `requireRole(member, role)` 클라이언트 헬퍼(미충족 시 안내/리다이렉트).

**검증**: `npm run build`/`lint` 통과. 헤더·마이페이지에 P2 진입점 노출(빈 화면이라도 라우트 200).

---

## W-A — 찜 + 사업자 인증

### BUY-003 찜 목록 (`/buyer/favorites`, BUYER)
- `GET /favorites` → 상품 카드 그리드(`product` null이면 "삭제된 상품" 표시).
- 카드에서 찜 해제 `DELETE /favorites/{productId}`(낙관적 갱신 + 실패 롤백). 빈 상태 안내.

### 상품 카드/상세 찜 토글
- `ProductCard`·상품 상세(BUY-002)에 하트 토글. 추가 `POST /favorites {productId}`, 해제 `DELETE /favorites/{productId}`.
- 비로그인/비BUYER는 `/login`으로 유도. 409(이미 찜)는 토글 상태로 흡수.

### SEL-007 사업자 인증 등록 (`/seller/business-info`, SELLER)
- `GET /business-info/me`(404=미등록) → 미등록이면 등록 폼, 등록됨이면 상태 카드(`verifyStatus` 뱃지).
- 등록 `POST /business-info {companyName, bizRegNo, deviceSalesLicenseNo?}`. 409(이미 등록)·400 필드 매핑.

**검증**: 찜 추가/해제/목록·중복 흡수, 사업자 등록→PENDING 표시.

---

## W-B — 문의 · 견적

### BUY-004 문의 요청 (상품 상세 진입 → 모달/`/products/[id]`)
- BUYER가 상품 상세에서 [문의하기] → message 입력 → `POST /inquiries {productId, message?}`. 성공 시 [BUY-005]로.

### BUY-005 내 문의 목록 (`/buyer/inquiries`, BUYER)
- `GET /inquiries?role=buyer` → 카드(상품·상태 뱃지·`quotes` 목록). 견적 존재 시 가격/유효기간 표시 + [거래 생성](W-D 연계) 버튼.
- 종료 `PATCH /inquiries/{id}/close`(409 ILLEGAL_STATE 흡수).

### SEL-004 받은 문의 (`/seller/inquiries`, SELLER)
- `GET /inquiries?role=seller` → 카드. [견적 발송](SEL-005)·[종료].

### SEL-005 견적 발송 (모달)
- `POST /inquiries/{id}/quotes {quotePrice, validUntil(yyyy-MM-dd), memo?}` → inquiry QUOTED. 재발송 시 quote만 추가.

**검증**: 문의 생성(OPEN)→견적(QUOTED)→종료(CLOSED), 타인 문의 403, 상태 뱃지.

---

## W-C — 미팅 요청

상태머신은 `api-spec.md` 7장 전이표를 그대로 강제(클라이언트는 허용된 액션만 노출, 서버 409는 메시지로 흡수).

### BUY-008 미팅 요청 (`/buyer/meetings/new` 또는 상품 상세 진입, BUYER)
- 폼: meetingType(ONLINE/VISIT_SELLER/VISIT_BUYER), purpose, preferredSlots(1~3, 미래 datetime-local), location?, message?.
- `POST /meetings {sellerId, productId?, meetingType, purpose, preferredSlots[], location?, message?}` → [BUY-009].

### BUY-009 내 미팅 (`/buyer/meetings`, BUYER)
- `GET /meetings?role=buyer` → 카드(slots·상태). 판매자가 ACCEPTED/RESCHEDULE_PROPOSED 시 [확정 CONFIRMED]/[취소 CANCELED] `PATCH /meetings/{id}`.

### SEL-008/009 받은 미팅·응답 (`/seller/meetings`, SELLER)
- `GET /meetings?role=seller` → 카드. 응답: [수락(slot 택일) ACCEPTED]/[거절 REJECTED]/[재제안(새 slot) RESCHEDULE_PROPOSED] `PATCH /meetings/{id}`.

**검증**: 요청→수락(택일)→확정→완료, 재제안/거절/취소, 잘못된 전이 409 흡수.

---

## W-D — 거래 + 리뷰

### 거래 생성 (BUY-005 견적에서)
- `POST /deals {inquiryId, quoteId?}`(QUOTED 문의만) → 거래 목록으로.

### BUY-006 거래 내역 (`/buyer/deals`, BUYER) / SEL-006 거래 관리 (`/seller/deals`, SELLER)
- `GET /deals?role=buyer|seller` → 카드(finalPrice·상태). 상태 전이 `PATCH /deals/{id}/status`(REQUESTED→IN_PROGRESS→COMPLETED / →CANCELED).

### BUY-007 리뷰 작성 (거래 COMPLETED → 모달)
- `POST /reviews {dealId, rating(1~5), content?}` — 완료 거래·거래당 1회. 409(중복/미완료) 흡수.

### SEL-003 판매자 대시보드 (`/seller`, SELLER)
- 내 상품/받은 문의/받은 미팅/거래 요약 카운트 + 평균 평점(`GET /sellers/{id}/reviews`).

**검증**: 견적→거래 생성→진행→완료, 완료 거래에만 리뷰, 평균 평점 노출.

---

## W-E — 알림

### COM-007 알림 목록 (`/notifications`, 인증)
- `GET /notifications` → 미읽음 우선 목록. 항목 클릭 시 `linkUrl` 이동 + `PATCH /notifications/{id}/read`. [모두 읽음].
- 헤더 벨에 `unread` 뱃지(폴링 또는 진입 시 갱신).

**검증**: 이벤트 알림 노출, 읽음 멱등 처리, 미읽음 수 갱신.

---

## W-F — 관리자 (웹 전용, ADMIN)

`/admin/*`. 비ADMIN 진입 차단.

- **ADM-001 대시보드**(`/admin`): 심사 대기/검수/회원 요약 진입.
- **ADM-002 사업자 인증 심사**: 대기 목록 → `PATCH /admin/business-info/{id} {verifyStatus, reason?}`.
- **ADM-003 상품 검수**: `PATCH /admin/products/{id}/status {status}`.
- **ADM-004 카테고리/제조사 관리**: `GET/POST/PUT/DELETE /admin/categories`·`/admin/manufacturers`(삭제 409 정책 표시).
- **ADM-005 회원 관리**: `PATCH /admin/members/{id}/status {status: ACTIVE|SUSPENDED}`.

> ⚠️ 사업자 인증/상품 검수의 **대기 목록 조회 API**가 `api-spec.md`에 명시되지 않음. 견적·미팅처럼 별도 목록 엔드포인트가 없으면, **백엔드 보강이 필요**하므로 W-F 진입 시 멈추고 보고한다(임의 추정 금지).

**검증**: 비ADMIN 403/차단, 승인 시 판매자 상태 반영, 카테고리 CRUD.

---

## 완료 기준 (Definition of Done) — 웹 P2 전체

1. 모든 묶음 `npm run build`/`npm run lint` 통과.
2. 찜 추가/해제/목록(중복 흡수), 상품 카드·상세 토글.
3. 사업자 인증 등록→상태 표시, 관리자 승인 반영.
4. 문의→견적→종료, 권한·상태 뱃지.
5. 미팅 요청→수락(택일)→확정→완료 + 재제안/거절/취소.
6. 견적→거래 생성→진행→완료, 완료 거래에만 리뷰, 평균 평점.
7. 알림 목록·미읽음 뱃지·읽음 처리.
8. 관리자 화면 권한 차단 + 심사/검수/회원/마스터 관리(목록 API 확인 후).
9. 모든 호출이 `api.*` 래퍼·프록시 경유, 토큰 비노출, `message` 기반 에러.

## 진행 원칙
- 묶음 단위로 끊어 진행, 각 묶음 후 `npm run build` + 동작 검증.
- `api-spec.md` 계약/상태머신을 임의 변경하지 않는다(불일치 시 멈추고 보고).
- 소유자/역할 검증을 모든 변경 액션에 적용.
- P1 패턴(공통 래퍼·쿠키 인증·공통 컴포넌트) 재사용, 중복 최소화.
- 본 문서는 `apps/web/CLAUDE.md`의 "P1 한정 범위"를 **P2로 확장**한다(해당 파일 범위 표기도 갱신).
</content>
</invoke>
