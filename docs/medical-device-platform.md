# 의료기기 유통 플랫폼 (프로젝트명: MediTrade)

> **⚠️ 프로젝트명 안내**: 'MediTrade'로 **잠정 확정**한다. 다만 동일/유사 명칭의 의료기기 업체가 국내외에 다수 존재하므로(예: Meditrade Ltd., Meditrade GmbH 등), **정식 서비스명은 추후 변경될 수 있다.** 현재는 내부 코드네임·문서용 명칭으로 사용하며, 정식 출시 전 상표 검토 후 확정한다.
>
> 의료용 장비를 찾을 때 "아는 사람한테 수소문"하는 방식 대신,
> 검색 → 비교 → 문의 → 거래로 이어지는 **공개된 유통 채널**을 제공하는 B2B 플랫폼
>
> **설계 원칙: API-first / 무상태(stateless) 수평 확장 / 가벼운 런타임 / 웹·앱 클라이언트 분리**

---

## 1. 배경 / 문제 정의

| 구분 | 현재(AS-IS) | 개선(TO-BE) |
| --- | --- | --- |
| 탐색 | 장비를 아는 지인에게 개별 연락, 수소문 | 카테고리/검색으로 한 곳에서 탐색 |
| 정보 | 가격·스펙·재고 정보 비공개, 비대칭 심함 | 스펙·가격대·상태·인증정보 표준화 노출 |
| 신뢰 | 판매자 신원/이력 확인 어려움 | 사업자 인증, 거래/리뷰 이력 공개 |
| 거래 | 전화·메신저로 산발적 진행 | 문의 → 견적 → 거래 흐름 기록 관리 |

핵심 가치: **정보 비대칭 해소 + 신뢰 가능한 매칭**

---

## 2. 비기능 요구사항 (이번 설계의 전제)

| 요구 | 설계 반영 |
| --- | --- |
| 사용자 증가(확장성) | 무상태 API + 로드밸런서 뒤 N대 수평 확장 |
| 가벼움 | SSR 템플릿 제거, 순수 API 서버 + 가벼운 런타임(Node/Go급) |
| 모바일 앱 확장 | 웹·앱이 **동일 REST API** 공유, 클라이언트만 추가 |
| 신뢰/규제 | 사업자·판매업 신고 인증, 거래 기록 보존 |

---

## 3. 아키텍처 (API-first)

```
┌───────────────┐   ┌───────────────┐
│  Web (Next.js)│   │ App (React    │   ← 클라이언트 (화면 담당)
│   React       │   │     Native)   │
└───────┬───────┘   └───────┬───────┘
        │ (HTTPS / JSON, 동일 API 공유)
        ▼                   ▼
        ┌───────────────────────────┐
        │   API Gateway / LB         │   ← 로드밸런서
        └─────────────┬─────────────┘
                      │
        ┌─────────────┴─────────────┐
        │  Backend API (무상태)       │   ← N대 수평 확장
        │  NestJS (추천) / Spring     │      서버 메모리에 세션 X
        └───┬───────────────┬────────┘
            │               │
       ┌────▼────┐     ┌────▼────┐
       │ Redis   │     │PostgreSQL│
       │세션/캐시 │     │ 주 DB    │
       └─────────┘     └─────────┘
            │
       ┌────▼─────────────┐
       │ Object Storage   │  ← 상품 이미지 (S3 등) + CDN
       └──────────────────┘
```

**핵심**: 백엔드는 화면을 그리지 않고 JSON만 반환한다. 웹/앱은 같은 API를 호출하는 별도 클라이언트일 뿐이다.

---

## 4. 기술 스택

### 4.1 추천안 (풀 TypeScript 통일)
| 영역 | 기술 | 이유 |
| --- | --- | --- |
| 백엔드 API | **NestJS (Node.js)** | 가벼움, 수평 확장 용이, 웹·앱과 언어 통일 |
| 웹 | **Next.js (React)** | SEO·초기로딩 + SPA, 백엔드와 타입 공유 |
| 모바일 앱 | **React Native** | 웹과 React 로직/타입 공유, iOS·Android 동시 |
| DB | **PostgreSQL** | 확장성·JSON·전문검색 강점 |
| 캐시/세션 | **Redis** | 무상태 확장의 핵심(세션·토큰·캐시) |
| 인증 | **JWT (access + refresh)** | 서버 무상태 유지 |
| 스토리지 | Object Storage + CDN | 이미지 분리, 서버 부담 ↓ |
| 배포 | Docker 컨테이너 | 수평 확장·오토스케일 기반 |

