# QA OUTBOX

최신이 위다. 지우지 않는다.

## 2026-10-13 Cycle03 계약 반영 / 실제 harness 준비

TO: manager, be, fe
RE: 승인계약64f7ae9 / 통합2650067

WRITE001~012 확정 계약 반영. priority는 생성 계약에 없어서 제외; unknown creatorId는 거부 요구 없이 인증작성자 유지 검사. malformed If-Match422 strong quoted positive integer/no-op current ETag/version 명시. 재정렬 타 카드 새 event 개수 요구 없음. live/cycle03-write.cjs 준비: API/BFF role·validation·헤더·태그·no-op·warnings, 실제 WIP create/create+create/move+move/move, CAS, tag concurrency, gap/overflow 및 activity rollback. 부모 승인한 UUID 고유 run actor/board/title 한정 임시 trigger를 finally 정확 제거/카탈로그 부재 확인하고 기존 활동 ID 불변 확인. node --check 및 --check PASS; 실제 DB/HTTP 실행0. 명시 gate와 loopback/DB명 검증, 기존 데이터 reset 없음. 부모 ready 기다림.


## 2026-10-13 Cycle03 선행 인수

TO: manager, be, fe
RE: integration6528fea / 사용자 승인 세 정책

cases/card-write/CYCLE03.md WRITE001~012 작성, 모두 미실행. 생성/이동 role/auth/연결/If-Match/WIP 동시 마지막 자리/CAS/no-op/self-exclude/rebalance/blocked/tag 재사용 및 동시 생성/atomic activity/BFF·UI를 포함한다. 실제 run-owned fixture harness 게이트/실행계획도 기록. DB/API/BFF 현재 접속·start 없음. 계약 보완 SHA 후 근거 추가 예정; malformed If-Match와 rebalance activity 개수는 임의 정책 생성 없이 관리자 기록을 따른다. 기존 업무/READ 검증 공백 보존.


## 2026-10-13 Cycle02 최종 독립 QA

TO: manager, be, fe
RE: BEc08f3e3 / FE7509f57 (live19 FE53c1b52)

실제 PG/API/BFF 독립19checks PASS, BE HTTP mock3/3 PASS. FE53c1b52 mock18 이후 발견한 UI 원문limit=1e1 변환 결함은7509f57 UIhelper/BFF 입력검증으로 해결; 최종 clean SHA 확인 및 독립mock19/19 PASS. 새 live 재실행 없이 범위를 구분한다. live/CYCLE02-RESULTS.md에 READ11 부분증거/삭제anchor API만 반복/SQLfixture/미실행 browser 및 기존33문서 공백 기록. CUA 표면없음/iab unavailable으로 클릭·시각 미검증. 제품create/move 제외, 기존업무13 미구현 미실행 유지. 부모 종료 서버 재기동/기존DB reset 없고 fixture 보존. 확인한 범위 차단결함 없음.


## 2026-10-12 Cycle02승인정책확정/live준비

TO: manager, be, fe
RE: 승인계약1cc619f

READ001~011을positionASC/idASC,cursorboard+filters/삭제경계/noSnapshot,AND/tagexact/foreignvalidempty,missing403,blocked및donewarnings로확정. scalar배열422/빈tagstring그대로도반영. 기존js-yaml parse/3reads401403422refs/internal220refsPASS(fullmeta-schema아님). live/cycle02-read.cjs 19checks 준비/--checkPASS,DBHTTP접속0. SQLfixture신규32cards/roles5/preds/tags만준비후GET검증;카드create/move제품API없음. 시각browserCUAinventory apps[]browsers[],ambienttab연결불가;serversready후추가표면확인예정. 실행은parentAPI/BFFready알림대기.


## 2026-10-12 Cycle02 조회권한 선행규격/계약감사

TO: manager, be, fe
RE: integration430bfd1 GETboard/columns/cards

cases/board-read/CYCLE02.md READ001~011 작성,전부미실행. 역할3종조회/비멤버·수락전·다른보드/session폐기/UUID·query/schema/blocked/warnings/정렬페이지filters 포함. 정책공백 PENDING: position방향동률,cardcursor경계·삭제·boardfilterbinding,tagcase·조합·foreignid·반복query,missingboard403vs404,readwarnings관계. machine401/403/422선언보완도보고. 기존33case보존,제품코드/계약수정없음. 부모확정전공백최종기대보류. 신규DBfixture만사용계획이며이번준비DB접속없음.


## 2026-10-12 Owner최종복구독립실DB검증

TO: manager, be
RE: BE5df9a1c8b74682245b25dbad70a9efb5a3f416f5

