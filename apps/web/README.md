# FE-1 계약 타입 및 읽기 전송 어댑터

근거: `docs/contract/openapi.yaml` v0.2.1, BOARD FE-1, BE OUTBOX 2026-10-11.
이번 산출물은 프레임워크 없는 TypeScript 모듈이다. 패키지 설치, UI/Figma 추정,
실서버 연결, 세션 저장/갱신/로그아웃 정책, 가짜 업무 API는 추가하지 않았다.
BE 업무 HTTP endpoint는 아직 미등록이므로 정상 기능으로 연결할 수 없다.

## 타입 범위

`src/contract.ts`: Role, Board, BoardListItem, BoardPage, Column, Card, CardPage,
CardWarning, ApiErrorCode, ApiErrorBody만 옮긴 작은 부분집합이다.
BoardListItem.myRole은 필수이고 Board 상세에는 없다. Card.blocked와 warnings도
필수이며 서버 값을 그대로 소비한다. `completed`를 추가하거나 계산값을 저장하지 않는다.
선택 필드와 null 허용을 구분했다. UUID/date-time은 wire string이고 정수/길이/format
검증은 OpenAPI 제약이다. 이 모듈은 런타임 검증기를 대신하지 않는다.

BoardPage는 OpenAPI allOf의 Board 조건과 직접 properties.items의 BoardListItem 조건이
동시에 적용되므로 BoardListItem[]로 표현했다. 계약 파일은 수정하지 않았다.

## HTTP 범위

`createReadClient(apiBase, fetcher)`는 명시적인 `/v1` 포함 base와 fetch 구현을 받는다.
GET /boards, GET /boards/{boardId}, GET /boards/{boardId}/cards만 제공한다.
목록 cursor/limit를 지원하며 카드 columnId/assigneeId/tag 필터와 쓰기는 후속 범위다.
호출자가 headers(계약상 Authorization Bearer), credentials, 선택 signal을 전달한다.
기본 토큰 저장소, 인증 헤더 발명, 자동 refresh/retry 또는 쿠키 설정은 없다.
실행 예제 계정/토큰을 저장하지 않는다.

반환값은 data/status/etag이다. HTTP 오류의 status/body/etag를 보존하고 네트워크 오류를
그대로 전달한다. 오류 body는 unknown이므로 소비 단계에서 계약 오류 형태를 확인해야 한다.
성공 응답은 JSON 문법만 검사하고 스키마는 검사하지 않는 경계 단언이다.
쓰기/If-Match는 구현하지 않았다. 브라우저 cross-origin ETag 접근은 BE가
Access-Control-Expose-Headers를 정한 뒤 통합 검증해야 한다.

## 수행한 검증

기존 BE의 TypeScript를 읽기 전용으로 재사용했다. 새 의존성이나 lockfile은 없다.
다른 checkout에서는 TASKIFY_TYPESCRIPT를 기존 TypeScript 모듈 경로로 지정한다.
작업 트리 루트에서 실행:

```powershell
$env:TASKIFY_TYPESCRIPT = 'C:/Users/USER/.codex/worktrees/01c8/taskify-board/apps/api/node_modules/typescript'
node "$env:TASKIFY_TYPESCRIPT/bin/tsc" -p apps/web/tsconfig.json
node --test apps/web/checks/http.test.cjs
git diff --check
```

2026-10-11: 타입 검사 통과, Node transport tests 5/5 통과, diff 검사 통과.
타입 검사는 myRole 위치, Card 필수 키, warnings enum, nullable/optional, completed 부재를 확인한다.
전송 검사는 URL 인코딩/헤더/ETag, 403 본문 보존, 비JSON 실패, 네트워크 오류, signal을 확인한다.
테스트의 축약 fixture는 전송 보존 검사용이며 유효한 전체 API 응답 예제나 실제 서버가 아니다.
OpenAPI 자동 생성/드리프트 검증, 실제 HTTP/DB 인수, UI/브라우저 테스트는 미실행이다.
QA 001~013 통과 또는 제품 기능 완료를 주장하지 않는다.

## 다음 인계

1. BE가 업무 endpoint, 계산 필드/목록 myRole 직렬화, 인증 정책, CORS/ETag 노출을 확정하고 OUTBOX로 알린다.
2. 관리자가 Figma 근거와 다음 FE 범위를 제공한 뒤 Next.js/Tailwind 화면 작업을 시작한다.
3. 새 계약 변경 시 이 작은 subset과 type checks를 함께 대조한다. 필요 시 자동 타입 생성/런타임 검증을 별도 도입한다.
4. QA는 계약 형태 및 실제 권한/DB 불변을 독립 검증한다. 미완료인 세션 정책을 프론트가 추정하지 않는다.