### 4.2 대안 (백엔드를 Spring으로)
- 백엔드만 **Spring Boot 3.x (REST API 전용, Thymeleaf 미사용)**, 프론트(Next.js)·앱(React Native)은 동일.
- 장점: 익숙함·생태계. 단점: JVM이 상대적으로 무거움(GraalVM Native Image로 경량화 가능).
- **이 경우에도 무상태(JWT+Redis) 원칙은 동일하게 적용.**

> 결정 필요: **백엔드를 NestJS로 갈지, Spring Boot(API 전용)로 갈지**.
> 나머지(Next.js / React Native / PostgreSQL / Redis)는 두 경우 모두 동일.

---

## 5. 확장성 설계 포인트

1. **무상태 서버**: 세션을 서버 메모리에 두지 않음 → 어느 인스턴스가 받아도 처리 가능 → 서버 N대 증설로 트래픽 대응.
2. **세션/토큰은 Redis**: refresh 토큰·로그아웃 블랙리스트·인기 상품 캐시 등.
3. **DB 분리 전략(단계적)**: 초기 단일 DB → 트래픽 증가 시 읽기 복제(Read Replica) → 필요 시 캐시 적극 활용.
4. **이미지·정적 자원**: 서버가 아닌 Object Storage + CDN에서 서빙 → API 서버는 가볍게 유지.
5. **비동기 처리**: 알림·통계·외부 인증 검증 등은 메시지 큐/잡으로 분리(증가 대비).
6. **API 버저닝**: `/api/v1/...` 으로 시작 → 앱은 배포 주기가 다르므로 하위호환 필수.

---

## 6. 타깃 사용자 (역할)

### 6.1 구매자 (Buyer)
- 병의원, 한의원, 치과, 동물병원, 검진센터, 연구실 등 기관 담당자
- 검색, 스펙 비교, 찜, 문의/견적 요청, 거래

### 6.2 판매자 (Seller)
- 제조사, 수입사, 대리점, 중고 매입/판매 업체
- 상품 등록, 재고/가격 관리, 문의 응대, 견적 발송, 거래 처리

### 6.3 관리자 (Admin)
- 회원/사업자 인증 심사, 상품 검수, 카테고리 관리, 신고/분쟁 처리

> ⚠️ **규제**: 의료기기 판매는 「의료기기법」상 **판매업/임대업 신고** 대상.
> 판매자 가입 시 사업자등록증 + 의료기기판매업신고증 검증(초기 수동 심사 → 추후 외부 API 자동화).

---

## 7. 핵심 기능

### 공통
- 회원가입/로그인 (이메일 + 사업자 인증), JWT 발급
- 역할 기반 권한 (BUYER / SELLER / ADMIN)
- 알림 (문의 도착, 견적 발송, 거래 상태 변경) — 웹·앱 푸시 고려

### 구매자
- 카테고리/키워드 검색, 필터(신품·중고, 가격대, 제조사, 지역)
- 상품 상세(스펙·사진·인증정보·판매자정보), 찜, 비교
- 문의/견적 요청, 거래 상태 확인, 거래 후 리뷰

### 판매자
- 상품 등록/수정/삭제(스펙·사진·가격·재고·상태·인증)
- 문의 응대, 견적 발송, 거래 관리, 판매 통계

### 관리자
- 사업자/판매업 신고증 심사, 상품 검수, 카테고리/제조사 마스터, 신고/분쟁 처리

---

## 8. 도메인 모델 (개념)

```
회원(Member) ──< 사업자정보(BusinessInfo)
   │
   ├─(SELLER)─< 상품(Product) ──< 상품이미지(ProductImage)
   │                  │
   │                  └──< 상품스펙(ProductSpec)
   │
   ├─(BUYER)──< 찜(Favorite) >── 상품
   │
   └──< 문의/견적(Inquiry) >──< 견적(Quote)
                 │
                 └──< 거래(Deal) ──< 리뷰(Review)

구매자 ──< 미팅요청(MeetingRequest) >── 판매자
                 └──(선택) 상품(Product)

카테고리(Category) ──< 상품
제조사(Manufacturer) ──< 상품
```

---

## 9. 테이블 설계 (초안, PostgreSQL)

> 타입은 PostgreSQL 기준. PK는 `BIGSERIAL`/`BIGINT`, 상태값은 가능하면 enum 또는 VARCHAR.

### member
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| member_id | BIGSERIAL PK | 회원 ID |
| email | VARCHAR(100) UNIQUE | 로그인 ID |
| password | VARCHAR(255) | 해시 저장 |
| name | VARCHAR(50) | 담당자/대표명 |
| phone | VARCHAR(20) | 연락처 |
| role | VARCHAR(20) | BUYER / SELLER / ADMIN |
| status | VARCHAR(20) | PENDING / ACTIVE / SUSPENDED |
| created_at | TIMESTAMPTZ | 가입일시 |

