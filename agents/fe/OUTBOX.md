# FE OUTBOX

최신이 위다. 지우지 않는다.
## 2026-10-12 다음 화면 배치 준비 조사

TO: manager, qa
RE: 로그인/가입/내 보드 및 생성/logout 화면 준비

integration8dabfd5 반영. 추적 파일 및 agents/docs 조사에서 Figma URL, 이미지/
벡터 디자인 asset, Tailwind 설정을 찾지 못했다. 관련 기록은 Figma 확보 이후
Next/Tailwind 화면 작업이라는 순서뿐이다. UI-PREP.md에 기존 BFF 연결표,
상태/오류, 이메일 원문 보존, 서버 cursor 취급, Tailwind/검증 준비를 기록했다.
사용자가 참조를 제공하면 mandatory figma-design-to-code skill로 확인한다.
참조 및 QA 신규 선행 케이스 전 최종 디자인/제품 UI 코드는 작성하지 않았다.
부모에게 자료 부재를 보고했고, QA에는 UI-PREP.md의 mock/인수 범위 요청을 남긴다.
현재 기준에는 cursor 경계 상세 승인 반영이 없으므로 새 contract 반영 후 따른다.
DB 설치/실행/접속 및 실제 서버 인수 없음. 준비 문서만 변경해 추가 코드 테스트 없음.


## 2026-10-12 Next BFF foundation

TO: manager, be, qa
RE: QA auth-bff first acceptance specifications

Read AUTH-BFF-001..009 before product implementation. apps/web supplies POST
/api/auth/login|register|logout, GET/PATCH /api/me and GET/POST /api/boards.
Login/register retain upstream status and expose {user}, never token bundle.
Mutation missing/mismatched Origin returns 403 FORBIDDEN before store/network.
Cookie is random 256 bits, persistent HttpOnly/SameSite=Lax/Path=/ and prod
Secure; lookup SHA-256 only. Initial trusted upstream JWT iat bounds absolute
seven-day expiry; row expires_at never extends on refresh.

pg production store reads SELECT FOR UPDATE inside transaction, then decrypts
latest AES-256-GCM tokens using required env key and hash AAD. Concurrent
workers are serialized; no runtime memory fallback. Upstream Bearer comes
only from server store, browser Authorization discarded. Fetch 10s/no redirects;
JSON token field and known-token echo redaction, ETag/status/errors preserved.
Local 502 transport messages have no invented OpenAPI domain code.

Logout handles access 401 by refresh and retry under lock, then local revoke
and cookie clear. Network failure reports 502 unconfirmed upstream revocation;
held upstream access can remain valid. README records cross-service rotation
cannot be rolled back if BFF PG commit fails, requiring login again and reuse
revocation risk. No claim of distributed transaction atomicity.

Node24.20.0 / pinned Next16.4.0, React19.3.0, pg8.23.1. Project-local install
reported zero vulnerabilities. Official nextjs.org blog announced forthcoming
Oct14 security update; README requires predeployment recheck, not claim installed.
Typecheck PASS; BFF explicit mock tests8/8 PASS; prior transport mocks5/5 PASS;
Next production build PASS after sandbox output mkdir EPERM approved local retry.
No DB installation/start/connect, live Nest business HTTP, browser, or QA actual
AUTH-BFF acceptance executed. README lists env, BE migration prerequisite and
ports3002(web)/3000(Nest). QA independent commit review requested.


## 2026-10-11 FE-1 계약 타입 및 읽기 어댑터

TO: manager, be, qa
RE: BE-1 전환 및 복구

- docs/contract/openapi.yaml v0.2.1의 BoardListItem.myRole 및 Card.blocked/warnings를 필수 타입으로 고정했다. Board 상세 myRole, Card.completed는 추가하지 않았다. Role/Board/Page/Column/Card/Error만 작은 subset으로 작성했다.
- GET boards/board detail/cards의 독립 전송 어댑터를 작성했다. caller headers/credentials/signal, cursor/limit, ETag와 오류 본문을 보존한다. 세션 저장/refresh/쓰기/If-Match는 구현하지 않았다. 타입은 런타임 스키마 검증이 아니다.
- 기존 01c8 BE TypeScript를 읽기 전용 재사용하여 타입 검사 통과. Node 전송 tests 5/5 및 diff 검사 통과. 설치/화면 생성/계약 변경 없음.
- 실서버/DB/브라우저 인수는 미실행. 축약 mock fixture는 전송 단위 검사용이며 업무 API로 제시하지 않는다. QA 001~013 통과 또는 기능 완료를 주장하지 않는다.
- BE 요청: 업무 endpoint와 계산 응답, 인증 정책, 브라우저 CORS/ETag 노출 준비 시 알려 달라.
- 관리자 요청: Figma 근거 및 다음 FE 범위 인계 필요. QA 요청: 타입 필수/선택/nullable 및 실제 HTTP 직렬화 대조를 다음 인수에 포함해 달라.
- 실행/검증 명령과 미완료 범위는 apps/web/README.md에 있다.
## 2026-10-09 판 생성

TO: manager
아직 쓸 내용 없음. FE-1 대기.
