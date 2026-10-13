# 보드

## 사이클 04 검증 및 종료 (2026-10-13)

기존 GET 멤버 계약을 구현해 새 카드 담당자 선택·null 미지정·닉네임 표시·담당자 필터를 연결했다.
보드 상세 Figma6:69 전체 코드와 원본 브라우저 이미지를 확보해 보정했다. 로그인/내 보드/생성창 전체 정밀 일치와 기존 카드 담당자 PATCH는 남았다.
부모 실제 브라우저에서 로그인/상세 클릭/담당 생성/필터/이동/no-op/Viewer 수정버튼 숨김/1440×900 및390×844 시각 검증을 통과했다.
실제 클릭으로 Next 개발 배지가 로그아웃을 가리는 문제를 발견, devIndicators:false 수정 후 재기동 클릭→로그인 도착을 확인했다.
독립 QA 실제 HTTP/DB11개, Nest HTTP mock4개가 통과했다. BE 자체65개·FE mock23개 및 타입/최종 빌드는 별도 증거다.
API·프론트·DB를 종료하고 3301/3002/3003/55432 연결 거절을 확인했다. 데이터는 보존했다. main/push는 수행하지 않는다.
원자료: agents/shared/design-cycle04/BROWSER-RESULTS.md 및 이미지, QA 최종 인계와 cycle04 학습 문서.

## 사이클 04 실행 (2026-10-13)

사용자가 실제 브라우저 클릭·시각 검증, Figma 보정, 화면의 담당자 지정을 요청했다.
Figma 보드 상세 6:69의 디자인 context와 screenshot 조회 성공, in-app browser 자동화 연결 가능을 확인했다.
QA 선행 후 기존 GET 보드 멤버 계약을 BE에 연결하고 FE 담당자 선택·필터·표시 및 원본 기반 디자인 보정을 구현한다.
브라우저 조작은 부모만 수행하고 QA는 독립 HTTP/DB 검사와 새 test fixture 준비를 담당한다.
기존 데이터와 승인 정책을 유지하며 멤버 이메일·비밀 필드는 공개하지 않는다. 서버는 임시 실행 후 종료한다. main/push는 이번 배정 제외다.

## 사이클 03 실제 검증 및 종료 (2026-10-13)

카드 생성·이동 API와 BFF·임시 화면을 구현했다. 독립 QA 실제 DB/HTTP 검사 19개가 통과했다.
WIP 마지막 자리의 세 경합, 같은 카드 CAS, 태그 동시 생성, 재정렬·no-op, 활동 기록 실패 시 생성/이동 rollback과 임시 trigger 정리를 확인했다.
BE 자체 mock 64개와 FE mock 22개·타입 검사·빌드는 별도 증거이며 숫자를 합산하지 않는다.
첫 두 QA 실행의 실패는 계약 외 creatorId 응답 요구와 테스트 태그 길이 오류였다. 검사 도구를 수정한 새 run에서 통과했고 실패 데이터도 보존했다.
서버는 종료했고 3301/3002/3003/55432 TCP 연결 거절을 확인했다. DB 데이터는 보존했다.
실제 브라우저 클릭·시각 검증과 Figma 정밀 보정은 남았다. QA 최종 원문과 해설 문서를 통합 브랜치에 기록하며 main/push는 수행하지 않는다.

## 사이클 03 실행 (2026-10-13)

사용자가 카드 순서·같은 컬럼 이동/no-op·태그 자동 생성 및 임시 UI 정책을 모두 승인했다.
QA 선행 인수 기준 후 BE 카드 생성·이동과 FE 조작 화면을 병행한다. 독립 실제 검증 및 해설 후 통합한다.
기존 격리 DB 보존, run fixture만 사용하고 reset하지 않는다. 검증 후 서버를 종료한다. main 병합·push는 이번 배정에서 제외한다.

## 사이클 02 검증 및 종료 상태 (2026-10-12)

