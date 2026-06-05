# CLAUDE.md — MediTrade 백엔드 (Claude Code 작업 규칙)

이 파일은 Claude Code가 이 저장소에서 작업할 때 따르는 규칙이다.
**작업을 시작하기 전에 `PHASE1-TASKS.md`(작업 순서·완료 기준)와 `backend-phase1-setup.md`(코드 레퍼런스)를 함께 읽는다.**

---

## 프로젝트 개요

의료기기 B2B 유통 플랫폼. API-first 구조(웹·앱이 동일 REST API 공유).
프로젝트명 'MediTrade'는 **잠정 명칭**이다(동명 업체 존재로 정식 서비스명은 추후 변경 가능). 내부 식별자(패키지·DB·컨테이너 이름 등)는 `meditrade`로 유지한다.
이번 작업 대상은 **백엔드 API(`apps/api`) Phase 1**: 인증(회원가입·로그인·JWT) + 상품 CRUD.

## 작업 범위(Scope) — 중요

- **`apps/api` 디렉토리만** 다룬다. `apps/web`, `apps/mobile`, `packages/*`는 이번에 만들지 않는다.
- **`PHASE1-TASKS.md`에 명시된 범위까지만** 구현한다. 문의/견적/거래/사업자인증 등 다음 단계 기능은 **만들지 않는다**.
- 범위가 모호하면 임의 확장하지 말고 멈추고 질문한다.

---

## 기술 스택 & 버전 고정 (반드시 준수)

| 항목 | 버전 | 비고 |
| --- | --- | --- |
| Node.js | 20 LTS 이상 | Prisma 6 최소 20.9.0 |
| @nestjs/cli, @nestjs/* | `^11.0.0` | v11 라인 |
| prisma, @prisma/client | `^6.19.0` | **v7 설치 금지**(ESM 전환으로 NestJS 11과 마찰) |
| TypeScript | `^5.4.0` | |
| 패키지 매니저 | npm | package-lock.json 커밋 |
| PostgreSQL | 16 (docker) | `docker-compose.yml` 로 로컬 기동 |

- 설치 시 `@latest`를 쓰지 말고 위 버전 범위를 따른다. 특히 **`prisma@7` / `@prisma/client@7`은 설치하지 않는다.**
- Prisma generator는 `provider = "prisma-client-js"`(v6 스타일)를 사용한다.

---

## 빌드 / 실행 / 검증 명령

```bash
# 0) DB 먼저 띄우기 (프로젝트 루트)
docker compose up -d
docker compose ps          # postgres 가 healthy 인지 확인

# --- 이하 기준 디렉토리: apps/api ---

# 설치
npm install

# Prisma
npx prisma generate
npx prisma migrate dev --name <설명>

# 개발 서버 (http://localhost:3001/api/v1)
npm run start:dev

# 검증 (작업 단위마다 실행)
npm run build      # 타입/컴파일 에러 0
npm run lint       # lint 에러 0
```

- **각 작업 단계가 끝날 때마다 `npm run build`가 에러 없이 통과해야 한다.** 통과 못 하면 다음 단계로 넘어가지 않는다.

---

## 코드 규칙

1. **패키지 구조**: 기능별 모듈(`auth`, `product`) + 공통(`common`) + `prisma`. 모듈은 `controller / service / dto`로 분리.
2. **응답 포맷 통일**: 모든 응답은 `{ success, code, message, data }`. 성공은 `ResponseInterceptor`가 자동 래핑, 실패는 `AllExceptionsFilter`가 처리. 컨트롤러는 데이터만 반환한다.
3. **HTTP 상태/코드 매핑**:
   - 검증 실패 → 400 / `VALIDATION_ERROR`
   - 잘못된 요청 → 400 / `BAD_REQUEST`
   - 인증 실패 → 401 / `UNAUTHORIZED`
   - 권한 없음 → 403 / `FORBIDDEN`
   - 없음 → 404 / `NOT_FOUND`
   - 충돌(중복 등) → 409 / `CONFLICT`
   - 그 외 → 500 / `INTERNAL_ERROR`
4. **DTO**: 요청 검증은 `class-validator`. 엔티티를 그대로 응답에 노출하지 않는다.
5. **BigInt 직렬화**: Prisma의 `BigInt` PK는 JSON 직렬화가 안 되므로, 응답 전에 `string`(또는 숫자)으로 변환한다(`serialize()` 헬퍼 사용).
6. **인증**: JWT 무상태. 비밀번호는 `bcrypt`로 해시. 액세스 토큰 시크릿은 `.env`의 `JWT_ACCESS_SECRET`에서만 읽는다.
7. **권한**: 상품 생성/수정/삭제는 `@Roles('SELLER')` + 가드로 보호. 수정/삭제는 본인 상품만 가능.
8. **로깅**: 500 에러는 stacktrace 포함. 사용자 메시지와 로그 메시지를 분리하고, 응답 메시지에 내부 상세를 노출하지 않는다.
9. **시간대**: `Asia/Seoul`. 날짜 응답 포맷은 명시한다.

## 보안 (DO NOT)

- `.env`, 시크릿, 비밀번호, 토큰, DB 접속정보를 **코드/로그/응답/커밋에 노출하지 않는다.**
- `.env`는 `.gitignore`에 포함하고, 예시는 `.env.example`로 둔다(값은 placeholder).
- 로그인 실패 시 계정 존재 여부가 드러나는 메시지를 쓰지 않는다(메시지 통일).

## 하지 말 것 요약

- 범위 밖 모듈/기능 생성 금지(문의·견적·거래·사업자인증 등).
- Prisma v7 설치 금지.
- 엔티티 직접 응답 금지, 응답 포맷 우회 금지.
- 시크릿 하드코딩 금지.
- 검증(`npm run build`) 미통과 상태로 진행 금지.
