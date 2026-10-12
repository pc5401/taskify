# BE OUTBOX

최신이 위다. 지우지 않는다.

## 2026-10-12 BE 격리 PostgreSQL 및 LAST_OWNER 복구

TO: manager, qa, fe
RE: 승인 격리 DB 범위 및 실제 Owner 오류 복구

- cf2f5ae 반영. 기존01c8 embedded PG18.4 binaries 읽기 재사용,새 UUID data/loopback55432/
  taskify_validation 및 기존2 migration 실제 적용. 설치/기존 사용자 DB 변경 없음.
- 실검증에서 deferred COMMIT23514 LAST_OWNER가 Prisma5.22 호출자에 전파되지 않고 결과값 반환.
  TransactionsService 작업 뒤 named boards_require_owner만 IMMEDIATE 검증하여 commit전에 감지.
  해당query P2010/23514 exact LAST_OWNER/ERROR: LAST_OWNER만409로 번역. 다른 CHECK/error 일반화없음.
- 최종 build PASS,7 suites/40 tests PASS,실제 DB11/11 PASS: migration2/FK5의422/행불변,
  Owner삽입/강등409와persistedrollback,부분생성rollback,반대의존동시1성공1cycle 및version확인.
- lifecycle scripts prepare은 origin3002/API3301/live DBgate/BFF3002/3003 재현 및 기존secret보존.
  재개 시 stopped/direct ECONNREFUSED 확인 후 기존data만 재시작. init/reset/delete 재실행없음.
- 상세 근거 agents/be/LIVE-DB-REPORT.md 및 apps/api/README.md. Fixtures/data 보존.
  DB QA용 유지, API현재 unavailable. 최종 pg_ctl fast stop은 부모 조율 이후이며 data보존.
  내부 transaction 통과이며 미구현 업무 HTTP/전체 QA 인수로 승격하지 않음.


## 2026-10-12 BE auth/me/boards HTTP 연결

TO: manager, qa, fe
RE: BOARD HTTP 배치, QA auth-boards-http HTTP001~011, 통합915f545 계약보완

- 선행 QA a65ad25 읽은 후915f545를 fast-forward하여 구현. register201/login200/refresh200/logout204,
  GETme200, GETboards200/POSTboards201 연결. prefix /v1, 보호 me/boards/logout 모두 SessionGuard.
- 공개 auth는 accessToken/refreshToken/user만. refresh 필수 user 포함. User/Board explicit serializer로
  passwordHash, session/history/hash 제외. AppModule auth 모듈 연결; AUTH_JWT_SECRET 최소32bytes 필수.
- class-validator 기존 DTO 제약 및 global422 INVALID_INPUT code/message/details. unknown key 별도거부없음.
  이메일 trim/lowercase 없이 저장/조회; 형식검증 유지. nickname/password 추가 제품 제한 없음.
  register user+initialsession 단일 transaction; P2002 user email409 EMAIL_TAKEN.
- PasswordService async Node scrypt-v1, random16byte salt,64byte key,N16384/r8/p1,maxmem64MiB,
  timingSafeEqual. bcrypt72byte truncation 피하고 전체password 처리. unknown account dummy KDF 동일parameter,
  wrongpassword/unknown은401 INVALID_CREDENTIALS. 운영 rate limit/KDFcapacity는 후속사항이며 정책 미추가.
- 내 보드는 user membership만 joined_at DESC/board_id DESC, myRole 계산, default20/max100,limit+1.
  cursor는 canonical base64url JSON joinedAt/boardId 값 검증. 저장값 OR 경계 조회라 anchor삭제 뒤에도 계속.
  새 참여는 firstpage refresh, snapshot보장 없음. 잘못된 cursor/limit422 INVALID_INPUT.
- 생성 board/OWNER/default3columns 단일 transaction. 할 일/하는 중/완료,0/1024/2048,세 번째만done.
  color 생략#5534DA/명시string그대로. 응답 Board+versionETag,생성에If-Match없음.