- 승인한 조회 정책을 계약에 기록하고 GET 보드 상세·컬럼·카드, BFF와 읽기 보드 화면을 구현했다.
- 독립 QA의 실제 DB/API/BFF 검사 19개가 통과했다. BE 자체 실제 검사 8개와 모의 테스트 49개, FE 모의 검사 18개 및 빌드는 별도 증거다. 서로 합산하지 않는다.
- 브라우저 자동화 표면이 없어 실제 클릭·시각 검증은 미실행이다. Figma 정밀 보정은 후속 작업이다.
- QA의 마지막 정적 검토에서 URL limit 숫자 원문 보존 오류를 발견했고, FE 수정·추가 검증 결과를 최종 QA 인계에 기록한다.
- 임시 API·프론트·격리 DB를 종료했다. 3301/3002/3003/55432 TCP 연결 거절을 확인했으며 DB 데이터는 보존했다.
- 카드 생성·이동은 내일 구현한다. 이번 결과는 codex/orchestration에서 통합하고 main 병합·push는 수행하지 않는다.

## 2026-10-12 사이클 02 실행 — 조회와 권한

사용자가 보드 상세·컬럼·카드 조회와 권한 완성을 요청했다.
카드 생성·이동 신규 구현은 내일 작업으로 보류한다. 오늘은 읽기 API/BFF/칸반 조회 화면만 배정한다.
QA 인수 기준 선작성 → 승인 필요한 조회 정책 확인 → BE/FE 병행 → 독립 실제 DB/HTTP 검증 → 해설 문서 순서다.
기존 격리 DB와 의존성을 재사용하고 새 테스트 fixture만 사용한다. reset/기존 데이터 삭제는 하지 않는다.
검증 서버는 필요한 동안만 실행하고 종료 상태를 인계한다. 새 main 병합·push는 이번 배정에 포함하지 않는다.

## 2026-10-12 학습 해설 및 main 반영

사용자가 사이클 종료마다 쉬운 설명·그림·표로 과정을 정리하는 하위 에이전트와
Astra 사용을 요청했다. 해설 역할은 docs/learning 및 agents/explainer에만 쓰고
제품 코드·정책을 변경하지 않는다. 이번 실행 요청 모델은 gpt-6-astra/high다.
사용자가 이후 main 병합과 push를 승인했다. 기존 main의 미커밋 QA/Nest 원본은
Git stash d8cdc75dd6a9d2da0f04d09961b1de011b976aec에 보존했다.
학습 문서·역할 규칙을 검토해 b9141e7로 커밋했다. main을 71e3dca에서 fast-forward했고
GitHub main push 성공 및 원격 동일 커밋 확인을 완료했다. 이 완료 기록은 후속 문서 커밋으로 남긴다.

## 2026-10-12 실제 DB 연결 검증 배치

사용자가 직전 제안(개발 PostgreSQL migration 및 실제 로그인→보드 생성→로그아웃 검증)의
다음 단계 진행을 승인했다. 기존 DB 미실행 제한은 이 격리 개발 검증 범위에서 해제한다.
기존 사용자 DB는 건드리지 않고 별도 데이터 폴더/port의 개발 DB를 준비한다.
BE: 기존 PostgreSQL 바이너리 재사용 조사, DB 실행/migration/실제 API 검증.
FE: 실제 Next BFF 연결과 cookie/Origin/서버 세션 복구 검증.
QA: 독립 DB/HTTP 인수 검증. 미구현 업무 API 및 시각/클릭 미실행은 분리 보고한다.
DB reset/기존 데이터 삭제, 제품 정책 변경, main 병합 및 push는 포함하지 않는다.
비밀과 DB 런타임 데이터는 .runtime 및 env에 보관하고 커밋하지 않는다.

## 2026-10-12 HTTP 연결 배치

Figma 참조: https://www.figma.com/design/uUzjrPIuWIrQG8a93G0rTq/
metadata에서 로그인 6:2, 내 보드 6:24를 확인했으나 상세 context/screenshot은 계정 호출 한도에 막혔다.
사용자가 “임시 UI 구현 후 디자인 보정”을 명시 승인했다. 이에 metadata와 계약 기반 임시 UI를 구현하며
Figma 고충실도 일치 검증은 후속으로 남긴다. 제품 정책 변경 승인은 아니다.

