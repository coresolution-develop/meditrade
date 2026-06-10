# API 명세서 — 의료기기 유통 플랫폼 (MediTrade)

> 웹·앱 공용 REST API. 기능 정의서(`functional-spec.md`)·화면 정의서(`screen-spec.md`)와 매핑된다.
> Phase 1(인증·상품)을 상세 정의하고, Phase 2는 개요만 둔다(확정 시 상세화).

---

## 1. 공통 규약

| 항목 | 값 |
| --- | --- |
| Base URL | `http://localhost:3001/api/v1` (개발) |
| 포맷 | JSON (요청·응답) |
| 인증 | `Authorization: Bearer <accessToken>` |
| 시간대 | Asia/Seoul, 날짜 `yyyy-MM-dd`, 일시 ISO 8601 |
| ID 직렬화 | BigInt PK는 문자열로 반환 |

### 공통 응답 포맷
```json
{ "success": true, "code": "OK", "message": "OK", "data": { } }
```
```json
{ "success": false, "code": "NOT_FOUND", "message": "상품을 찾을 수 없습니다.", "data": null }
```

### 에러 코드
| code | HTTP | 의미 |
| --- | --- | --- |
| VALIDATION_ERROR | 400 | 입력 검증 실패 |
| BAD_REQUEST | 400 | 잘못된 요청 |
| UNAUTHORIZED | 401 | 미인증/토큰 오류 |
| FORBIDDEN | 403 | 권한 없음 |
| NOT_FOUND | 404 | 리소스 없음 |
| CONFLICT | 409 | 중복 등 충돌 |
| INTERNAL_ERROR | 500 | 서버 오류 |

---

## 2. 인증 (AUTH)

### POST /auth/signup — 회원가입
**요청**
```json
{
  "email": "buyer@test.com",
  "password": "test1234",
  "name": "홍길동",
  "phone": "010-1234-5678",
  "role": "BUYER"
}
```
- `password`: 8자 이상 / `role`: `BUYER` | `SELLER` / `phone`: 선택

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": { "id": "1", "email": "buyer@test.com" } }
```
**에러**: 409 `CONFLICT`(이메일 중복), 400 `VALIDATION_ERROR`

---

### POST /auth/login — 로그인
**요청**
```json
{ "email": "buyer@test.com", "password": "test1234" }
```
**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "member": { "id": "1", "email": "buyer@test.com", "name": "홍길동", "role": "BUYER" }
  } }
```
- `accessToken` 유효기간: 환경변수 `JWT_ACCESS_EXPIRES`(기본 1h)
- `refreshToken` 유효기간: 환경변수 `JWT_REFRESH_EXPIRES`(기본 7d). Redis 에 화이트리스트로 저장됨.

**에러**: 401 `UNAUTHORIZED`("이메일 또는 비밀번호가 올바르지 않습니다." — 계정 존재 여부 비노출)

---

### POST /auth/refresh — 액세스 토큰 재발급 (P2)
**요청**
```json
{ "refreshToken": "eyJhbGciOi..." }
```
처리: refresh JWT 서명 검증 + Redis 화이트리스트 조회 → 통과 시 새 access·refresh 한 쌍 발급. **기존 refresh 는 회전(rotation)되어 즉시 폐기**.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  } }
```
**에러**: 401 `UNAUTHORIZED`(서명 불일치 / 만료 / 폐기됨)

---

### POST /auth/logout — 로그아웃 (P2) 🔒 인증
**헤더**: `Authorization: Bearer <accessToken>`

**요청**(선택 — refresh 토큰도 함께 폐기)
```json
{ "refreshToken": "eyJhbGciOi..." }
```
처리: access 토큰의 `jti` 를 만료시각까지 Redis 블랙리스트(`auth:bl:<jti>`) 에 등록. body 에 refresh 가 있으면 화이트리스트에서 제거.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK", "data": null }
```
**에러**: 401 `UNAUTHORIZED`(토큰 없음/만료)

---

## 3. 상품 (PRODUCT)

