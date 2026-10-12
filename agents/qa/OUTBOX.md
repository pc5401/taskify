# QA OUTBOX

최신이 위다. 지우지 않는다.

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