## Next BFF foundation (2026-10-12)

The foundation browser routes are: POST /api/auth/register, /api/auth/login,
/api/auth/logout; GET/PATCH /api/me; GET/POST /api/boards. Auth success keeps
upstream 200/201 and returns only {user}. Other JSON statuses and ETag are
preserved; token fields and echoes of known session tokens are redacted. No
browser Authorization is trusted. Local 502 transport/config failures have a
message/details envelope, without inventing an OpenAPI domain error code.

Node 24.20.0 is installed; Next 16.4.0 requires Node >=20.9. Dependencies are
pinned in package-lock.json. npm install reported zero vulnerabilities on
2026-10-12. Official sources: https://nextjs.org/docs/app/getting-started/installation
and https://nextjs.org/blog (Oct 8 announcement of an Oct 14 upcoming upstream
security release). Recheck official security releases before deployment; the
future release is not installed or claimed as available.

Copy .env.example to .env.local and provide NEXT_APP_ORIGIN (exact origin),
TASKIFY_API_BASE (default example http://localhost:3000/v1), DATABASE_URL and
TASKIFY_SESSION_KEY (base64 of 32 cryptographically random bytes). Never use
NEXT_PUBLIC for these secrets. The key has no default; missing/malformed key
fails closed before an upstream/DB request. Keep the same key across workers
and restarts; key replacement invalidates existing encrypted bundles.
Production must use HTTPS for web and upstream traffic. Dev/start use port
3002 to avoid Nest's 3000. Run npm ci, npm run typecheck, npm test and npm run
build; npm run dev or npm start can run a DB-free UI preview. Live DB/API integration remains a separate phase.

Production always uses pg/PostgreSQL, never an in-memory fallback. BE owns the
migration creating web_sessions(id UUID, session_hash unique, encrypted_tokens
TEXT, expires_at TIMESTAMPTZ, revoked_at nullable TIMESTAMPTZ, created_at).
Apply BE migrations in a separately authorized DB phase before live use. No
migration, DB installation, startup, or connection was performed here. The pg
Pool is lazy; source/build/unit tests do not connect. Tests inject an explicit
mock store only. A per-row transaction reads SELECT ... FOR UPDATE before
using/decrypting tokens, serializing refresh across workers. AES-256-GCM binds
the ciphertext to session_hash as AAD. Cookie values are 256 random bits, only
SHA-256 hashes are persisted. HttpOnly, SameSite=Lax, Path=/, production Secure,
Max-Age/Expires end at the initial absolute deadline. JWT iat from the trusted
upstream auth response limits initial expiry to seven days; it is not used to
authenticate a browser JWT. Rotation cannot update expires_at. Mutations require
the configured Origin, including login/register/logout.

Logout retries with rotated tokens if access expired, then locally revokes
and clears the cookie. A network/timeout/redirect failure revokes locally and
returns 502 explaining that upstream revocation was unconfirmed; an already
held upstream access token may remain valid until backend expiry/revocation.
A lost refresh response or failed database commit after upstream rotation may
require login again. No raw errors/tokens are logged. Fetch timeout is 10s and
redirects are rejected. An upstream success followed by session insert failure
can leave an upstream session without a browser cookie.

Nest auth/me/boards HTTP endpoints are now implemented in the BE HTTP batch; live integration/DB acceptance has not run. These BFF routes are foundation
source only; mock tests/build do not establish actual DB durability, network
integration, browser restart recovery, or QA AUTH-BFF-001..009 acceptance.

Cross-service refresh is not an atomic PostgreSQL transaction: Nest may commit
rotation before the BFF save/commit fails. Its rotation cannot be rolled back
by the web_sessions transaction. The failure requires re-login; retrying an
old refresh can trigger Nest's session reuse revocation. Mock serialization
is evidence for local lock discipline only, not real multi-worker PG atomicity.

## Temporary UI batch (2026-10-12)

User explicitly approved "temporary UI implementation followed by design
correction" after the Figma Starter MCP call limit blocked high-fidelity
get_design_context and screenshots. Figma root metadata was read: file
uUzjrPIuWIrQG8a93G0rTq, login frame6:2 and boards frame6:24. Layout uses the
observed marketing/form and sidebar/topbar/board-tile structure. This is not
an exact Figma reproduction. Detailed colors/fonts/assets/registration and
creation states require follow-up design correction when context is available.
No screenshot was substituted as an asset and no Figma temporary asset URLs
are included. Brand #5534DA follows the existing policy.

Routes /login, /register, /boards (root redirects to /boards). All data travels
through /api BFF with same-origin cookies; browser never stores auth tokens.
Email/password strings are sent unchanged; email uses text+inputMode=email to
avoid browser email-field whitespace sanitation. Register constraints come
from OpenAPI. Login does not inherit register's password minimum. Lists use
server order/myRole/nextCursor without card/member counts unsupported by the
contract. Creation omits color if no selection, preserving server default.
Pagination keeps opaque cursor bookmarks, flags422 instead of empty success,
and returns to first page after creation. Other workspace
features have no active fake links. Logout502 with confirmed local termination
shows the upstream-unconfirmed notice; other failures retain an explicit error.
Forms have labels, loading/error states, repeated-submit guards and abort cleanup;
responsive layouts keep mobile controls visible. UI artwork/assets are pending.

Tailwind4.3.3 + PostCSS8.5.29 follow the official Next installation guide:
https://tailwindcss.com/docs/installation/framework-guides/nextjs . The first
PostCSS version selected was flagged by npm; it was patched to8.5.29 and the
subsequent install reported zero vulnerabilities. Generated apps/web/AGENTS.md
was created by Next dev; bundled Next docs for server/client components and
useSearchParams were read, and client pages have Suspense boundaries.

Validation: typecheck PASS, BFF/mock browser client12/12 PASS, Next build PASS.
Next dev starts without DB credentials; HTML route smoke is separately recorded
in FE OUTBOX. Available computer-use browser inventory is empty, so rendered
visual/interactive browser checks could not run. No DB connection or real
Nest auth/boards acceptance performed; a preview is not live integration.

## Actual isolated BFF verification (2026-10-12)

Following user approval, checks/live-bff.mjs ran against the isolated
127.0.0.1:55432/taskify_validation PostgreSQL and actual Nest API3301 with two
Next production workers3002/3003. Initial29 and restart/logout12 named checks
passed. This establishes actual HTTP/PG token ciphertext/hash lookup, opaque
persistent cookie attributes, Origin403, public responses/me/boards/create and
invalid cursor handling. Fixture-only expired-access injection drove real
concurrent requests across both workers; the database refresh history increased
by exactly one and absolute expiry remained unchanged. The access JWT kept the
approved900-second lifetime; product policy/code was not weakened.

After synchronized BE and both Next-worker restarts with the same keys/DB,
the preserved cookie restored the original user from each worker. Logout204
cleared its cookie and persisted local revocation; the old BFF cookie and
previously valid upstream access both received401. The PostgreSQL server was
kept running; this is application-process restart persistence verification.
Harness fixture state is AES-GCM encrypted under ignored .runtime; environment
secrets are ignored and never printed or committed. No reset/drop/delete of
existing data; fixtures retained. URL and live DB identity guards require the
named loopback55432 database before fixtures. Run the opt-in initial/recovery
phases only against that isolated environment; ordinary npm test remains mock.

Computer-use surfaces remained empty. These results use an explicit HTTP cookie
jar and inspect production Secure flags over loopback HTTP. They do not claim
HTTPS browser cookie enforcement, browser shutdown/storage/visual/click checks,
natural900-second/seven-day elapsed tests, or full AUTH-BFF/HTTP acceptance.
See agents/fe/LIVE-BFF-RESULT.md for scope and evidence. Services are stopped
through parent coordination after the full validation batch.

## Cycle02 read-only board UI

User approved the board read rules and a new temporary board UI followed by
Figma correction. The mandatory Figma design-to-code skill was read and frame
6:69 context/screenshots requested once; the Starter call limit still blocked
it. Existing root metadata established sidebar/topbar/columns. This temporary
layout is not a high-fidelity match. Precise assets/fonts/layout correction
and visual acceptance remain pending; no repeated Figma calls were made.

New GET BFF routes /api/boards/{boardId}, /columns and /cards permit only fixed
UUID paths and allowed read suffixes. Mutations return405. Card queries forward
cursor/limit/columnId/assigneeId/tag with URLSearchParams, preserve exact tag and
empty tag, reject repeated known scalars and malformed UUID/limit with422,
and omit unrelated query keys. Upstream403/401/422/ETag and token redaction
remain intact. Browser-supplied Authorization is never trusted. Server session
storage/refresh remains in the existing PostgreSQL BFF implementation.

My-board tiles now link to /boards/{boardId}. The read-only kanban uses server
columns/cards/blocked/warnings. Viewer has the same read flow; FE does not
compute membership policy or add myRole to Board. Board/columns/all card pages
must all succeed before content renders. 403 displays access denial without
partial content;401 redirects login;422/loading/empty/other errors are distinct.
Old content is scoped to the board+filter request key and aborted on changes.
Cycle02 originally excluded writes. Cycle03 adds creation and movement below; detail editing and invented assignee names remain excluded.

The browser client allCards follows every opaque nextCursor, retains all filters
and AbortSignal, preserves server order, deduplicates IDs, and errors on repeated
cursors rather than showing an incomplete-success list. Column/tag filter UI
is provided; assigneeId/limit are supported via browser client and query URL
without inventing a member directory/UUID-entry product flow. Tag checkbox
allows exact empty-string filter separately from no tag filter. Card counts
are derived from the fully loaded filtered list, not guessed backend counts.

Validation: mock18/18 and TypeScript PASS; Next production build PASS (dynamic
board page and three BFF routes). Live runtime and QA verification are managed
by parent; current actual-read results are recorded in FE OUTBOX when available.
Existing cycle01 live41 checks are historical, not cycle02 acceptance evidence.


## Cycle03 temporary card creation and movement

POST /api/columns/:columnId/cards and /api/cards/:cardId/move use fixed UUID
paths and the existing server session, mutation Origin check and token redaction.
Move passes the quoted current card.version as If-Match; browser client write
results expose the public Card and response ETag only. Nest remains authoritative
for role, WIP, version, relationship validation and no-op behavior.

Owner/Editor controls use myRole found across all board-list pages; Viewer or
unknown role receives no write controls. Successful writes (including no-op),
409 and 428 reload server data. Conflict messages survive reload. A synchronous
in-flight guard and disabled fieldsets prevent duplicate form submission.
Creation supports title, description, local date-time converted to ISO, visible
predecessor choice and one raw tag per line. The client supports all contract
optional fields including assigneeId; no member directory endpoint or raw UUID
assignment flow was invented. Move selects a visible card, destination column
and visible before-card or end. Under filters, choices are explicitly limited
to the current result set. No drag/drop, edit/delete or dependency-write scope.

User approved this new temporary UI followed by Figma correction. Existing
Starter MCP limitation remains; visual fidelity and browser click acceptance
are pending. Tests are mock HTTP/helper evidence, not real transaction races.
Cycle03 mock22/22 and typecheck PASS; production build result and parent-managed
actual QA evidence are recorded in agents/fe/OUTBOX.md.

Tag text is split on newline without trimming; blank lines are empty tag items and receive the server's 422 validation error. The UI does not silently remove them. UUID case is ignored only for membership identity lookup; email and tag strings remain untouched.
The production build passed with the new routes/UI; the subsequent UUID-case comparison regression passed mock22/22 and typecheck.

## Cycle04 members and board reference correction

GET /api/boards/:boardId/members returns the contract public Member projection.
Create forms now offer actual board members and unset null; cards show optional
nickname safely, and member dropdown filters submit assigneeId. Loading/401/403
errors prevent stale member-backed forms. There is no new directory endpoint.

Board-detail Figma6:69 full original context and a valid parent Figma canvas
screenshot informed scoped colors,230px dark sidebar,72px topbar,46px content,
316px columns/14px gaps and288px cards. Visual brand6958e8 is presentation only;
product board default5534DA is unchanged. Original glyphs are text; no static
image/SVG assets were provided. Functional filters and native create/move dialog
extend the static reference. Mobile sidebar collapses and dialog scrolls within
viewport. Parent handles desktop/mobile actual visual and click acceptance.

Exact login/myboards/create-dialog source is unavailable at current MCP limit;
those screens are not claimed as precise Figma reproductions. Current mock23/23,
typecheck and production-build evidence is distinct from browser acceptance.

Parent actual browser evidence: owner login, board link, editor-assigned create, editor filter PASS;1440x900 source comparison and390x844 mobile width/dialog scroll/close PASS. This is recorded separately from mock23/typecheck/build.

Development indicators are disabled because the default bottom-left badge overlapped logout during actual mouse-click testing. Compile/runtime error reporting remains enabled. Parent move/no-op and Viewer read/write-hidden/filter tests passed; logout mouse recheck after rebuild/restart PASS; arrived at login.