### GET /products — 목록/검색
**쿼리 파라미터**
| 이름 | 타입 | 기본 | 설명 |
| --- | --- | --- | --- |
| page | int | 1 | 페이지 |
| size | int | 20 | 페이지 크기 |
| keyword | string | - | 상품명/모델명 검색(P1: 선택, 필터는 P2) |

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "items": [
      {
        "id": "1",
        "name": "중고 휴대용 초음파 진단기",
        "modelName": "US-200",
        "conditionType": "USED",
        "price": 3500000,
        "priceNegotiable": true,
        "region": "전북 전주",
        "status": "ON_SALE",
        "categoryId": "1"
      }
    ],
    "total": 3, "page": 1, "size": 20
  } }
```
> `price`가 `null`이면 화면에서 "가격 문의"로 표기.

---

### GET /products/mine — 내(판매자) 상품 목록 🔒 SELLER
**헤더**: `Authorization: Bearer <token>`

토큰의 `sellerId` 로 본인 상품만 조회. `GET /products` 와 달리 **`status` 필터 없이**(DRAFT/PENDING/ON_SALE/SOLD_OUT/HIDDEN 모두) 최신순 페이징.

**쿼리 파라미터**
| 이름 | 타입 | 기본 | 설명 |
| --- | --- | --- | --- |
| page | int | 1 | 페이지 |
| size | int | 20 | 페이지 크기 |

**응답 200**: `GET /products` 와 동일 구조 `{ items, total, page, size }`.
**에러**: 401 `UNAUTHORIZED`, 403 `FORBIDDEN`(SELLER 아님)

> ⚠️ 라우팅 주의: `/products/{id}` 보다 위에 선언되어야 `mine` 이 id 로 해석되지 않는다.

---

### GET /products/{id} — 상세
**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "id": "1",
    "name": "중고 휴대용 초음파 진단기",
    "modelName": "US-200",
    "conditionType": "USED",
    "price": 3500000,
    "priceNegotiable": true,
    "stock": 1,
    "region": "전북 전주",
    "description": "2021년식, 사용기간 1년 미만 ...",
    "status": "ON_SALE",
    "viewCount": 12,
    "categoryId": "1",
    "category": { "id": "1", "name": "영상진단기기" },
    "images": [
      { "id": "10", "imageUrl": "https://.../1.jpg", "isMain": true, "sortOrder": 0 }
    ]
  } }
```
**에러**: 404 `NOT_FOUND`

---

### POST /products — 등록 🔒 SELLER
**헤더**: `Authorization: Bearer <token>`
**요청**
```json
{
  "name": "환자 감시 모니터",
  "modelName": "PM-900",
  "categoryId": 8,
  "conditionType": "NEW",
  "price": null,
  "region": "서울",
  "description": "심전도/SpO2/NIBP 통합 모니터"
}
```
- `name`: 1~200자(필수) / `categoryId`: 유효 카테고리(필수) / `conditionType`: `NEW`|`USED`|`REFURBISHED`(필수)
- `price`: 0 이상 또는 생략/null(="문의")

**응답 200**: 생성된 상품(상세와 동일 구조, `status="ON_SALE"`)
**에러**: 401 `UNAUTHORIZED`, 403 `FORBIDDEN`(SELLER 아님), 400 `VALIDATION_ERROR`

---

### PUT /products/{id} — 수정 🔒 SELLER(본인)
**요청**(변경 필드만)
```json
{ "price": 3200000, "status": "SOLD_OUT" }
```
**응답 200**: 수정된 상품
**에러**: 404 `NOT_FOUND`, 403 `FORBIDDEN`(본인 상품 아님)

---

### DELETE /products/{id} — 삭제 🔒 SELLER(본인)
**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK", "data": { "id": "1" } }
```
**에러**: 404 `NOT_FOUND`, 403 `FORBIDDEN`

---

## 3.5 카테고리 (CATEGORY)

### GET /categories — 전체 카테고리 (공개)
인증 불필요. 상품 등록/검색 폼의 카테고리 셀렉트에 사용한다. 정렬: `sortOrder` ASC, `id` ASC.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "items": [
      { "id": "1", "name": "치료기기", "parentId": null, "sortOrder": 1 }
    ],
    "total": 9
  } }
```
> `/admin/categories`(ADMIN)와 동일 구조지만 본 엔드포인트는 **공개**다.

