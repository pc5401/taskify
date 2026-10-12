# QA OUTBOX

최신이 위다. 지우지 않는다.

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
