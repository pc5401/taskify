# API

BE-1: NestJS 10 + Prisma 5.22 + PostgreSQL 기반. 계약 v0.2.1.

인증·현재 사용자·내 보드 목록/생성 HTTP가 연결되어 있다. 실제 DB/BFF 연결 검증은 아직 하지 않았다.
Prisma는 실제 쿼리 전까지 DB에 연결하지 않는다.

## 실행 (PowerShell)

```powershell
# 현재 checkout의 apps/api에서 실행. 이번 작업은 기존 의존성을 읽기 재사용하며 재설치하지 않았다.
Copy-Item .env.example .env  # 최초 1회, 기존 .env는 덮어쓰지 않는다.
$env:DATABASE_URL = 'postgresql://taskify:taskify@localhost:5432/taskify?schema=public'
$env:AUTH_JWT_SECRET = '<at-least-32-byte-random-secret>'
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run build
npm.cmd test -- --runInBand --watch=false
npm.cmd run test:e2e -- --runInBand --watch=false
npm.cmd run start:dev
```

PORT 기본 3000, API prefix는 /v1. 등록 경로는 아래 HTTP 배치 절을 참고한다.
Nest 자체는 .env를 자동 로드하지 않으므로 PORT도 필요하면 PowerShell 환경 변수로 지정한다.
Prisma CLI는 .env를 로드한다. 생성 클라이언트는 generated/client (Git 제외).
Windows에서 경로 접근 EPERM이 발생하면 Codex의 승인된 실행을 이용한다.
실행 정책 변경이나 관리자 계정으로 DB를 띄울 필요는 없다.

## 향후 이미 준비된 DB에 migration 적용

연결 문자열을 실제 DB 값으로 바꾸고 `npm.cmd run prisma:deploy`를 실행한다.
이 명령은 DB에 DDL을 적용하므로 이번 복구에서는 실행하지 않았다.
DB 설치·시작용 스크립트는 인계하지 않았다.
다음 명령으로 migration 전체를 재생성하면 수동 SQL(부분 인덱스·CHECK·트리거)이 빠지므로
기존 migration.sql을 덮어쓰지 않는다.

## 구현과 남은 작업

- 스키마: User, Board, BoardMember, Column, Card, Tag, CardTag, Invitation,
  ChecklistItem, Comment, Activity, Notification. blocked/warnings/myRole은 저장하지 않는다.
- migration: 복합 FK 5개, 보드별 소문자 태그 unique, PENDING 초대 unique,
  마감 알림 snapshot unique, self dependency/WIP CHECK, 커밋 시 Owner 존재 트리거.
- 내부 서비스: 의존 변경과 역할 변경은 실제 transaction + board FOR UPDATE,
  권한 검사, If-Match, version 조건부 갱신을 사용한다. 의존 변경은 활동 로그도 남긴다.
- WIP용 목적지 column FOR UPDATE 헬퍼가 있다. WIP 이동 기능 자체는 아직 없다.
- 미완료: 보드 상세/수정/삭제와 나머지 업무 CRUD·WIP 계산/이동·완료 컬럼 보호·
  초대 수락·태그 API·검색·마감 알림 job·전체 응답 직렬화/ETag 연결.
- FK 및 Owner 트리거 오류 번역은 드라이버 metadata를 이용한다. 실제 PostgreSQL 오류 형태는
  통합 테스트로 확인해야 한다.

## 검증의 한계

단위 테스트는 mock DB로 분기와 쿼리 호출 순서를 검사한다. 앱 부팅 테스트는 DB 연결 없이
404와 정상 종료를 검사한다. migration 적용, 실제 FK/트리거 동작, cascade 삭제,
동시 A→B/B→A, Owner 경쟁, WIP 경쟁, 알림 멱등은 DB에서 검증하지 않았다.
QA 001~013은 아직 HTTP/DB 인수 테스트 통과가 아니다.
# Auth session foundation (2026-10-12)

`AuthSessionModule` exports `AuthSessionService` and `SessionGuard` and is now
imported by AppModule. Login verifies credentials before issuing a session; register
creates the user and initial session in one transaction. Public AuthResponse stays
`{accessToken, refreshToken, user}`; the service's extra lifetime fields are internal.
SessionGuard protects GET /me, GET/POST /boards, and logout. Set
AUTH_JWT_SECRET to a random secret of at least 32 bytes; module initialization fails
without it. JWT signing/verification uses the existing jsonwebtoken 9.0.3 library
with HS256 pinned. Existing @nestjs/jwt 12 is ESM and incompatible with this Nest 10
CommonJS runtime; no custom JWT cryptography or dependency installation was used.