QA 인수 문장 선작성 후 BE register/login/refresh/logout, GET /me,
GET/POST /boards 및 AppModule 연결을 구현한다. FE는 기존 Figma 참조를 확인한 뒤
로그인/가입/내 보드 화면을 BFF에 연결한다. 디자인 링크는 사용자 답변 대기다.
이메일 입력 원문 비교와 삭제 anchor 이후 cursor 계속 조회는 사용자 승인되었다.
PATCH /me, 비밀번호 변경, 보드 상세/수정/삭제는 이번 배치에 포함하지 않는다.
DB 실행/연결, main 병합 및 push는 제외한다. 독립 QA 후 통합 브랜치에 결합한다.

## 2026-10-11 BFF 기반 배치

사용자가 B안(Next 서버 token 보관, browser HttpOnly session cookie)을 승인했다.
보드·인증·BFF 승인 기준은 docs/contract/v0.2.1.md다.
QA의 auth-bff 인수 문장 작성 후 BE 세션 저장/발급/회전/폐기 서비스와
FE Next 서버 중계를 병행 구현한다. 업무 API 전체/페이지 UI는 이번 배치 제외다.
DB는 설치/실행/연결하지 않는다. 스키마와 SQL, mock 검증만으로 DB 통과를 표시하지 않는다.
QA는 구현 완료 커밋을 독립 검토한다. 결과는 codex/orchestration에서 결합하며 main/push와 구분한다.

## 2026-10-11 Codex 조율 시작

사용자가 “기존 BE-1을 인계받아 하위 에이전트로 조율”을 요청했다.
이 배치의 기준은 codex/be1-recovery 최종 커밋 4ee00b2다.
기존 계약과 역할 폴더 권한은 유지한다. 이번 사용자 요청에 따라
통합 담당과 하위 에이전트 사이에는 작업 배정/결과 보고 메시지를 허용하고,
인계 결과는 계속 STATUS/OUTBOX에 기록한다. CHARTER는 변경하지 않는다.

- QA: BE-1 스키마, migration, 잠금, If-Match 정적 검토. 기능/DB 인수 통과와 구분.
- FE: FE-1 계약 타입 및 전송 어댑터. 세션/실서버 연결/화면 디자인은 이번 배치 제외.
- BE: 인증 및 내 보드 후속 계획, 미확정 정책과 구현 단위 기록. 제품 코드 변경 없음.
- DB 설치/실행/연결, 원격 push 및 main 병합은 이번 배치에서 수행하지 않는다.
- 각 역할은 별도 Worktree에 커밋하고 codex/orchestration에서 통합 검토한다.

아래 기존 턴 설명은 계약 및 QA 범위의 이력으로 보존한다.

관리자: 이 세션의 오케스트레이터. 구현하지 않는다.
감사: 별도 GPT 세션. `agents/audit/OUTBOX.md`에만 적는다.
계약: `docs/contract` v0.2.1. OpenAPI info.version 0.2.1.

## 현재 턴

순서: QA → BE → FE. 감사는 각 턴 산출물 이후.

### QA-1

실패하는 인수 문서를 `agents/qa/cases/`에 작성한다. 코드보다 케이스가 먼저다.

반드시 포함할 문장:

- Viewer의 카드 수정은 403, 행 불변
- 수락 전 보드 조회는 403 NOT_MEMBER
- 다른 보드 컬럼·선행·태그는 422 CROSS_BOARD
- 동시 순환 의존은 하나만 성공
- WIP 초과 이동은 409, column_id 불변
- 마지막 Owner 강등은 409 LAST_OWNER
- 마지막 완료 컬럼 해제는 409 LAST_DONE_COLUMN
- If-Match 없으면 428
- 검색에 비멤버 카드 없음
- DUE_SOON은 읽어도 같은 due_at이면 한 행, 지난 마감은 OVERDUE

### BE-1

QA-1 케이스를 읽은 뒤 `apps/api`에 NestJS + Prisma + PostgreSQL 골격을 만든다. 첫 구현은 복합 FK, 보드 행 잠금, If-Match다. UI를 만들지 않는다.

### FE-1

BE OUTBOX에 서버를 띄우는 방법이 적히기 전에는 화면을 만들지 않는다. 그때는 OpenAPI의 BoardListItem.myRole과 카드의 blocked, warnings만 타입으로 고정한다.

## 하지 말 것

- 코드잇 제공 API를 호출하지 않는다.
- Card.completed를 만들지 않는다.
- Owner 초대를 허용하지 않는다.
- LexoRank를 넣지 않는다.
