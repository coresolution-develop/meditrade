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
    "member": { "id": "1", "email": "buyer@test.com", "name": "홍길동", "role": "BUYER" }
  } }
```
**에러**: 401 `UNAUTHORIZED`("이메일 또는 비밀번호가 올바르지 않습니다." — 계정 존재 여부 비노출)

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

## 4. Phase 2 엔드포인트 (개요)

> 확정 시 위와 동일한 형식으로 상세화한다. 모두 공통 응답 포맷·인증 헤더를 따른다.

| Method | URI | 설명 | 권한 |
| --- | --- | --- | --- |
| POST | `/business-info` | 사업자 정보 등록 | SELLER |
| POST | `/favorites` | 찜 추가 | BUYER |
| DELETE | `/favorites/{productId}` | 찜 해제 | BUYER |
| POST | `/inquiries` | 문의/견적 요청 | BUYER |
| POST | `/inquiries/{id}/quotes` | 견적 발송 | SELLER |
| **POST** | **`/meetings`** | **미팅 요청** | **BUYER** |
| **GET** | **`/meetings?role=buyer\|seller`** | **미팅 목록** | **인증** |
| **PATCH** | **`/meetings/{id}`** | **미팅 응답/확정/취소(상태 변경)** | **BUYER/SELLER** |
| POST | `/deals` | 거래 생성 | BUYER |
| PATCH | `/deals/{id}/status` | 거래 상태 변경 | BUYER/SELLER |
| POST | `/reviews` | 리뷰 작성 | BUYER |

### (미리보기) POST /meetings — 미팅 요청 요청 바디
```json
{
  "sellerId": 2,
  "productId": 1,
  "meetingType": "VISIT_BUYER",
  "purpose": "실물확인",
  "preferredSlots": ["2026-06-10T14:00:00+09:00", "2026-06-11T10:00:00+09:00"],
  "location": "전북 전주시 ...",
  "message": "설치 공간 확인 겸 방문 부탁드립니다."
}
```
- `meetingType`: `ONLINE` | `VISIT_SELLER` | `VISIT_BUYER`
- `preferredSlots`: 1~3개, 미래 시점

### (미리보기) PATCH /meetings/{id} — 상태 변경
```json
{ "status": "ACCEPTED", "selectedSlot": "2026-06-10T14:00:00+09:00" }
```
- 판매자: `ACCEPTED`(+selectedSlot) / `REJECTED` / `RESCHEDULE_PROPOSED`(+제안 슬롯)
- 양측: `CONFIRMED` / `CANCELED` / `COMPLETED`