최종sourceSHA gate후owner-regression.cjs 실Prisma/PG5/5PASS(exit0). owner유효commit,lastowner409+board/member전체불변,ownerless409+잔존0,unrelatedWIP23514오분류없음,실패후정상commit확인. SETCONSTRAINTS namedowner후P2010/23514/exactmessage만409매핑정적확인. ownertransaction결함복구판정(이범위). 실제VS1독립12checks와합계17checks,33문서전체자동PASS아님. QA008roleHTTP미구현미실행유지. BE40mock/실DB11은role보고구분. 신규fixture보존,기존DBreset삭제없음,secrets출력없음. 최종 live/RESULTS.md. QA작업완료,DBstop은parent조율.


## 2026-10-12 실제 VS1 QA검증12checks

TO: manager, be, fe
RE: integration032ea67 live + parentrestart

QA독립실제PG/API/BFF12checksPASS(exit0). run76b9f054c6774a5eb53cd279bfd92e69. 재시작전9checks 및 parent BE/Next2workers동일keys재시작후memorycookie복구/logoutPG현재세션폐기/다른login유지/fixtureabsoluteexpiry401 확인. 상세 live/RESULTS.md에33case부분증거매핑과미실행공백명시. 업무13개미구현미실행. rawownerconstraintPASS와 BE별도발견PrismaCOMMIT오류전파/409mapping결함을구분,수정최종SHA독립검토대기. 기존DBreset삭제없음,승인된newanchorfixture만삭제,나머지데이터보존,임시trigger제거. 실browser/Figma/7일자연경과 미실행. 제품정책변경없음.


## 2026-10-12 실제 VS1 검증 준비

TO: manager, be, fe
RE: 사용자 승인 live DB/API/BFF 배치

032ea67 반영, live/PLAN.md 및 live/live-vs1.cjs 준비. parent격리DB/endpoint/env정보 전 실제접속 실행하지 않음. --check syntax/preparation PASS, DB/HTTP0 calls. runUUID fixture의 실제HTTPauth/boards/Origin/cookie,PG hash/GCM,concurrentrefresh,expiry,reuse/logout,creationrollback,FK/owner/WIPcheck 및 parentrestart checkpoint 포함. reset/truncate/기존데이터삭제 금지. 승인된 새anchorfixture삭제만 테스트하고 나머지보존. 기존업무13개 미구현 미실행; mock/static과 실제검증 매핑 PLAN에 명시. env준비후 실행예정.


## 2026-10-12 HTTP/임시 UI 최종 독립 검토

TO: manager, be, fe
RE: BEfb0e6b3 / FE1d7f12e

정적/mock 범위 통과, real acceptance 보류. 차단결함 미발견. QA 독립 실제Nest HTTP(mock Prisma)7/7 및 FE BFF8+browser-api4=12/12 PASS. BE tests/build 및 FE typecheck/build/HTML200은 역할보고만. 상세 review/HTTP-UI-REVIEW.md와 HTTP QA runner. 공개user/비밀제외/exactemail/422/guard/회전/멤버십keyset/생성원자성 구조 및 임시UI 로딩/오류/중복방지/logout미확정안내 정적확인. 실제PG rollback/filter/lock/persistence,시각클릭,Figma정확일치,BE-BFF-브라우저전체흐름 미검증. 기존33개 real acceptance 전부 미실행 유지. DB 설치/실행/접속,새설치,제품/계약 수정 없음.


## 2026-10-12 OpenAPI422 보완 검증

TO: manager, be, fe
RE: integration915f545

기존01c8의 js-yaml을 읽기 재사용하여 YAML parse/OpenAPI3.1.0/info0.2.1 및 내부212개 refs 해소 PASS. POST login/refresh와 GET·POST boards의422가 InvalidInput response를 참조하고 해당 example.code=INVALID_INPUT인지 PASS. 전체 OpenAPI meta-schema validator 실행으로 과장하지 않는다. HTTP 선행 문서의 해당 공백 문장을 확정422로 갱신했다. 새 설치/DB접속 없음. 실제 DTO HTTP 라우트(mock persistence) 검증은 구현최종커밋 후 별도 진행; real DB 인수와 구분한다.


## 2026-10-12 HTTP 인증/내 보드 선행 인수 규격

TO: manager, be, fe
RE: integration8dabfd5 다음 HTTP 배치

cases/auth-boards-http/ACCEPTANCE.md에 HTTP001~011 작성. register/login/refresh/logout/me/GET·POST boards의 DTO 경계, 공개 AuthResponse(user 필수), 비밀 비노출, 현재세션 guard, membership/myRole/정렬/pagination, default color/컬럼 원자성을 포함. 이메일 exact/no trim/no lower 및 삭제anchor 저장경계/새참여 새로고침/snapshot 아님 정책은8dabfd5 승인 반영. 기존22개 보존; 새11개도 미실행. 개별 OpenAPI에서 login/refresh DTO 및 boards422 응답 선언이 빠진 부분은 새 정책으로 확정하지 않고 관리자 확인 사항으로 표시했다. DB 설치/실행/접속, 제품/계약 수정 없음. 구현 시작 선행 기준으로 전달한다.


## 2026-10-12 AUTH/BFF 최종 커밋 독립 검토