### business_info
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| business_id | BIGSERIAL PK | |
| member_id | BIGINT FK | member 참조 |
| company_name | VARCHAR(100) | 상호 |
| biz_reg_no | VARCHAR(20) | 사업자등록번호 |
| device_sales_license_no | VARCHAR(50) | 의료기기판매업신고번호(판매자) |
| verify_status | VARCHAR(20) | PENDING / APPROVED / REJECTED |
| created_at | TIMESTAMPTZ | |

### category
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| category_id | BIGSERIAL PK | |
| parent_id | BIGINT NULL | 상위 카테고리(계층) |
| name | VARCHAR(50) | 예: 영상진단, 치료기, 검사장비 |
| sort_order | INT | 정렬 |

### manufacturer
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| manufacturer_id | BIGSERIAL PK | |
| name | VARCHAR(100) | 제조사명 |
| country | VARCHAR(50) | 제조국 |

### product
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| product_id | BIGSERIAL PK | |
| seller_id | BIGINT FK | member(role=SELLER) |
| category_id | BIGINT FK | |
| manufacturer_id | BIGINT FK NULL | |
| name | VARCHAR(200) | 상품명 |
| model_name | VARCHAR(100) | 모델명 |
| condition_type | VARCHAR(20) | NEW / USED / REFURBISHED |
| price | BIGINT NULL | 가격(미정 시 NULL = "문의") |
| price_negotiable | BOOLEAN | 가격 협의 여부 |
| stock | INT | 재고 |
| region | VARCHAR(50) | 보관/판매 지역 |
| description | TEXT | 상세 설명 |
| status | VARCHAR(20) | DRAFT / PENDING / ON_SALE / SOLD_OUT / HIDDEN |
| view_count | INT DEFAULT 0 | 조회수 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### product_image
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| image_id | BIGSERIAL PK | |
| product_id | BIGINT FK | |
| image_url | VARCHAR(500) | Object Storage URL |
| is_main | BOOLEAN | 대표 이미지 |
| sort_order | INT | |

### product_spec (key-value)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| spec_id | BIGSERIAL PK | |
| product_id | BIGINT FK | |
| spec_key | VARCHAR(50) | 예: 출력, 채널수, 인증번호 |
| spec_value | VARCHAR(200) | |

### favorite
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| favorite_id | BIGSERIAL PK | |
| buyer_id | BIGINT FK | member(role=BUYER) |
| product_id | BIGINT FK | |
| created_at | TIMESTAMPTZ | |

### inquiry
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| inquiry_id | BIGSERIAL PK | |
| product_id | BIGINT FK | |
| buyer_id | BIGINT FK | |
| seller_id | BIGINT FK | |
| message | TEXT | 문의 내용 |
| status | VARCHAR(20) | OPEN / QUOTED / CLOSED |
| created_at | TIMESTAMPTZ | |

### quote
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| quote_id | BIGSERIAL PK | |
| inquiry_id | BIGINT FK | |
| quote_price | BIGINT | 제시 가격 |
| valid_until | DATE | 견적 유효기간 |
| memo | TEXT | 조건/비고 |
| created_at | TIMESTAMPTZ | |

### deal
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| deal_id | BIGSERIAL PK | |
| inquiry_id | BIGINT FK | |
| product_id | BIGINT FK | |
| buyer_id | BIGINT FK | |
| seller_id | BIGINT FK | |
| final_price | BIGINT | 최종 거래가 |
| status | VARCHAR(20) | REQUESTED / IN_PROGRESS / COMPLETED / CANCELED |
| created_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ NULL | |

### review
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| review_id | BIGSERIAL PK | |
| deal_id | BIGINT FK | |
| buyer_id | BIGINT FK | |
| seller_id | BIGINT FK | |
| rating | SMALLINT | 1~5 |
| content | TEXT | |
| created_at | TIMESTAMPTZ | |

### meeting_request (미팅 요청, P2)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| meeting_id | BIGSERIAL PK | |
| buyer_id | BIGINT FK | 요청자(구매자) |
| seller_id | BIGINT FK | 대상(판매자) |
| product_id | BIGINT FK NULL | 관련 상품(선택) |
| meeting_type | VARCHAR(20) | ONLINE / VISIT_SELLER / VISIT_BUYER |
| purpose | VARCHAR(100) | 상담/실물확인/데모/설치상담 등 |
| message | TEXT | 요청 메모 |
| location | VARCHAR(200) NULL | 방문 주소 또는 온라인 링크 |
| confirmed_at | TIMESTAMPTZ NULL | 확정 일시 |
| status | VARCHAR(25) | REQUESTED / ACCEPTED / REJECTED / RESCHEDULE_PROPOSED / CONFIRMED / COMPLETED / CANCELED |
| created_at | TIMESTAMPTZ | |

