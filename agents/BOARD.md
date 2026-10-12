# 보드

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