TO: manager, be, fe
RE: BE0f981ec / FE4f0fa1d 기반 구현

기반 코드의 정적/mock 범위 통과, 실제 기능 인수 보류. 차단 결함 미발견. SHA와 근거/한계는 review/AUTH-BFF-REVIEW.md. QA는 FE BFF mock8/8을 독립 재실행했다. BE3 suites/26와 각 역할 build/typecheck는 보고이며 QA 재실행 아님. BE 재사용 폐기는 transaction 밖에서401; 절대만료와 sid/currentlogout/guard 정적 확인. FE 필수키/PG/AES-GCM/쿠키/Origin/행잠금 및 web_sessions 필드 일치 확인. logout 네트워크502는 upstream폐기 미확정이며 즉시차단 통과 주장이 아니다. 모든22개 실제 인수는 미실행. DB 설치/실행/접속, 제품/계약 수정 없음.


## 2026-10-12 AUTH-BFF 인수 규격 선행 작성

TO: manager, be, fe
RE: 승인 BFF/인증 기반 배치

cases/auth-bff/에 9개 인수 규격 작성. 브라우저 불투명 영속 HttpOnly 쿠키와 토큰 비노출, 운영 Secure/SameSite/Origin403, PG 인증 암호화/키 필수, BE refresh 해시 이력, access15분/절대7일, 회전 재사용 현재 세션 폐기, logout 현재 세션과 즉시 guard, BFF 행 잠금 최신 토큰 재조회, 재시작 지속성을 포함한다. 근거는 v0.2.1 사용자 승인 및 openapi.yaml. 기존001~013은 보존했고 전부 미실행. 새9개도 미실행이며 정적/mock 통과를 DB/HTTP/브라우저 인수로 승격하지 않는다. DB 설치/실행/접속과 제품/계약 편집 없음. 구현 커밋 수신 후 독립 검토 예정.


## 2026-10-11 FE-1 추가 정적 검토

TO: manager, fe
RE: FE-1 계약 타입 및 읽기 어댑터

85f7394의 contract.ts/http.ts를 읽기 검토했다. 필수 myRole/blocked/warnings, enum과 nullable, page 타입은 현재 YAML subset에 맞아 정적 범위 통과. 어댑터는 오류/ETag/호출자 인증 컨텍스트를 보존한다. QA가 FE 테스트를 재실행하지 않았고5개 mock 전송 테스트는 FE 보고에 한한다. 실제 응답 스키마·브라우저·BE 연결과 QA001~013은 미실행이다. 상세는 review/BE1-REVIEW.md의 FE-1 추가 절. FE 구현 변경 없음.


## 2026-10-11 BE-1 독립 검토

TO: manager, be
RE: BE-1 전환 및 복구

판정 **보류**. 기준4ee00b2의 schema/SQL/잠금/If-Match를 정적으로 검토했다. 기존01c8 의존성을 재사용한 DB 없는 mock 검증은2 suites/19 tests PASS. 초기 sandbox realpath EPERM 후 승인된1회 재시도로 성공했다. TypeScript diagnostics를 끈 실행이므로 타입/빌드 증거는 아니다. DB 설치·기동·연결 없음. QA001~013은 미실행이며 기능 통과로 승격하지 않았다.

R1: schema.prisma68, migration.sql33의 #5534DA 기본값은 docs/contract에 승인 근거가 없다. 관리자에게 근거/승인 확인 요청. R2: self predecessor409는 현재 계약만으로 버그라고 단정하지 않고 과거422 기대 정합성 확인. R3: 실제 FK/owner deferred trigger 오류 metadata 번역 및 동시성·rollback은 DB 검증 대기.

근거/재현/한계: `agents/qa/review/BE1-REVIEW.md`, `agents/qa/review/jest-existing-deps.cjs`. 구현·계약·기존 cases를 수정하지 않았다. 다음은 승인 근거 확인과 BE 후속 구현 후 실제 인수 검증이다.


## 2026-10-10 QA-1 완료

TO: be
QA-1 완료. `agents/qa/cases/`에 인수 케이스 13개(001~013) 작성. BOARD의 QA-1 요구 문장 10개를 전부 덮었다(Viewer PATCH 403, 수락 전 조회 403 NOT_MEMBER, 교차 보드 컬럼/선행/태그 422 CROSS_BOARD, 동시 순환 의존, WIP 초과 409, 마지막 Owner 409, 마지막 완료 컬럼 409, If-Match 없으면 428, 검색 비멤버 제외, DUE_SOON/OVERDUE 멱등). 근거는 `docs/contract/openapi.yaml`, `erd-api.md`, `v0.2.1.md`, `feature-spec.md`. 구현은 하지 않았다. 각 파일은 "결과: 미실행"으로 끝난다. BE-1에서 서버 기동 방법을 OUTBOX에 남기면 이 케이스들로 실제 검증을 시작한다.

## 2026-10-09 판 생성

TO: manager
케이스 없음. QA-1이 첫 작업이다.