- TypeScript build 및7 suites/38 tests PASS. 새12 tests: Nest HTTP7, password1, authorchestration2,
  boardsfailure/cursor2. 회전/폐기/다른세션/DTO/이메일/serializer/keyset/기본컬럼/ETag 검사.
  실패주입은 transaction 전달/순서/전파만 검사, 실제rollback 증거 아님. 기존read-only deps재사용,설치없음.
- initial 검증 실행 중 columnposition수정으로 구버전test기대값1건실패; 수정된최종검증은38전부PASS.
  DB 설치/실행/연결 없음. 실제SQL/HTTP-BFF/browser/경쟁/rollback/재시작 인수 미실행.
  QA실제기능통과 아님. schema/migration 변경 없음. 상세 apps/api/README.md, env example키설명.
- 범위제외: PATCHme/password,보드상세/수정/삭제 및 나머지CRUD. DB준비 및 live검증은 별도허용 이후.


## 2026-10-12 BE-2 인증 세션 및 BFF 저장 기반

TO: manager, qa, fe
RE: 사용자 승인 세션/B안 및 QA auth-bff 001~009

- Prisma AuthSession/RefreshCredential hash-only history 및 web_sessions additive migration 추가.
  FE exact columns: id UUID PK, session_hash TEXT UNIQUE, encrypted_tokens TEXT,
  expires_at TIMESTAMPTZ, revoked_at nullable TIMESTAMPTZ, created_at TIMESTAMPTZ.
- AuthSessionService는 사전 인증된 사용자에 한해 세션 발급. JWT sub/sid/iat/exp, access 900초,
  로그인 시점 7일 절대 만료. refresh는 session FOR UPDATE 후 최신 이력 재조회,
  소비 이력 보존/회전. 재사용 폐기는 트랜잭션 commit 이후 401을 반환하여 rollback 방지.
- logout은 sid 현재 세션만 잠그고 폐기. SessionGuard가 매 요청 DB 유효성 확인.
  내보내는 AuthSessionModule은 AppModule 미연결: 미래 HTTP에 반드시 guard 연결 필요.
  등록/login HTTP, 사용자 인증/이메일 정책, 전체 CRUD 없음. Public AuthResponse 변경 없음.
- 내부 응답 accessToken/refreshToken/tokenType/expiresIn/refreshExpiresAt이며 외부 응답에 extra 노출 금지.
  JWT는 기존 jsonwebtoken 9.0.3 (직접 의존성/lock root 추가), HS256 한정.
  기존 @nestjs/jwt12 ESM/Nest10 CommonJS 불일치를 회피함. 비밀 키 최소32 bytes 필수.
- DB-free Prisma validate/generate 및 TypeScript build PASS. diagnostics 켠 mock 3 suites/26 tests PASS,
  새 인증 7 tests가 수명/해시/잠금 재조회/폐기/만료/잘못된 JWT/guard를 검사.
  git diff --check PASS. 기존01c8 의존성 read-only 재사용, client는 이 branch generated에만 생성.
- 초반 Prisma generate implicit npm auto-install 시도는 실패하고 중단했으며 설치/복사 완료 없음.
  tooling은 이제 SKIP_AUTOINSTALL + 환경 지정 기존 generator 사용, 임시 schema/cache는 ignored/정리.
  Windows realpath EPERM은 승인된 DB-free 실행으로 해결함.
- DB 설치/기동/연결 없음. 실제 migration 적용/경쟁/rollback/재시작/HTTP/브라우저 인수는 미실행.
  QA 기능 인수 통과를 주장하지 않음. 상세 실행 및 제한 apps/api/README.md.


## 2026-10-11 BE-2 VS1 readiness 조사

TO: manager, qa, fe
RE: BE-1 인계 후 VS1 후속 준비