---

## 4. 사업자 인증 (BUSINESS-INFO) — P2 묶음 B

### POST /business-info — 등록 🔒 SELLER
**요청**
```json
{
  "companyName": "메디트레이드 의료기",
  "bizRegNo": "123-45-67890",
  "deviceSalesLicenseNo": "제2024-서울-001234호"
}
```
- `companyName`: 1~100자 (필수)
- `bizRegNo`: 1~20자 (필수)
- `deviceSalesLicenseNo`: 1~50자 (선택)

처리: 본인 회원에 1건만 등록 가능. `verifyStatus` 는 `PENDING` 으로 시작 (관리자 승인은 Step G).

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "id": "1",
    "memberId": "2",
    "companyName": "메디트레이드 의료기",
    "bizRegNo": "123-45-67890",
    "deviceSalesLicenseNo": "제2024-서울-001234호",
    "verifyStatus": "PENDING",
    "createdAt": "2026-06-06T01:23:45.000Z"
  } }
```
**에러**: 401 / 403(SELLER 아님) / 409(이미 등록됨) / 400 `VALIDATION_ERROR`

> 정책: 상품 등록 시 `verifyStatus=APPROVED` 강제는 하지 않음(경고만). 차단은 추후 옵션 플래그로.

---

### GET /business-info/me — 본인 인증 상태 🔒 인증
**응답 200**: 등록 POST 와 동일 구조.
**에러**: 401 / 404 `NOT_FOUND`(미등록)

---

## 5. 찜 (FAVORITES) — P2 묶음 B

### POST /favorites — 찜 추가 🔒 BUYER
**요청**
```json
{ "productId": 1 }
```
**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "id": "1",
    "buyerId": "2",
    "productId": "1",
    "createdAt": "2026-06-06T01:23:45.000Z"
  } }
```
**에러**: 401 / 403(BUYER 아님) / 404(상품 없음) / 409(이미 찜됨)

---

### DELETE /favorites/{productId} — 찜 해제 🔒 BUYER
**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK", "data": { "productId": "1" } }
```
**에러**: 401 / 403 / 404(찜 내역 없음)

---

### GET /favorites — 내 찜 목록 🔒 BUYER
상품 카드 정보 join. 최신순.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "items": [
      {
        "id": "1",
        "productId": "1",
        "createdAt": "2026-06-06T01:23:45.000Z",
        "product": {
          "id": "1",
          "sellerId": "1",
          "categoryId": "6",
          "name": "중고 휴대용 초음파 진단기",
          "modelName": "US-200",
          "conditionType": "USED",
          "price": 3500000,
          "priceNegotiable": true,
          "region": "전북 전주",
          "status": "ON_SALE"
        }
      }
    ],
    "total": 1
  } }
```
> 찜 대상 상품이 삭제된 경우 `product` 는 `null` 일 수 있다.

---

## 6. 문의·견적 (INQUIRY / QUOTE) — P2 묶음 C

### Inquiry 상태 전이 (강제)
```
OPEN → QUOTED → CLOSED
OPEN → CLOSED
```
- 허용되지 않은 전이(예: CLOSED → 어디로든, 이미 CLOSED 인 문의에 견적 발송)는 409 `ILLEGAL_STATE`.
- 응답 메시지에는 현재 상태값을 노출하지 않는다(로그에만 기록).

---

### POST /inquiries — 문의 발송 🔒 BUYER
**요청**
```json
{ "productId": 1, "message": "재고 여부와 A/S 가능 여부 문의드립니다." }
```
- `productId`: 1 이상의 정수 (필수)
- `message`: 1~2000자 (선택)

