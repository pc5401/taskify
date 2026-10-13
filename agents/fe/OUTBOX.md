## Cycle04 actual parent browser evidence

TO: manager, qa
Parent reported owner login → board link → editor-assigned card creation → editor assignee filter PASS. 1440x900 reference colors/sidebar/card geometry and390x844 responsive pageWidth375<=390, dialog internal scroll/close PASS; no current visual defects. These are parent-owned actual browser evidence, distinct from FE mocks/build. Reference/product screenshots reside integration/agents/shared/design-cycle04; final CSS/config production build PASS after parent dev stop.

## 2026-10-13 Cycle04 parent browser handoff

TO: manager, be, qa
- Members GET type/BFF/browser method, real assignee select/null unset, filter and safe nickname display; no credential/directory exposure or raw UUID assignment UI.
- QA first79e0c09 and final2d71448 read; source83ab6c2 contract followed. mock23/23,typecheck PASS. production build PASS; last mobile/action CSS awaits parent visual acceptance.
- Full Figma6:69 original code + parent valid51% canvas screenshot read. Own context/metadata/screenshot each hit Starter limit once. No static asset/Code Connect declared. Scoped colors/geometry corrected, product board color policy unchanged.
- Creation/move dialog preserves business interactions; current user/sample content uses real data. Mobile sidebar72/dialogscroll; unimplemented nav disabled. Exact creation-dialog/login/myboards Figma source unavailable and no precise-match claim.
- Parent owns real browser1440x900/390x844 and runtime. Do not count mock/build as click/visual acceptance. See CYCLE04-PREP.md for complete reference/evidence detail.
## 2026-10-13 Cycle03 creation/movement handoff

TO: manager, be, qa
- QA first6e3b8e9/final8d9294d and approved64f7ae9 read before final implementation.
- Added fixed UUID POST BFF create/move, server-only credentials and existing Origin rejection, If-Match forwarding, ETag/error status relay. No auth policy relaxation.
- Browser create optional fields preserved; movement uses current quoted version and Card/ETag envelope. myRole search traverses board-list pages, final permission stays server.
- Temporary create form and select movement, full reload on success/no-op/409/428, persistent conflict notice, synchronous submission guard. Filtered candidates explicitly stated. No invented member endpoint/raw UUID assignment UI.
- mock22/22 and typecheck PASS; production build PASS. Actual concurrency/DB/browser evidence belongs to independent QA; this mock evidence does not replace it.
- User approved temporary UI after existing Figma Starter limit; precise correction remains follow-up.
# FE OUTBOX

최신이 위다. 지우지 않는다.
## Cycle02 읽기 BFF/임시칸반 구현

TO: manager, qa, be
RE: 사용자조회정책전체/새임시UI 승인

QA5e3e6bd READ001~011선행읽고approvedcontract1cc619f를제품코드전병합.
Figma mandatoryskill읽은뒤6:69context스크린샷포함1회Starter한도실패; 사용자
새임시UI후디자인보정예외승인에따라metadata/기존UI/계약으로구현. 정밀일치PASS아님.
GET /api/boards/{uuid},/columns,/cards fixedtarget검증/GETonly; cardquery
cursor/limit/columnId/assigneeId/tag whitelist인코딩, repeatedscalar/UUID/limit422,
exact/emptytag보존/unknownkey별도거절없음. 서버Bearer/cookie/PGrefresh/token
redaction/ETag/error/no-store재사용. browserallCards 끝page까지query/signal유지,
serverorder/id중복방지/repeatedcursorerror. /boards/[boardId]읽기kanban와내보드
실제Link. Board→columns→allcards모두성공전partialcontents없고requestkeyscope,
401login/403비노출/422/loading/empty구분. FErole계산/BoardmyRole/Cardcompleted없음.
Cardblocked/warnings서버값만표시. 생성/이동/쓰기버튼없음. column/tagUIfilter와
API/URLassigneeId/limit전달지원, memberdirectory/UUID입력제품flow발명없음.

mock18/18및typecheckPASS, NextproductionbuildPASS dynamicboardpage+GET3route확인.
부모web3002상세SSR200/초기로딩/쓰기control없음/tokenfield없음보조확인은UIroute
smoke이며실제browserdata/click인수아님. QAactualBFFread독립fixture검증진행중;
FE추가liveharness중복없음. cycle01의41checks를cycle02증거로확대하지않는다.
부모dev자동next-env경로변경은trackedproductionbaseline으로정리; 수동제품정책변경없음.
README/CYCLE02-PREP에Figma보정및검증한계기록. 서버stop은부모runtime조율.

## Cycle02 조회 FE 선행 준비

TO: manager, qa, be
RE: 보드상세/컬럼/카드 읽기 및권한

integration430bfd1/QA5e3e6bdd반영, READ001~011과PENDING읽었다.
Figma mandatorydesign-to-code skill읽고 기존detail6:69context를스크린샷포함
1회요청했으나Starter한도실패. 반복없음. 새임시UI예외와조회정책은부모가
사용자에게질문했으므로승인전제품코드대기. CYCLE02-PREP.md에BFFstrictUUID/
GET허용target/query whitelist,allcardpages순차조회/id중복방지/repeatedcursor/
AbortSignal,서버권한/error/blocked/warnings보존,실제Link/빈상태/UI범위기록.
Next설치page/route docs읽어dynamicparamsPromise확인. 정책임의확정없음.
이번DB/API/브라우저검증미실행, 기존41checks재실행없음. main병합/push 및
카드생성/이동은이번범위제외. 사용자승인과계약/QA PENDING갱신후재개한다.

## 2026-10-12 실제 BFF HTTP/PostgreSQL 검증

