# MediTrade — 의료기기 유통 플랫폼

> **⚠️ 프로젝트명 안내**: 'MediTrade'는 **잠정 명칭**이다. 동명 의료기기 업체가 다수 존재하므로 정식 서비스명은 추후 변경될 수 있다. 내부 식별자(패키지·DB·컨테이너)는 `meditrade`로 유지한다.

의료용 장비를 "아는 사람에게 수소문"하지 않고, 검색 → 비교 → 문의/미팅 → 거래로 잇는 **B2B 유통 플랫폼**.
API-first 구조로 웹(Next.js)과 모바일 앱(React Native)이 동일 REST API를 공유한다.

---

## 문서 인덱스

| 문서 | 내용 |
| --- | --- |
| `medical-device-platform.md` | 기획·아키텍처·도메인·테이블 설계 |
| `functional-spec.md` | 기능 정의서(기능 목록·권한·상태값) |
| `screen-spec.md` | 화면 정의서(화면 목록·흐름·상세) |
| `api-spec.md` | API 명세서(요청/응답 JSON) |
| `CLAUDE.md` | Claude Code 작업 규칙(백엔드) |
| `PHASE1-TASKS.md` | 백엔드 Phase 1 작업지시서 |
| `PHASE2-TASKS.md` | 백엔드 Phase 2 작업지시서(사업자·찜·문의·미팅·거래·리뷰·알림·관리자) |
| `backend-phase1-setup.md` | 백엔드 코드 레퍼런스 |
| `WEB-PHASE1-TASKS.md` | 웹(Next.js) Phase 1 작업지시서 |
| `apps/web/CLAUDE.md` | Claude Code 작업 규칙(웹) |

---

## 모노레포 구조

```
medi-trade/
├─ apps/
│  ├─ api/            # NestJS 백엔드
│  │  └─ prisma/seed.ts
│  ├─ web/            # Next.js 웹
│  └─ mobile/         # React Native (추후)
├─ docker-compose.yml # 로컬 PostgreSQL
├─ .env.example
└─ README.md
```

---

## 빠른 시작 (백엔드 Phase 1)

```bash
# 1) DB 기동 (루트)
docker compose up -d
docker compose ps                 # postgres healthy 확인
# 호스트에 이미 5432 점유 시 docker-compose.yml 의 호스트 포트를 5433 등으로 조정
#   (이 저장소는 5433 으로 운용 중. DATABASE_URL 도 5433)

# 2) 백엔드
cd apps/api
cp ../../.env.example .env         # JWT_ACCESS_SECRET 를 랜덤 문자열로 교체
npm install

# 최초 1회: prisma migrate dev 가 shadow DB 를 만들 수 있도록 권한 부여
docker exec meditrade-postgres psql -U meditrade -d meditrade -c "ALTER USER meditrade CREATEDB;"

npx prisma migrate dev --name init
npx prisma generate

# 3) 시드 (카테고리/테스트계정/샘플상품)
npx prisma db seed

# 4) 실행 → http://localhost:3001/api/v1
npm run start:dev

# 검증
npm run build      # 타입/컴파일 에러 0
npm run lint       # lint 에러 0
```

### 주요 엔드포인트 (Phase 1)
| Method | URI | 권한 |
| --- | --- | --- |
| POST | `/api/v1/auth/signup` | 공개 |
| POST | `/api/v1/auth/login` | 공개 |
| GET  | `/api/v1/products` | 공개 |
| GET  | `/api/v1/products/:id` | 공개 |
| POST | `/api/v1/products` | SELLER |
| PUT  | `/api/v1/products/:id` | SELLER(본인) |
| DELETE | `/api/v1/products/:id` | SELLER(본인) |

### 테스트 계정 (시드)
| 역할 | 이메일 | 비밀번호 |
| --- | --- | --- |
| 판매자 | seller@test.com | test1234 |
| 구매자 | buyer@test.com | test1234 |

> ⚠️ 시드 계정·비밀번호는 **로컬 개발 전용**. 운영 환경에 시드하지 말 것.

### package.json 시드 설정 (apps/api/package.json)
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## 기술 스택 (버전 고정)

| 영역 | 기술 | 버전 |
| --- | --- | --- |
| 백엔드 | NestJS | `^11.0.0` |
| ORM | Prisma | `^6.19.0` (**v7 금지** — ESM 전환) |
| DB | PostgreSQL | 16 (docker) |
| 웹 | Next.js | `^16.2.0` (App Router, React 19) |
| 앱 | React Native | (추후) |
| 런타임 | Node.js | 20 LTS 이상 |

---

## Phase 진행 상황

- **P1 (MVP)**: 인증(회원가입·로그인·JWT) + 상품 CRUD + 검색 — 백엔드 골격 준비 완료
- **P2 (확장)**: 사업자 인증, 찜, 문의·견적, **미팅 요청**, 거래, 리뷰, 관리자, 알림
- **P3 (고도화)**: 외부 인증 API, 결제/에스크로, 추천, 푸시, 분쟁처리

---

## Claude Code로 진행하기

1. 백엔드: `"PHASE1-TASKS.md 순서대로 Phase 1 구현. 규칙은 CLAUDE.md, 코드는 backend-phase1-setup.md 참조."`
2. 웹: `"WEB-PHASE1-TASKS.md 순서대로 구현. 규칙은 apps/web/CLAUDE.md, 화면은 screen-spec.md, API는 api-spec.md 참조."`

> 한 번에 전체를 시키지 말고 **Phase·앱 단위로 끊어서** 진행하고, 각 Step마다 빌드 검증을 통과시킨다.