처리: 상품에서 `sellerId` 도출 → `status=OPEN` 으로 생성.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "id": "1",
    "productId": "1",
    "buyerId": "2",
    "sellerId": "1",
    "message": "재고 여부와 A/S 가능 여부 문의드립니다.",
    "status": "OPEN",
    "createdAt": "2026-06-06T14:23:45.000Z"
  } }
```
**에러**: 401 / 403(BUYER 아님) / 404(상품 없음) / 400 `VALIDATION_ERROR`

---

### GET /inquiries?role=buyer|seller — 내 문의 목록 🔒 인증
- `role` 필수: `buyer` → 본인이 보낸 문의, `seller` → 본인이 받은 문의.
- 각 항목에 `quotes` 배열(최신순) 포함.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "items": [
      {
        "id": "1",
        "productId": "1",
        "buyerId": "2",
        "sellerId": "1",
        "message": "재고 여부와 A/S 가능 여부 문의드립니다.",
        "status": "QUOTED",
        "createdAt": "2026-06-06T14:23:45.000Z",
        "quotes": [
          {
            "id": "1",
            "inquiryId": "1",
            "quotePrice": 3200000,
            "validUntil": "2026-07-06T00:00:00.000Z",
            "memo": "프로브 1종 포함, 7월 6일까지 유효",
            "createdAt": "2026-06-06T14:25:00.000Z"
          }
        ]
      }
    ],
    "total": 1
  } }
```
**에러**: 401 / 400 `VALIDATION_ERROR`(role 누락/오타)

---

### PATCH /inquiries/{id}/close — 문의 종료 🔒 인증
양측(소유자: buyer 또는 seller) 가능. 본인 문의가 아니면 403.

**응답 200**: 종료된 문의(상세와 동일 구조, `status="CLOSED"`)
**에러**: 401 / 403(타인 문의) / 404 / 409 `ILLEGAL_STATE`(이미 CLOSED)

---

### POST /inquiries/{id}/quotes — 견적 발송 🔒 SELLER (해당 문의의 sellerId 본인)
**요청**
```json
{
  "quotePrice": 3200000,
  "validUntil": "2026-07-06",
  "memo": "프로브 1종 포함, 7월 6일까지 유효"
}
```
- `quotePrice`: 0 이상 정수 (필수)
- `validUntil`: yyyy-MM-dd 또는 ISO 8601 (필수)
- `memo`: 1~2000자 (선택)

처리: 검증 통과 시 `quote` 생성 + `inquiry.status` 를 `QUOTED` 로 전이.
같은 문의에 다시 발송하면 `quote` 만 추가되고 상태는 `QUOTED` 유지.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "id": "1",
    "inquiryId": "1",
    "quotePrice": 3200000,
    "validUntil": "2026-07-06T00:00:00.000Z",
    "memo": "프로브 1종 포함, 7월 6일까지 유효",
    "createdAt": "2026-06-06T14:25:00.000Z"
  } }