Session access TTL is 900 seconds, refresh expiry is the initial session creation
time plus seven days. Hash-only refresh history persists consumed tokens for reuse
detection. Refresh and logout acquire the auth_sessions row lock. Reuse revocation
commits before returning 401; throwing inside that transaction would undo it.
The guard queries session validity on every request. Credential-history cleanup
is intentionally deferred; never remove consumed history while its session is live.

The additive migration includes auth_sessions, refresh_credentials and FE-owned
token ciphertext storage web_sessions. FE SQL uses exact snake_case columns
id/session_hash/encrypted_tokens/expires_at/revoked_at/created_at. FE supplies UUIDs
for raw SQL inserts. BE does not store raw refresh tokens or perform BFF encryption.

For DB-free checks with existing dependencies, set TASKIFY_API_DEPENDENCIES to an
existing apps/api/node_modules path, then run `node scripts/prisma-local.cjs validate`,
`node scripts/prisma-local.cjs generate`, and `node scripts/check-existing-deps.cjs`.
Generation uses the existing generator without auto-install, with branch-local
generated output and temporary ignored .runtime files. The latter command runs a
TypeScript build and unit tests with diagnostics enabled. DATABASE_URL is required
for schema validation but these commands do not connect. No DB migration was applied.
Actual row-lock concurrency, migration execution, restart persistence, live DB HTTP and
browser acceptance remain unverified.

## Auth / me / boards HTTP batch (2026-10-12)

Registered routes: POST /v1/auth/register (201), login (200), refresh (200), logout
(204); GET /v1/me; GET/POST /v1/boards. Refresh also returns the required public User.
Password/session/hash fields are explicitly excluded from public serializers. Email
is stored and compared exactly; validation does not trim or lowercase. Existing
register limits are password >=8 and nickname 1..30; LoginRequest has no password
length restriction. Schema violations consistently return 422 INVALID_INPUT with
code/message/details. Unknown keys are not separately rejected. Protected requests
check session validity; no profile/password update, board detail/update/delete routes.

PasswordService uses asynchronous Node scrypt: scrypt-v1 encoding, random 16-byte
salt, 64-byte derived key, N=16384/r=8/p=1, maxmem=64MiB and timingSafeEqual. The
versioned encoding allows future parameter migration. It handles full input without
bcrypt's 72-byte truncation and introduces no extra password restriction. Unknown
accounts use a syntactically valid dummy hash with the same KDF parameters and the
same generic INVALID_CREDENTIALS response as wrong passwords. Operational login
rate limits and KDF capacity tuning remain follow-up items.

Board creation uses one transaction for board, OWNER membership and default columns
할 일/하는 중/완료 at positions 0/1024/2048; only 완료 has is_done. Omitted color
defaults to #5534DA; explicit strings are preserved. Response is Board with version
ETag and no mandatory myRole. Listing selects only caller BoardMember rows, adds
myRole, orders joined_at DESC/board_id DESC and fetches limit+1 (default20, range1..100).
Opaque base64url JSON cursor stores joinedAt/boardId values. Next page filters by
the stored boundary without requiring the anchor row to exist. New memberships
appear on first-page refresh; no snapshot promise or cursor signing policy was added.

HTTP tests use a Nest server plus explicit in-memory Prisma mocks, not PostgreSQL.
Failure injection checks transaction scope and error propagation; it cannot prove
actual database rollback, unique constraints, keyset query execution or concurrent
session behavior. Live DB/BFF/browser acceptance remains separate and unexecuted.

## Isolated live DB verification (2026-10-12)

The approved isolated PostgreSQL18.4 batch applied both existing migrations and
verified internal transactions: TypeScript build,7 suites/40 tests,11 real DB checks
passed. See agents/be/LIVE-DB-REPORT.md for the deferred COMMIT defect, narrow
LAST_OWNER repair and persisted rollback evidence. Earlier DB-free limits are updated
only for these checks; all business HTTP/browser acceptance is not implied.

Set TASKIFY_API_DEPENDENCIES to the existing node_modules directory. The lifecycle
script never resets/drops/removes DB data and retains unique fixtures. Only a new
UUID directory may use `node scripts/isolated-db.cjs init`, followed by `prepare`
and `deploy`. Retained data uses `status`/`connect`, then `start` if unavailable;
never repeat init. `prepare` preserves existing secrets and writes ignored env JSON
with origin3002/API3301/database gate and BFF3002/3003 settings. Output is path and
nonsecret metadata only. Native binaries are reused read-only without installation.

