# apps/web/CLAUDE.md — MediTrade 웹 (Claude Code 작업 규칙)

이 파일은 Claude Code가 `apps/web`(Next.js)에서 작업할 때 따르는 규칙이다.
**작업 전 `WEB-PHASE1-TASKS.md`(작업 순서), `screen-spec.md`(화면), `api-spec.md`(API 계약)를 함께 읽는다.**

> 배치 위치: `apps/web/CLAUDE.md`. 루트 `CLAUDE.md`는 백엔드(`apps/api`)용이다.

---

## 프로젝트 개요

MediTrade(잠정명) 웹 클라이언트. 백엔드 REST API(`/api/v1`)를 호출하는 Next.js 앱.
이번 범위는 **웹 Phase 1**: 로그인·회원가입·상품목록/검색·상품상세·내상품·상품등록/수정·마이페이지.

## 작업 범위(Scope)

- **`apps/web` 디렉토리만** 다룬다. 백엔드(`apps/api`)는 수정하지 않는다.
- 화면은 **`screen-spec.md`의 P1 화면**(COM-001~005, BUY-001/002, SEL-001/002)까지만.
- API 요청/응답은 **`api-spec.md` 계약을 그대로** 따른다(필드명·구조 임의 변경 금지).
- 범위 밖(찜·문의·미팅·거래 등 P2) 화면은 만들지 않는다.

---

## 기술 스택 & 버전 고정

| 항목 | 버전 | 비고 |
| --- | --- | --- |
| Node.js | 20 LTS 이상 | |
| Next.js | `^16.2.0` | App Router, React 19 |
| React | `^19.0.0` | |
| TypeScript | `^5.4.0` | |
| 스타일 | Tailwind CSS `^4.0.0` | create-next-app 옵션으로 설치 |
| 데이터 패칭 | fetch 래퍼(기본) | 필요 시 TanStack Query 도입 검토 |
| 패키지 매니저 | npm | |

- `create-next-app`은 **App Router + TypeScript + Tailwind** 옵션으로 생성한다.
- 보안 패치가 잦으므로 `next`는 최신 16.2.x 패치로 설치한다.

---

## 빌드 / 실행 / 검증 (기준 디렉토리: apps/web)

```bash
npm install
npm run dev      # http://localhost:3000 (백엔드 3001 가동 상태에서)
npm run build    # 타입/빌드 에러 0  ← 각 Step 검증
npm run lint     # lint 에러 0
```

- 백엔드(`apps/api`)가 `http://localhost:3001` 에서 떠 있어야 화면 연동이 검증된다.

---

## 코드 규칙

1. **폴더 구조(App Router)**:
   - `app/` 라우트(페이지/레이아웃), `app/(auth)/login`, `app/(auth)/signup`, `app/products`, `app/products/[id]`, `app/seller/products`, `app/seller/products/new`, `app/mypage`
   - `lib/` API 클라이언트·토큰 유틸, `components/` 공용 컴포넌트, `types/` API 타입
2. **API 클라이언트 단일화**: `lib/api.ts`에 fetch 래퍼를 두고, base URL은 `NEXT_PUBLIC_API_BASE_URL` 환경변수로. 모든 호출은 이 래퍼를 통한다.
3. **응답 처리**: 응답은 `{ success, code, message, data }`. 래퍼에서 `success=false`면 `code`/`message`로 에러를 던지고, 화면은 `message`를 노출한다.
4. **타입**: `api-spec.md` 응답 구조에 맞춘 타입을 `types/`에 정의. 서버 BigInt PK는 문자열이므로 `id`는 `string`.
5. **인증/토큰**:
   - 로그인 성공 시 accessToken 저장. **localStorage/sessionStorage 사용 금지**(아티팩트 제약 및 보안) — httpOnly 쿠키 또는 메모리+서버 라우트 핸들러 경유를 우선.
   - 보호 라우트(판매자 화면)는 미인증 시 `/login`으로 리다이렉트.
6. **상태/로딩/에러**: 목록·상세는 로딩 스켈레톤, 액션 버튼은 로딩 중 비활성화. 에러는 토스트/필드 메시지.
7. **가격 표기**: `price === null`이면 "가격 문의", `priceNegotiable`면 "협의 가능" 뱃지.
8. **디자인**: `screen-spec.md`의 구성요소·UX 규칙을 따른다. 과한 장식 없이 명확하고 접근성(터치 44px, 라벨/포커스) 준수.

## 하지 말 것 (DO NOT)

- 백엔드 코드 수정, 범위 밖(P2) 화면 생성.
- `api-spec.md` 계약 우회(임의 필드/엔드포인트).
- `localStorage`/`sessionStorage`에 토큰 저장.
- 시크릿 하드코딩(`NEXT_PUBLIC_`에는 공개 가능한 값만).
- 검증(`npm run build`) 미통과 상태로 다음 Step 진행.