```
**에러**: 401 / 403(타인 문의 / BUYER) / 404 / 400 `VALIDATION_ERROR` / 409 `ILLEGAL_STATE`(이미 CLOSED)

---

## 7. 미팅 요청 (MEETING) — P2 묶음 D

### MeetingRequest 상태 전이 (강제)
```
REQUESTED → ACCEPTED → CONFIRMED → COMPLETED
REQUESTED → REJECTED                              (terminal)
REQUESTED → RESCHEDULE_PROPOSED → (ACCEPTED | CONFIRMED | CANCELED)
(ACCEPTED | RESCHEDULE_PROPOSED | CONFIRMED) → CANCELED
```
- 허용되지 않은 전이는 409 `ILLEGAL_STATE`. 메시지에 현재 상태값을 노출하지 않는다(로그에만).
- 종결 상태: `REJECTED`, `CANCELED`, `COMPLETED`.

### 역할별 행위
| 전이 | 수행 가능 | 부가 입력 |
| --- | --- | --- |
| REQUESTED → ACCEPTED | SELLER | `selectedSlot` (미팅에 속한 slot 시각) |
| REQUESTED → REJECTED | SELLER | – |
| REQUESTED → RESCHEDULE_PROPOSED | SELLER | `proposedSlot` (새 slot, 미래) |
| RESCHEDULE_PROPOSED → ACCEPTED | 양측 | `selectedSlot` |
| RESCHEDULE_PROPOSED → CONFIRMED | 양측 | `selectedSlot` (또는 기존 선택 슬롯 유지) |
| ACCEPTED → CONFIRMED | 양측 | optional `selectedSlot` (기존 선택 슬롯이 있으면 생략 가능) |
| ACCEPTED / RESCHEDULE_PROPOSED → CANCELED | 양측 | – |
| CONFIRMED → COMPLETED | 양측 | – |
| CONFIRMED → CANCELED | 양측 | – |

> 본인 미팅이 아닌 경우(소유자: buyerId 또는 sellerId) 모든 변경은 403.

---

### POST /meetings — 미팅 요청 🔒 BUYER
**요청**
```json
{
  "sellerId": 2,
  "productId": 1,
  "meetingType": "VISIT_BUYER",
  "purpose": "실물확인",
  "preferredSlots": [
    "2026-06-10T14:00:00+09:00",
    "2026-06-11T10:00:00+09:00"
  ],
  "location": "전북 전주시 ...",
  "message": "설치 공간 확인 겸 방문 부탁드립니다."
}
```
- `meetingType`: `ONLINE` | `VISIT_SELLER` | `VISIT_BUYER` (필수)
- `purpose`: 1~100자 (필수)
- `preferredSlots`: ISO 8601 1~3개, **모두 미래 시점**. 중복 제거.
- `location`, `message`: 선택

처리: 판매자 존재(role=SELLER) 확인 → meeting(status=REQUESTED) + slots(proposedBy=BUYER) `$transaction` 생성.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "id": "1",
    "buyerId": "2",
    "sellerId": "1",
    "productId": "1",
    "meetingType": "VISIT_BUYER",
    "purpose": "실물확인",
    "message": "설치 공간 확인 겸 방문 부탁드립니다.",
    "location": "전북 전주시 ...",
    "confirmedAt": null,
    "status": "REQUESTED",
    "createdAt": "2026-06-06T14:30:00.000Z",
    "slots": [
      { "id": "1", "meetingId": "1", "proposedAt": "2026-06-10T05:00:00.000Z", "proposedBy": "BUYER", "isSelected": false },
      { "id": "2", "meetingId": "1", "proposedAt": "2026-06-11T01:00:00.000Z", "proposedBy": "BUYER", "isSelected": false }
    ]
  } }
```
**에러**: 401 / 403(BUYER 아님) / 404(판매자/상품 없음) / 400(검증 / 본인에게 요청 / 과거 슬롯)

---

### GET /meetings?role=buyer|seller — 내 미팅 목록 🔒 인증
- `role` 필수: `buyer` → 본인이 보낸 요청, `seller` → 본인이 받은 요청.
- 각 항목에 `slots` 포함, 최신순.

**응답 200**: 위 생성 응답과 동일 구조의 배열 `{ items, total }`.

---

### PATCH /meetings/{id} — 상태 변경 🔒 인증 (소유자)
공통 body:
```json
{ "status": "ACCEPTED", "selectedSlot": "2026-06-10T14:00:00+09:00" }
```
- `status`: 전이 목표 (필수)
- `selectedSlot`: `ACCEPTED` / 일부 `CONFIRMED` 시 사용. 미팅의 후보 slot 시각과 일치해야 함.
- `proposedSlot`: `RESCHEDULE_PROPOSED` 시 사용. 새 slot(미래) 추가, proposedBy=SELLER.

**응답 200**: 변경된 미팅(slots 포함).
**에러**:
- 401 / 403(타인 미팅 / 역할 부적합 — 예: BUYER 가 ACCEPTED 시도) / 404
- 400 `VALIDATION_ERROR` (status/selectedSlot/proposedSlot 형식, 슬롯이 미팅에 없음, 과거 시점 등)
- 409 `ILLEGAL_STATE` (전이 표에 없는 변경)

