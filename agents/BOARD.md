# 보드

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