### meeting_slot (미팅 희망/제안 일시, P2)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| slot_id | BIGSERIAL PK | |
| meeting_id | BIGINT FK | meeting_request 참조 |
| proposed_at | TIMESTAMPTZ | 희망/제안 일시 |
| proposed_by | VARCHAR(10) | BUYER / SELLER (누가 제안했는지) |
| is_selected | BOOLEAN | 확정 일시 여부 |

---

## 10. 거래 상태 흐름

```
[구매자] 상품 탐색
   │ 문의/견적 요청
   ▼
inquiry(OPEN)
   │ [판매자] 견적 발송
   ▼
inquiry(QUOTED) + quote 생성
   │ [구매자] 수락 → 거래 생성
   ▼
deal(REQUESTED) → IN_PROGRESS → COMPLETED
                              └→ CANCELED
   │ COMPLETED 후
   ▼
review 작성
```

---

## 11. API 설계 (REST, 웹·앱 공용)

> 모든 응답은 공통 포맷 `{ success, code, message, data }` 로 통일.
> Base path: `/api/v1`

| Method | URI | 설명 | 권한 |
| --- | --- | --- | --- |
| POST | `/auth/signup` | 회원가입 | 공개 |
| POST | `/auth/login` | 로그인(JWT 발급) | 공개 |
| POST | `/auth/refresh` | 액세스 토큰 재발급 | refresh |
| GET | `/products` | 상품 목록(검색/필터/페이징) | 공개 |
| GET | `/products/{id}` | 상품 상세 | 공개 |
| POST | `/products` | 상품 등록 | SELLER |
| PUT | `/products/{id}` | 상품 수정 | SELLER |
| POST | `/favorites` | 찜 추가 | BUYER |
| POST | `/inquiries` | 문의/견적 요청 | BUYER |
| POST | `/inquiries/{id}/quotes` | 견적 발송 | SELLER |
| POST | `/deals` | 거래 생성 | BUYER |
| PATCH | `/deals/{id}/status` | 거래 상태 변경 | BUYER/SELLER |
| POST | `/reviews` | 리뷰 작성 | BUYER |

---

## 12. 화면 구성 (웹·앱 공통)

| 영역 | 화면 |
| --- | --- |
| 공통 | 로그인, 회원가입(역할 선택), 사업자 인증 등록 |
| 구매자 | 메인/검색, 상품목록(필터), 상품상세, 찜, 내 문의/견적, 거래 내역 |
| 판매자 | 상품 등록/수정, 내 상품 목록, 받은 문의/견적 발송, 거래 관리, 판매 통계 |
| 관리자 | 회원/사업자 심사, 상품 검수, 카테고리/제조사 관리, 신고 처리 |

> 앱은 구매자/판매자 위주, 관리자 기능은 웹 전용으로 두는 것이 일반적.

---

## 13. 개발 로드맵

### Phase 1 — MVP
- API 서버(무상태) + JWT 인증 + Redis 세션
- 회원/역할/사업자 인증(수동 심사)
- 상품 CRUD + 이미지 업로드(Object Storage)
- 검색/필터, 문의 → 견적 → 거래 → 리뷰
- **웹(Next.js) 먼저 출시**

### Phase 2 — 모바일 + 신뢰
- React Native 앱 출시(동일 API 사용)
- 푸시 알림, 판매자 평점/거래 이력
- 상품 비교, 찜 가격변동 알림, 관리자 검수 워크플로우

### Phase 3 — 확장
- 사업자/판매업 신고증 외부 API 자동 검증
- 읽기 복제·캐시 강화, 통계 대시보드, 유사 장비 추천
- 결제/에스크로, A/S·설치·임대 거래 유형 분기

---

## 14. 의료기기 특화 고려사항

- **규제**: 판매업 신고 검증, 광고/표시 규정(허위·과장 금지)
- **인증정보**: 식약처 품목허가번호(인증번호)를 상품 스펙으로 노출
- **상태 구분**: 신품/중고/리퍼 + 사용 연식, A/S 가능 여부
- **부가 정보**: 설치 필요 여부, 운송/철거 조건, 임대 가능 여부
- **분쟁 대비**: 거래 기록 보존, 신고/차단, 약관 동의 이력