---

## 8. 거래 (DEAL) — P2 묶음 E

### Deal 상태 전이 (강제)
```
REQUESTED → IN_PROGRESS → COMPLETED       (terminal)
(REQUESTED | IN_PROGRESS) → CANCELED      (terminal)
```
- 양측(buyer / seller) 모두 전이 수행 가능.
- 허용되지 않은 전이는 409 `ILLEGAL_STATE` (현재 상태값은 로그에만).
- `COMPLETED` 진입 시 `completedAt` 기록.

---

### POST /deals — 거래 생성 🔒 BUYER
**요청**
```json
{ "inquiryId": 1, "quoteId": 1 }
```
- `inquiryId`: 필수. 본인(buyer)의 문의이며 `status=QUOTED` 여야 한다.
- `quoteId`: 선택. 미지정 시 해당 문의의 **최신 견적** 사용.

처리: `inquiry.productId` / `sellerId` / `quote.quotePrice` 를 자동 도출해 `Deal(status=REQUESTED)` 생성. 동일 문의에 거래가 이미 있으면 409.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "id": "1",
    "inquiryId": "1",
    "productId": "3",
    "buyerId": "2",
    "sellerId": "1",
    "finalPrice": 3200000,
    "status": "REQUESTED",
    "createdAt": "2026-06-06T15:00:00.000Z",
    "completedAt": null
  } }
```
**에러**: 401 / 403(BUYER 아님 / 타인 문의) / 404(문의·견적 없음) / 409(이미 거래 존재 / inquiry 가 QUOTED 가 아님 → `ILLEGAL_STATE`) / 400

---

### GET /deals?role=buyer|seller — 내 거래 목록 🔒 인증
- `role` 필수.

**응답 200**: 위 구조의 배열 `{ items, total }`.

---

### PATCH /deals/{id}/status — 상태 변경 🔒 인증 (양측)
**요청**
```json
{ "status": "IN_PROGRESS" }
```
- `status`: `REQUESTED` → `IN_PROGRESS` → `COMPLETED` / `(REQUESTED|IN_PROGRESS)` → `CANCELED`.

**응답 200**: 변경된 거래.
**에러**: 401 / 403(타인 거래) / 404 / 409 `ILLEGAL_STATE`

---

## 9. 리뷰 (REVIEW) — P2 묶음 E

### POST /reviews — 리뷰 작성 🔒 BUYER
**요청**
```json
{ "dealId": 1, "rating": 5, "content": "친절한 응대와 빠른 배송 감사합니다." }
```
- `dealId`: 본인(buyer)의 `COMPLETED` 거래만.
- `rating`: 1~5 정수.
- `content`: 1~2000자 (선택).
- 거래당 1회만 작성 가능 (재작성 시 409).

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "id": "1",
    "dealId": "1",
    "buyerId": "2",
    "sellerId": "1",
    "rating": 5,
    "content": "친절한 응대와 빠른 배송 감사합니다.",
    "createdAt": "2026-06-06T15:10:00.000Z"
  } }
```
**에러**: 401 / 403(BUYER 아님 / 타인 거래) / 404 / 409(중복 / 거래 미완료 → `ILLEGAL_STATE`) / 400

---

### GET /sellers/{id}/reviews — 판매자 리뷰 목록 + 평균 평점 (공개)
**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "sellerId": "1",
    "total": 12,
    "averageRating": 4.83,
    "items": [
      {
        "id": "1",
        "dealId": "1",
        "buyerId": "2",
        "sellerId": "1",
        "rating": 5,
        "content": "친절한 응대...",
        "createdAt": "2026-06-06T15:10:00.000Z"
      }
    ]
  } }