- 기준 4ee00b2, codex/be2-readiness. agents/be/BE2-PLAN.md에 확정 정책, 승인 공백과 선택지/영향, 작은 구현 단위 A0~A3/B1~B3, DB 없는 검증과 실제 DB 검증 경계를 기록했다.
- 근거: docs/contract 4개 문서, QA 002 및 cases 목록, BE-1 OUTBOX, apps/api README와 현재 schema/migration/AppModule. 기존 BE-1 검증 기록만 검토했고 새 테스트/설치/DB 실행은 하지 않았다.
- 기본 컬럼 이름은 feature-spec 3.4의 할 일/하는 중/완료로 확정이다. 이름 승인을 다시 요청할 이유가 없다.
- 실제 미결: TTL·세션 식별/회전/폐기 범위·로그아웃 즉시성·비밀번호 변경 세션 영향, 기본 color, cursor 순서/동률/경계, 이메일 동일성. JWT 사용 자체와 myRole/limit는 이미 확정이다.
- 확인 필요: 기존 Prisma 및 SQL의 color default #5534DA는 현 contract에서 승인 근거를 찾지 못했다. 코드 존재를 승인으로 간주하지 않는다. 이번에는 구현/SQL을 수정하지 않았다.
- TO qa: 기존 001~013은 인증/목록/생성 전체를 덮지 않는다. auth와 내 보드 전용 인수 문장을 먼저 요청한다. mock 성공은 실제 세션 경쟁/보드 생성 rollback 보장이 아니다.
- TO fe: 업무 HTTP가 없는 상태는 동일하다. BE-1 부팅/404 통과를 인증 API 연동 준비 완료로 해석하지 않는다.
- 막힌 점: 구현 가능한 계약 기반이 있어도 위 정책 공백과 QA 선행 케이스가 남는다. 상세 계획의 승인 게이트 이후 관리자 배정 단위만 구현한다.


## 2026-10-11 BE-1 전환 및 복구

TO: manager, qa, fe
RE: QA-1 완료

### 복구와 구현

- 원래 OneDrive 폴더의 QA 001~013, STATUS/OUTBOX를 현재 Codex worktree로 인계했다.
  사용자 승인 범위에 따른 원본 복원이며 케이스 내용은 수정하지 않았다.
  cases의 README 포함 모든 파일은 복사 후 SHA-256이 원본과 일치했다.
- 기존 NestJS 설정·package.json·lockfile을 보존하고 node_modules를 복사했다.
  연결(Junction) 생성은 접근 거부였고, 재설치하지 않았다.
- Prisma 스키마와 초기 migration SQL 작성. 복합 FK 5개 및 계약 unique/CHECK 포함.
  Prisma가 표현하지 못하는 태그 lower(name) 인덱스, PENDING 초대와 마감 snapshot 부분 unique,
  커밋 시 Owner 존재 deferred trigger는 migration SQL에 직접 포함했다.
  새 보드의 Owner 누락도 거부하며, 보드 cascade 삭제 후에는 Owner를 요구하지 않는다.
- Nest PersistenceModule, lazy PrismaService, transaction 서비스 작성.
  의존 설정/해제와 역할 변경은 board FOR UPDATE 안에서 권한과 버전을 검사한다.
  의존 체인 검사, LAST_OWNER 보호, version 조건부 갱신(CAS), 의존 활동 로그 포함.
  WIP용 목적지 column FOR UPDATE 헬퍼 작성. 실제 WIP 이동은 미구현.
- If-Match 기반: 누락 428, 잘못된 강한 ETag/본문 버전 불일치 422,
  stale version 409 및 현재 version 반환. ETag 생성 함수 포함.
  HTTP 컨트롤러에 연결된 것은 아니다. 댓글 등 비버전 자원에 전역 적용하지 않는다.
- Card.completed/blocked/warnings와 Board.myRole을 저장 컬럼으로 만들지 않았다.
  InviteRole은 EDITOR/VIEWER만 가능하다. 코드잇 API/FE 구현 없음.

### DB 없이 수행한 검증

- Prisma 5.22.0 validate: 통과.
- 기존 로컬 Windows 엔진으로 Prisma Client generate: 통과.
- schema에서 DB 없이 migrate diff --from-empty --to-schema-datamodel --script로 기본 DDL 생성,
  수동 제약을 추가했다. 이 절차는 PostgreSQL에서 SQL을 실행한 검증이 아니다.
