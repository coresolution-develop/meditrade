# PHASE 1 작업지시서 — 백엔드(NestJS) 인증 + 상품 CRUD

> Claude Code 실행용. **규칙은 `CLAUDE.md`, 구체 코드는 `backend-phase1-setup.md`를 참조한다.**
> 아래 단계를 **순서대로** 진행하고, 각 단계의 "검증"을 통과한 뒤 다음으로 넘어간다.

---

## 목표

`apps/api`에 회원가입·로그인(JWT)·상품 CRUD가 동작하는 NestJS API 서버를 만든다.
모든 응답은 `{ success, code, message, data }` 포맷이고, 인증/권한이 적용된다.

## 완료 기준 (Definition of Done)

이 8개가 모두 충족되면 Phase 1 완료다.

0. `docker compose up -d`로 PostgreSQL이 떠 있고 `healthy` 상태다.
1. `npm run build`, `npm run lint`가 에러 없이 통과한다.
2. 서버가 `http://localhost:3001/api/v1`에서 기동된다.
3. `POST /auth/signup`로 SELLER 계정을 만들 수 있다.
4. `POST /auth/login`이 `data.accessToken`을 반환한다.
5. 토큰 없이 `POST /products` 호출 시 401 `UNAUTHORIZED`를 반환한다.
6. SELLER 토큰으로 상품을 생성/조회/수정/삭제할 수 있고, 남의 상품 수정 시 403 `FORBIDDEN`을 반환한다.
7. 잘못된 입력은 400 `VALIDATION_ERROR`로 응답하며, 모든 응답이 공통 포맷을 따른다.

---

## 단계별 작업

### Step 0 — 사전 확인 & DB 기동
- Node.js 버전이 20 LTS 이상인지 확인(`node -v`), Docker가 설치돼 있는지 확인(`docker -v`).
- **DB를 먼저 띄운다**: 프로젝트 루트에서 `docker compose up -d` 실행.
- DB가 준비됐는지 확인: `docker compose ps`에서 postgres가 `healthy` 상태인지 확인.
- `.env.example`을 `apps/api/.env`로 복사하고 `JWT_ACCESS_SECRET`을 긴 랜덤 문자열로 교체한다. `.env`는 `.gitignore`에 포함(커밋 금지).
- 작업 디렉토리는 `apps/api`. 없으면 Step 1에서 생성.
- **검증**: `docker compose ps` 에서 postgres `healthy`, `apps/api/.env` 존재.

### Step 1 — 프로젝트 생성 & 의존성 (버전 고정)
- `apps/api`에 NestJS 11 프로젝트를 생성한다.
- `backend-phase1-setup.md`의 "2. 프로젝트 초기화" 명령을 따르되, **Prisma는 6.x로 설치**한다(`prisma@^6.19.0 @prisma/client@^6.19.0`). **v7 금지.**
- **검증**: `npm run build` 통과, `npm run start:dev`로 빈 서버 기동 확인 후 종료.

### Step 2 — Prisma 스키마 & 마이그레이션 & 시드
- `backend-phase1-setup.md`의 "4. Prisma 스키마"를 그대로 작성(Member / Category / Product / ProductImage, enum 포함).
- generator는 `prisma-client-js`를 사용한다.
- `npx prisma migrate dev --name init` → `npx prisma generate`.
- **시드**: `prisma/seed.ts`(제공됨)를 두고, `apps/api/package.json`에 `"prisma": { "seed": "ts-node prisma/seed.ts" }` 추가, `npm i -D ts-node` 후 `npx prisma db seed` 실행.
- **검증**: 마이그레이션 성공, `node_modules/.prisma/client` 생성, 시드로 카테고리 9개·테스트계정 2개·샘플상품 3건 생성 확인.

### Step 3 — Prisma 모듈
- `backend-phase1-setup.md` "5"의 `PrismaService` / `PrismaModule`(@Global) 작성.
- **검증**: `npm run build` 통과.

### Step 4 — 공통(응답 포맷 / 인터셉터 / 예외 필터)
- `backend-phase1-setup.md` "6"의 `api-response.ts`, `response.interceptor.ts`, `all-exceptions.filter.ts` 작성.
- `backend-phase1-setup.md` "7"의 `main.ts` 전역 설정(prefix `api/v1`, ValidationPipe, 인터셉터, 예외필터, CORS, TZ) 적용.
- **검증**: `npm run build` 통과, 서버 기동 시 `/api/v1` prefix 적용 확인.

### Step 5 — Auth 모듈 (회원가입·로그인·JWT)
- `backend-phase1-setup.md` "8"의 DTO / `AuthService` / `JwtStrategy` / `JwtAuthGuard` / `RolesGuard` / `AuthController` / `AuthModule` 작성.
- `.env`에 `JWT_ACCESS_SECRET`(긴 랜덤 문자열), `DATABASE_URL` 설정. `.env`는 `.gitignore`에, `.env.example`은 placeholder로.
- **검증**:
  - `POST /api/v1/auth/signup` (role=SELLER) → `success:true`
  - `POST /api/v1/auth/login` → `data.accessToken` 수신
  - 잘못된 바디 → 400 `VALIDATION_ERROR`

### Step 6 — Product 모듈 (CRUD + 권한)
- `backend-phase1-setup.md` "9"의 DTO / `ProductService`(serialize 포함) / `ProductController` / `ProductModule` 작성.
- 생성/수정/삭제는 `@Roles('SELLER')` 보호, 수정/삭제는 본인 상품만.
- `AppModule`에 `ProductModule` 등록(`backend-phase1-setup.md` "10").
- **검증**:
  - 토큰 없이 `POST /products` → 401 `UNAUTHORIZED`
  - SELLER 토큰으로 생성 → 201, 목록/상세 조회 정상
  - 남의 상품 수정 → 403 `FORBIDDEN`
  - 없는 상품 조회 → 404 `NOT_FOUND`

### Step 7 — 최종 검증
- `backend-phase1-setup.md` "11. 실행 & 검증 체크리스트" 전 항목 통과.
- 위 "완료 기준(DoD)" 8개 전부 확인.
- README에 실행 방법(설치 → migrate → start:dev)과 주요 엔드포인트를 정리.

---

## 진행 원칙

- 한 Step이 끝나면 **반드시 `npm run build`로 검증**하고, 통과 후 다음 Step으로 간다.
- 코드가 `backend-phase1-setup.md`와 다를 경우, **레퍼런스 문서를 기준**으로 한다(임의 변경 금지).
- `CLAUDE.md`의 "하지 말 것"을 위반하지 않는다(범위 확장·v7·시크릿 노출 등).
- 막히면 임의로 우회·확장하지 말고 멈추고 보고한다.