```
- `averageRating`: 소수 둘째 자리까지. 리뷰가 없으면 `null`.

**에러**: 404 (판매자 없음)

---

## 10. 알림 (NOTIFICATION) — P2 묶음 F

### 알림 타입(`type`)
| 코드 | 의미 | NOTI 매핑 |
| --- | --- | --- |
| `INQUIRY_RECEIVED` | 판매자에게 문의 도착 | NOTI-001 |
| `QUOTE_RECEIVED` | 구매자에게 견적 발송됨 | NOTI-002 |
| `DEAL_STATUS_CHANGED` | 거래 시작/상태 변경 (양측) | NOTI-003 |
| `MEETING_REQUESTED` | 판매자에게 미팅 요청 도착 | NOTI-004 |
| `MEETING_RESPONDED` | 상대방에게 미팅 응답·확정·취소 | NOTI-004 |

> 알림 생성은 **best-effort**. 알림 저장 실패가 본 도메인 동작(문의/거래/미팅 생성·변경)을 깨뜨리지 않는다. 실패는 서버 로그에만 기록.
> `title` / `body` 는 일반화. 민감정보·내부 상세는 응답·알림에 노출하지 않는다.

---

### GET /notifications — 내 알림 목록 🔒 인증
미읽음(`isRead=false`) 우선, 그 다음 최신순.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "items": [
      {
        "id": "1",
        "memberId": "2",
        "type": "QUOTE_RECEIVED",
        "title": "견적이 도착했습니다.",
        "body": "내 문의/견적 목록에서 견적을 확인하세요.",
        "linkUrl": "/buyer/inquiries/3",
        "isRead": false,
        "createdAt": "2026-06-06T15:30:00.000Z"
      }
    ],
    "total": 12,
    "unread": 3
  } }
```
**에러**: 401

---

### PATCH /notifications/{id}/read — 읽음 처리 🔒 인증 (소유자)
이미 읽음인 경우도 200(멱등).

**응답 200**: 갱신된 알림.
**에러**: 401 / 403(타인 알림) / 404

---

## 11. 관리자 (ADMIN) — P2 묶음 G

> 모두 `🔒 ADMIN` 권한 필수 (`JwtAuthGuard` + `@Roles('ADMIN')`). 비ADMIN 접근 → 403.
> 알림이 발생하는 경우(사업자 인증, 회원 정지)는 best-effort.

---

### GET /admin/business-info?status= — 사업자 인증 심사 목록
`status` 미지정 시 전체, 지정 시 해당 상태(`PENDING`|`APPROVED`|`REJECTED`)만. 신청자 식별을 위해 `member`(이메일/이름) 조인. 최신순.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "items": [
      {
        "id": "1",
        "memberId": "2",
        "companyName": "메디트레이드 의료기",
        "bizRegNo": "123-45-67890",
        "deviceSalesLicenseNo": "제2024-서울-001234호",
        "verifyStatus": "PENDING",
        "createdAt": "2026-06-06T01:23:45.000Z",
        "member": { "id": "2", "email": "seller@test.com", "name": "김판매" }
      }
    ],
    "total": 1
  } }
```
**에러**: 401 / 403(비ADMIN) / 400 `BAD_REQUEST`(status 오타)

---

### PATCH /admin/business-info/{id} — 사업자 인증 승인/반려
**요청**
```json
{ "verifyStatus": "APPROVED", "reason": "심사 통과" }
```
- `verifyStatus`: `APPROVED` | `REJECTED` (필수). `PENDING` 으로 되돌리려면 별도 절차.
- `reason`: 1~500자 (선택). 응답·알림에 노출하지 않고 로그 기록용.

처리: `BusinessInfo.verifyStatus` 갱신 + 해당 SELLER 에게 `BUSINESS_INFO_VERIFIED` 알림.

**응답 200**: business-info 객체.
**에러**: 401 / 403 / 404 / 400

---

### GET /admin/products?status= — 상품 검수 목록
`status` 미지정 시 전체(`DRAFT`|`PENDING`|`ON_SALE`|`SOLD_OUT`|`HIDDEN`). 최신순 페이징(`page`/`size`, 기본 1/20).

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "items": [
      {
        "id": "1",
        "sellerId": "1",
        "categoryId": "6",
        "name": "중고 휴대용 초음파 진단기",
        "modelName": "US-200",
        "conditionType": "USED",
        "price": 3500000,
        "status": "PENDING",
        "createdAt": "2026-06-06T01:23:45.000Z"
      }
    ],
    "total": 1, "page": 1, "size": 20
  } }
```
**에러**: 401 / 403(비ADMIN) / 400 `BAD_REQUEST`(status 오타)