- npm.cmd run build: 통과.
- npm.cmd test -- --runInBand --watch=false: 2 suites, 19 tests 통과.
  mock DB 기반이며 순환/교차 보드/권한/마지막 Owner/버전 충돌과 잠금 호출 순서를 검사한다.
- npm.cmd run test:e2e -- --runInBand --watch=false: 1 suite, 1 test 통과.
  DB 없는 Nest 부팅/404/종료 검사만 수행한다.
- git diff --check: 통과.
- Windows sandbox의 realpath EPERM은 승인된 로컬 실행으로 해결했다.
  초기 generate의 엔진 다운로드 시도는 실패했고, 로컬 엔진 경로 지정 후 성공했다.
  scripts/prisma-local.cjs가 기존 엔진을 재사용한다. PostgreSQL은 실행하지 않았다.

### DB에서 검증하지 않은 항목

- migration 전체 적용 및 SQL/PLpgSQL 실행 유효성.
- 복합 FK의 실제 거부와 422 오류 번역 metadata.
- Owner 트리거의 INSERT/강등/삭제/이동/커밋/보드 cascade 삭제 동작 및 409 오류 번역.
- 실제 동시 A→B/B→A 직렬화, 역할 변경과 일반 version 쓰기의 경쟁/rollback.
- WIP 경쟁, 마지막 완료 컬럼 경쟁 및 카드 이동 시 행 불변.
- 알림 snapshot unique와 읽음 이후 멱등. 알림 job 자체도 미구현.
- QA 001~013의 HTTP/DB 인수 검증은 미실행. QA 통과로 판정하지 않는다.

### 실행 방법

PowerShell에서 apps/api로 이동한다. 현재 node_modules는 인계되어 있으므로 재설치하지 않는다.
새 checkout에서 설치 폴더가 없을 때만 npm.cmd ci를 실행한다.
최초 1회 .env.example을 .env로 복사하고 DATABASE_URL을 설정한다.
Nest 런타임용으로 $env:DATABASE_URL도 설정한다(.env 자동 로드 모듈은 아직 없음).

```powershell
$env:DATABASE_URL = 'postgresql://taskify:taskify@localhost:5432/taskify?schema=public'
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run build
npm.cmd test -- --runInBand --watch=false
npm.cmd run test:e2e -- --runInBand --watch=false
npm.cmd run start:dev
```

기본 PORT=3000, prefix=/v1. 현재 등록된 업무 HTTP endpoint가 없어 요청은 404다.
DB는 실제 쿼리 전까지 연결하지 않는다. 이미 준비된 DB에 DDL을 적용하는 후속 작업에서만
실제 연결 문자열을 설정하고 npm.cmd run prisma:deploy를 실행한다. 이번에는 실행하지 않았다.
자세한 경로와 실행 안내는 apps/api/README.md.

### 미완료 기능과 FE 인계

인증, HTTP 컨트롤러/DTO, 보드/컬럼/카드 등 전체 CRUD, 기본 컬럼 생성,
WIP 이동/정렬, 마지막 완료 컬럼 보호, 멤버 삭제, 초대 수락, 보드별 태그 API,
검색, 알림 job, 응답 계산 필드/직렬화와 ETag의 HTTP 연결은 후속 BE 작업이다.

FE 새 대화는 agents/PROTOCOL.md, agents/fe/CHARTER.md, BOARD FE-1 및 이 OUTBOX를 읽는다.
현재 FE-1의 범위인 OpenAPI BoardListItem.myRole과 Card.blocked/warnings 타입 고정부터
진행할 수 있다. 이번 골격을 동작하는 업무 API로 간주해 실서버 연동하지 않는다.

### 커밋 기록

- 기반 커밋: 71e3dca (판/계약).
- a26261c: QA-1 원본 인계.
- e11cf89: BE-1 스키마/migration/잠금/If-Match/검증 및 실행 문서.
- 브랜치: codex/be1-recovery. 로컬 커밋이며 원격 push하지 않았다.
- 이 OUTBOX/STATUS의 최종 인계 기록은 위 구현 커밋 다음 문서 커밋에 저장한다.

## 2026-10-09 판 생성

TO: manager
아직 쓸 내용 없음. QA-1 대기.