TO: manager, qa, be
RE: 사용자 실제격리 DB/API/BFF 검증 승인

integration032ea67반영후 BEisolatedPG18.4 loopback55432/taskify_validation 및
actualNest3301, Nextproductionworkers3002/3003으로 initial29/recovery12 총41
namedchecks PASS. checks/live-bff.mjs와live-worker.mjs 및 LIVE-BFF-RESULT.md.
Origin누락/불일치403, user-only/tokenfield제외, opaque persistentprodSecurecookie,
실PGciphertext/hashlookup, 실제accessTTL900/me/boardcreate/defaultETag/myRole/
invalidcursor422 확인. 부모승인된 이번fixture행에만 expiredaccess재서명/암호문
수정(iat/exp차900, 제품TTL불변)후 two workers동시me요청 성공과 PG회전기록
증가정확1/absolute expiry불변 확인. 동시process PG경로검증이며 fixture시간주입과
자연900초경과를 구분한다. 최초gate는 inet::textCIDR표기로 fixture생성전거절;
host(inet_server_addr())정규화후 동일 loopback/port/dbname gate통과.

QA/부모동기화로 BE+Next2workers 동일env/key/DB재시작. 같은 암호화fixturecookie로
두workeroriginaluser200복구와 expiry불변. logout204/cookieMaxAge0/localPGrevoke,
oldcookie401 및 previousupstreamaccess/me401 PASS. 기존DB/reset/drop/delete없고
fixture데이터보존. runtimeenv/state secret은 ignored .runtime, 출력/커밋금지 확인.
브라우저enabledapps/browsers empty라 actualHTTP cookiejar범위; HTTPS브라우저
Secure전송/저장소/종료/시각/click, 자연7일만료/PG서버재시작 인수는 아니다.
현재Next2workers는 부모cleanup신호까지 유지. 디자인정밀보정한도재시도없음.

## 2026-10-12 임시 UI 구현 및 인계

TO: manager, qa, be
RE: Figma 참조 및 사용자 임시 UI 승인

QA auth-boards-http ACCEPTANCE와 최신 integration915f545를 코드 전 병합/읽었다.
Figma mandatory skill 적용 후 root metadata로 login6:2, boards6:24를 확인했으나
고충실도 context/screenshot은 Starter MCP 한도로 차단. 사용자가 '임시 UI 구현
후 디자인 보정'을 명시 승인하여 metadata/계약 기반 Next/Tailwind UI를 작성했다.
정확한 Figma 재현/시각 통과를 주장하지 않는다. 디자인 보정 후속은 README.

/login,/register,/boards 및 루트 redirect. 브라우저 client는 BFF 상대 경로와
same-origin 쿠키만 사용, token 저장/Authorization 없음. 원문 email/password
변환 없음. email type=text/inputMode=email은 브라우저 공백 보정을 피한다.
myRole/server order/opaque cursor/nextCursor=null 유지,422 책갈피 오류 구별.
생성 기본 color 생략, 성공 후 첫 페이지 복귀. 로그인/복구401/빈목록/로딩/
오류/취소 및 반복 제출 방지. logout204와502 local-completed/upstream-unconfirmed
상태 구별. 미구현 상세/초대/검색/마이페이지에 가짜 활성 링크 없음.

typecheck PASS, BFF8+browserclient4=12 mock PASS, Next production build PASS.
Next dev DB-free 시작 및 localhost HTML/login,/register,/boards 모두200과
해당 폼/제목 확인 후 종료. 브라우저 inventory=[]여서 시각/클릭 미검증.
실제 DB 설치/기동/접속, Nest auth/boards 통합 인수 미실행. 임시 UI는 실서버
인수 성공이 아니다. Tailwind4.3.3; PostCSS8.5.6 install finding을8.5.29로
패치하고 npm 보고0 vulnerabilities. Next dev 자동생성 AGENTS.md를 포함하고
설치 Next docs client-components/useSearchParams 확인, Suspense 적용.
README의 BE endpoint부재/불필요 별도dev승인 문구를 현재 HTTP구현/DB미검증으로 정정.
QA 독립 검토 요청. 근거 src/browser-api.ts, src/ui, app 및 README.

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

## Cycle02 QA limit 회귀 수정
- URL limit 원문을 digits 및 integer 1..100으로 검증한 뒤 변환한다. UI와 BFF 모두 1e1/공백/+10/소수/hex를 422로 처리한다.
- UI parser와 BFF의 동일 입력 회귀 검사 추가: mock 19/19 및 typecheck PASS. Next production build PASS.
- 독립 QA 실제 HTTP 읽기 19 PASS는 부모 보고 수신. 브라우저 unavailable이며 SSR shell HTTP와 실제 click/visual 검증을 구분한다. 임시 UI의 Figma 정밀 보정은 후속이다.

Cycle03 final note: production build PASS (including no-op status notice). Subsequent UUID role comparison accepts uppercase UUID with regression mock22/22 + typecheck PASS. Tag blank lines are preserved and server422 applies. Live dev picks up source; actual QA and browser evidence remain separately recorded.

Parent additional actual UI evidence: move/no-op PASS, Viewer login/detail with write0/add0 and assignee filter PASS. Logout keyboard Enter PASS; mouse click was intercepted by Next default development badge. Installed Next devIndicators docs read and next.config.ts devIndicators:false added. Parent final mouse click recheck PASS after restart; arrived at login.

Cycle04 final evidence: parent restarted dev with ceaa97b and confirmed actual mouse logout click PASS → login arrival. No product source changed after that fixed SHA; this commit corrects handoff evidence only. Parent coordinates temporary service shutdown.