---

### PATCH /admin/products/{id}/status — 상품 상태 변경(검수)
**요청**
```json
{ "status": "HIDDEN" }
```
- `status`: `DRAFT` | `PENDING` | `ON_SALE` | `SOLD_OUT` | `HIDDEN`.

**응답 200**: 변경된 상품 요약(id, status, sellerId, categoryId, name, price).
**에러**: 401 / 403 / 404

---

### GET /admin/categories — 카테고리 목록
정렬: `sortOrder` ASC, `id` ASC.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "items": [
      { "id": "1", "name": "치료기기", "parentId": null, "sortOrder": 1 }
    ],
    "total": 9
  } }
```

### POST /admin/categories — 카테고리 생성
**요청**
```json
{ "name": "초음파", "parentId": 6, "sortOrder": 10 }
```
- `name`: 1~50자 (필수). `parentId`/`sortOrder`: 선택.
- 상위 카테고리 존재 시에만 `parentId` 허용 (404).

### PUT /admin/categories/{id} — 카테고리 수정
요청 필드 모두 선택. 자기 자신을 상위로 지정 → 409.

### DELETE /admin/categories/{id} — 카테고리 삭제
**정책**:
- 해당 카테고리를 사용 중인 **상품이 있으면 409 CONFLICT**.
- **하위 카테고리가 있으면 409 CONFLICT**.
- 두 조건 모두 통과해야 hard delete.

**에러**: 401 / 403 / 404 / 409

---

### GET /admin/manufacturers — 제조사 목록
정렬: `sortOrder` ASC, `id` ASC.

### POST /admin/manufacturers — 제조사 생성
**요청**
```json
{ "name": "GE Healthcare", "country": "미국", "sortOrder": 0 }
```

### PUT /admin/manufacturers/{id} — 제조사 수정 / DELETE /admin/manufacturers/{id} — 삭제
**정책**: 현재 스키마에서 `Product` 가 `manufacturerId` FK 를 갖지 않으므로 **참조 무결성 검사 없이 항상 삭제 허용**.
도메인에 제조사 연결이 도입되면 카테고리와 동일한 사용중 검사 추가 예정.

---

### GET /admin/members?role=&status= — 회원 목록
`role`(`BUYER`|`SELLER`|`ADMIN`) / `status`(`ACTIVE`|`SUSPENDED`|`PENDING`) 필터(선택). 최신순 페이징(`page`/`size`, 기본 1/20). **`password` 등 민감정보는 응답에서 제외**.

**응답 200**
```json
{ "success": true, "code": "OK", "message": "OK",
  "data": {
    "items": [
      {
        "id": "2",
        "email": "seller@test.com",
        "name": "김판매",
        "phone": "010-1234-5678",
        "role": "SELLER",
        "status": "ACTIVE",
        "createdAt": "2026-06-01T00:00:00.000Z"
      }
    ],
    "total": 1, "page": 1, "size": 20
  } }
```
**에러**: 401 / 403(비ADMIN) / 400 `BAD_REQUEST`(role/status 오타)

---

### PATCH /admin/members/{id}/status — 회원 정지/해제
**요청**
```json
{ "status": "SUSPENDED" }
```
- `status`: `ACTIVE` | `SUSPENDED` (필수). `PENDING` 으로 되돌리는 건 차단.

처리: `Member.status` 갱신 + 해당 회원에게 `MEMBER_STATUS_CHANGED` 알림.

> ⚠️ 정지 시점에 보유 access 토큰의 강제 무효화는 본 묶음 범위 밖.
> 운영에서는 Redis 블랙리스트에 사용자 단위 차단을 추가하는 후속 작업으로.

**응답 200**: 회원 요약(id, email, name, role, status).
**에러**: 401 / 403 / 404 / 400