.runtime/active-db.json selects the managed config. Control output is in
.runtime/*-control.log; PG data/logs/secret environment are in the UUID directory.
`node scripts/isolated-api.cjs` runs the built API from that environment.
`node scripts/live-db-regression.cjs` requires the exact isolated cluster and retains
all fixture data. Final `stop` requires parent coordination and uses pg_ctl fast
shutdown, preserving data. Runtime secrets/files must never be printed or committed.

Final coordinated cleanup: pg_ctl fast shutdown completed;55432 refused connections and API3301/Next3002/3003 were unavailable. Data/fixtures retained. Resume the retained cluster with isolated-db.cjs start/connect, never init or reset; the existing ignored environment preserves keys.

## Cycle02 board reads

Added GET /v1/boards/:boardId (Board+ETag), /columns ({items}) and /cards
(CardPage). All use SessionGuard and membership; OWNER/EDITOR/VIEWER can read,
missing/nonmember/pending invite403. UUID/query violations422, invalid session401.
No new creation or movement endpoint and no schema/migration change.

Columns/cards order position ASC/id ASC. Card filters columnId/assigneeId/tag AND
together; tag exact, valid foreign/unknown IDs empty. Cursor stores board, filters
and position/id boundary, validates binding and continues after anchor deletion.
blocked derives from direct predecessor column; warnings appears only for blocked
cards currently in a done column. Public nullable fields retain null and private
relations/creator fields are omitted.

Build and9 suites/49 tests passed. `node scripts/live-board-reads.cjs` passed8 actual
DB/HTTP checks against parent-managed runtime, using new isolated fixtures only.
The approved run-owned anchor is deleted for cursor validation; all other fixtures
remain. See agents/be/CYCLE02-RESULT.md. Independent QA/browser acceptance and
runtime shutdown are separately coordinated; this report does not mark them passed.

## Cycle03 card creation and movement

POST /v1/columns/:columnId/cards and POST /v1/cards/:cardId/move implement
approved contract64f7ae9 and QA WRITE001–012. Only OWNER/EDITOR write. Source
missing/nonmember403; verified missing target422 INVALID_INPUT, foreign target422
CROSS_BOARD. Creator is authenticated user; unknown request fields are ignored.
Optional description cannot be null. dueAt requires RFC3339 time and timezone.

First position0 and gap1024 are implementation choices. Placement uses midpoint;
no gap or Int32 overflow rebalances the destination to0/1024/... . Only changed
existing positions increment version/updatedAt. Same-column unchanged order is a
no-op preserving version, ETag and activity; If-Match is still checked first.

Transactions lock source/destination columns in UUID order, then destination cards
and source card in UUID order. Source column is reread after locking; a changed
source retries at most3 transactions, then returns VERSION_CONFLICT. Destination
locks serialize WIP and ordering; no board-wide lock substitutes for them. Move
also uses a version-constrained update. WIP excludes the moving card. Card, tag
links, newly created tags and actor CARD_CREATED/CARD_MOVED activity are atomic.

Tag canonical keys are PostgreSQL lower(name), sorted with C collation before
upsert. Request duplicates are removed by that database-derived key. Expression
unique-index upsert preserves an existing spelling and original whitespace, and
serializes concurrent case variants. No schema/migration changes.

Build and10 suites/64 tests pass using existing dependencies. Unit evidence covers
position boundaries, RFC3339, no-op, stale version, self-before and Viewer rejection.
Actual concurrency/WIP/rollback validation uses the independent QA cycle03 harness;
live results and runtime cleanup are recorded separately after parent coordination.

Independent QA final result reported by parent: c5f04bf7, actual cycle03 19 PASS,
exit0 against product1618099. Includes all3 WIP races, same-card CAS, concurrent
case variants, rebalance/no-op, API+BFF authentication and injected create/move
failure rollback/recovery; temporary triggers cleaned. Two earlier harness runs
failed because QA expected private creatorId in the public response and used an
oversized tag; corrected harness passed without product changes. No browser-click
or unsupported card editing/deletion/dependency HTTP claim. New isolated fixtures
are retained; final runtime shutdown is parent-coordinated. See CYCLE03-RESULT.md.

## Cycle04 member reads

GET /v1/boards/:boardId/members reuses BoardReadsService and SessionGuard.
All member roles can read; missing/nonmember/PENDING403 NOT_MEMBER, invalidUUID422,
invalid session401. Returns the full existing-contract collection without pagination.
Query selects only userId/role/joinedAt and user.nickname; response projects exactly
those four public Member fields. No email/hash/token/session/private relations.
Ordering joinedAt ASC/userId ASC is a deterministic implementation choice.
No schema/migration or new assignment-write behavior; existing create assigneeId
and card filtering remain reusable. Build/mock HTTP tests pass (10 suites65 tests).
Actual API/BFF/browser acceptance and server startup/shutdown are parent-coordinated.
