# WEB PHASE 1 작업지시서 — 웹(Next.js) 인증 + 상품

> Claude Code 실행용. **규칙은 `apps/web/CLAUDE.md`, 화면은 `screen-spec.md`, API 계약은 `api-spec.md`를 참조한다.**
> 각 Step의 "검증"을 통과한 뒤 다음으로 넘어간다. 백엔드(`apps/api`)는 수정하지 않는다.

---

## 목표

`apps/web`에 백엔드 API(`/api/v1`)와 연동되는 화면을 만든다:
로그인·회원가입·상품목록/검색·상품상세·내상품 목록·상품등록/수정·마이페이지.

## 사전 조건
- 백엔드 Phase 1이 완료되어 `http://localhost:3001/api/v1` 에서 동작(시드 포함).
- 테스트 계정: seller@test.com / buyer@test.com (비밀번호 test1234).

## 완료 기준 (Definition of Done)
1. `npm run build`, `npm run lint` 에러 없이 통과.
2. `/login`에서 테스트 계정으로 로그인 → 토큰 저장 → 역할별 진입.
3. `/products`에서 시드 상품 목록·검색이 표시된다.
4. `/products/[id]`에서 상세(스펙·이미지 자리·가격/"가격 문의")가 표시된다.
5. 판매자 로그인 후 `/seller/products`에서 본인 상품 목록, `/seller/products/new`에서 등록이 동작한다.
6. 미인증 상태로 판매자 화면 접근 시 `/login`으로 리다이렉트된다.
7. API 실패 시 `message` 기반 에러 노출, 로딩 상태 표시.

---

## 단계별 작업

### Step 0 — 사전 확인
- 백엔드가 3001에서 가동 중인지 확인.
- 작업 디렉토리 `apps/web`.

### Step 1 — 프로젝트 생성 & 환경
- `create-next-app`으로 `apps/web` 생성: **App Router + TypeScript + Tailwind + ESLint**.
- Next.js `^16.2.0`로 고정.
- `.env.local`에 `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1`.
- **검증**: `npm run dev` 기동, `npm run build` 통과.

### Step 2 — API 클라이언트 & 타입
- `lib/api.ts`: fetch 래퍼(공통 헤더, 토큰 주입, `{success,code,message,data}` 처리, 실패 시 에러 throw).
- `types/`: `api-spec.md` 기준 타입(Member, Product, ProductList 등). `id`는 `string`.
- **검증**: `npm run build` 통과.

### Step 3 — 인증 (로그인/회원가입)
- `app/(auth)/login`: 화면 COM-002. `POST /auth/login` 연동, 토큰 저장(localStorage 금지), 역할별 리다이렉트.
- `app/(auth)/signup`: 화면 COM-003. 역할 선택 + `POST /auth/signup`.
- 보호 라우트 가드(미인증 → /login) 유틸 작성.
- **검증**: 테스트 계정 로그인 성공, 잘못된 입력 시 에러 메시지, 가입 동작.

### Step 4 — 상품 목록/검색 + 상세
- `app/products`: 화면 BUY-001/COM-001. `GET /products?page=&size=&keyword=` 연동, 카드 그리드, 검색, 페이징/더보기, 빈 상태.
- `app/products/[id]`: 화면 BUY-002. `GET /products/{id}`, 가격 표기 규칙, 404 처리.
- **검증**: 시드 상품 노출, 검색 동작, 상세 진입, 가격 null="가격 문의".

### Step 5 — 판매자: 내 상품 + 등록/수정
- `app/seller/products`: 화면 SEL-001. 본인 상품 목록(+삭제 확인 모달 → `DELETE /products/{id}`).
- `app/seller/products/new` 및 `[id]/edit`: 화면 SEL-002. `POST /products` / `PUT /products/{id}`, 카테고리 select, 검증 메시지.
- **검증**: 판매자 토큰으로 등록/수정/삭제, 미SELLER 접근 차단, 400 필드 메시지.

### Step 6 — 마이페이지 & 공통 컴포넌트
- `app/mypage`: 화면 COM-004. 역할별 메뉴, 로그아웃(토큰 제거 → 홈).
- 공용 컴포넌트: 상품 카드, 상태 뱃지, 토스트, 빈 상태, 로딩 스켈레톤, 폼 필드+에러.
- **검증**: 역할별 메뉴 노출, 로그아웃 동작.

### Step 7 — 최종 검증
- DoD 7개 전부 확인.
- `npm run build` / `npm run lint` 통과.
- 백엔드 가동 상태에서 로그인 → 목록 → 상세 → (판매자)등록까지 happy-path 확인.

---

## 진행 원칙
- Step마다 `npm run build` 검증 후 다음으로.
- `api-spec.md` 계약을 임의 변경하지 않는다(불일치 발견 시 멈추고 보고).
- `apps/web/CLAUDE.md`의 "하지 말 것" 준수(범위 밖 화면·토큰 저장 방식·계약 우회 금지).
