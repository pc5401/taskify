# Taskify ERD · API 계약 v0.2

상태: v0.1의 개정. 전체 재설계가 아니다.
유지: PostgreSQL, BoardMember 역할, Column.is_done, Card.predecessor_id, 계산형 Blocked, 정수 position 간격 1024, NestJS + Prisma, 자체 API.
이 문서에서 v0.1과 다른 문장은 변경으로 표시한다.

## 변경 요약

| # | v0.1 | v0.2 | 이유 |
|---|---|---|---|
| 1 | 다른 보드 연결을 애플리케이션이 거절 | 복합 FK로 DB가 거절. 트랜잭션은 같은 검사를 먼저 한다 | 앱 누락 시 고아 관계가 생긴다 |
| 2 | 의존 쓰기는 카드 두 행만 잠금 | 의존 쓰기는 보드 행 FOR UPDATE 후 순환 검사 | A→B와 B→A가 동시에 통과한다 |
| 3 | DUE_SOON unique가 read_at is null | (user, card, due_at) 영구 unique. 지난 마감은 OVERDUE | 읽은 뒤 같은 알림이 다시 생긴다 |
| 4 | Owner 초대 문장이 요청과 명세에서 흔들림 | v1은 Owner 초대 금지. 소유권은 멤버 role 변경만 | 초대와 승격의 동시성 경로가 둘이면 마지막 Owner 검사가 샌다 |
| 5 | 엔드포인트 목록 | OpenAPI 3.1 파일로 스키마 고정 | 에이전트가 필드명을 추측한다 |
| 6 | 완료 컬럼 개수 무정책 | 보드당 is_done 컬럼 1개 이상 | 0개면 Blocked가 영구히 안 풀린다 |

## 1. 교차 보드 제약

변경. v0.1은 카드에 board_id를 중복 저장하고 앱이 검사했다. v0.2는 그 중복을 복합 FK의 재료로 쓴다.

필수 unique:

- columns (id, board_id)
- cards (id, board_id)
- tags (id, board_id)
- board_members (board_id, user_id) 는 v0.1부터 unique

FK:

- cards (column_id, board_id) → columns (id, board_id)
- cards (predecessor_id, board_id) → cards (id, board_id). predecessor_id가 null이면 MATCH SIMPLE로 검사하지 않는다
- cards (board_id, assignee_id) → board_members (board_id, user_id). assignee_id가 null이면 검사하지 않는다
- card_tags.board_id 를 두고 (card_id, board_id) → cards, (tag_id, board_id) → tags

check cards.predecessor_id <> cards.id 유지.

트랜잭션은 INSERT/UPDATE 전에 같은 조건을 보고, 어기면 422 CROSS_BOARD. DB가 나중에 거부하면 409가 아니라 422로 번역한다. 에이전트는 복합 FK를 Prisma schema에만 적고 migration SQL을 빼지 않는다. Prisma relation 이름과 DB 제약 이름이 달라도 DB가 이긴다.

## 2. 의존 순환과 보드 잠금

변경. 카드 행만 잠그면 두 트랜잭션이 서로의 쓰기를 보기 전에 순환 검사를 통과한다.

의존 설정·해제만 보드 행을 잠근다.

1. SELECT boards.id FROM boards WHERE id = :boardId FOR UPDATE
2. 두 카드가 그 보드인지 확인. 아니면 CROSS_BOARD
3. predecessor를 따라 올라간다. 시작 카드를 만나면 409 DEPENDENCY_CYCLE
4. predecessor_id 갱신, card.version 증가, activity

카드 제목 수정과 WIP 이동은 보드 행을 잠그지 않는다. WIP는 도착 컬럼 행 FOR UPDATE가 그대로다. 보드 잠금을 모든 쓰기로 넓히지 않는다.

보드 행 잠금은 Owner 변경과 의존 쓰기를 서로 직렬화한다. MVP에서 그 경합은 허용한다. advisory lock은 쓰지 않는다. 행 잠금이 트랜잭션 종료와 함께 풀리고 의도가 쿼리에 보인다.

## 3. 알림 멱등

변경. v0.1 부분 unique는 read_at is null이라, 읽으면 같은 DUE_SOON이 다시 insert된다.

Notification에 due_at_snapshot timestamptz null을 추가한다. DUE_SOON과 OVERDUE만 채운다.

unique (user_id, type, resource_id, due_at_snapshot) where type in (DUE_SOON, OVERDUE).

job은 INSERT ... ON CONFLICT DO NOTHING.

- 완료 컬럼이 아닌 카드, assignee 있음, now() >= due_at - 24h 이고 now() < due_at 이면 DUE_SOON 한 번
- now() >= due_at 이면 DUE_SOON을 만들지 않는다. OVERDUE 한 번
- 읽음은 unique에 영향 없다
- due_at이 바뀌면 snapshot이 달라 다시 한 번 보낼 수 있다
- 담당자가 바뀌면 새 user_id라 그 사용자에게 한 번
- 완료 컬럼으로 옮기면 기존 알림은 지우지 않고, 새 알림만 멈춘다

## 4. Owner 초대와 마지막 Owner

변경, 정책 확정. v1에서 Owner 역할 초대는 없다. requested_role은 EDITOR | VIEWER만. Owner가 OWNER를 초대해도 403 FORBIDDEN, details.reason = OWNER_INVITE_NOT_ALLOWED.

소유권 이전은 PATCH /boards/{id}/members/{userId} role=OWNER 뿐이다. 기존 Owner가 실행한다. 이 경로는 초대 수락과 분리된다.

마지막 Owner:

- 멤버 role 변경, 멤버 삭제, 보드 삭제 전 소유권 검사은 보드 행 FOR UPDATE 후 owner 수를 센다
- 변경 결과가 owner 0이면 409 LAST_OWNER
- 초대 수락은 Owner를 만들지 않으므로 이 잠금이 필요 없다
- migration에 deferred constraint trigger를 둔다. 커밋 시 보드의 owner 수가 0이면 거절. 앱 잠금을 빼먹어도 DB가 막는다

## 5. 완료 컬럼 정책

신규 결정. 완료 컬럼은 보드당 1개 이상이어야 한다. 여러 개는 허용한다.

이유: Blocked 해제는 is_done 컬럼 진입이다. 0개면 의존이 영구 차단이고, OVERDUE job도 끝나지 않는다.

- 보드 생성 시 세 번째 기본 컬럼만 is_done=true
- 마지막 is_done 컬럼을 false로 바꾸거나 지우면 409 LAST_DONE_COLUMN
- 카드가 있으면 삭제는 여전히 COLUMN_NOT_EMPTY가 먼저다

## 6. If-Match와 페이지

변경. versioned 자원의 PATCH, move, dependency, checklist, tags, column reorder를 제외한 column PATCH, member role PATCH, board PATCH는 If-Match 필수.

없는 If-Match는 428 IF_MATCH_REQUIRED. 헤더와 body version이 다르면 422 INVALID_INPUT. 서버 version과 다르면 409 VERSION_CONFLICT.

ETag 응답은 "version" 문자열. 클라이언트가 다음 If-Match에 그대로 넣는다.

목록은 cursor다. query cursor, limit default 20 max 100. 응답은 { items, nextCursor }. nextCursor가 null이면 끝. offset 페이지는 없다.

## 7. 오류 추가분

v0.1 코드를 유지하고 아래만 추가한다.

- 422 CROSS_BOARD
- 403 details.reason OWNER_INVITE_NOT_ALLOWED. code는 FORBIDDEN
- 409 LAST_DONE_COLUMN
- 428 IF_MATCH_REQUIRED

## 8. OpenAPI

기계가 읽는 계약은 taskify-openapi-v0.2.yaml 이다. 이 마크다운과 어긋나면 yaml이 필드명에서 이기고, 이 마크다운이 잠금과 정책에서 이긴다. 어긋남을 발견하면 v0.3으로 고치고 에이전트에게 둘 중 하나를 고르라고 하지 않는다.

## 9. QA에 추가된 문장

- 다른 보드 컬럼으로 카드 이동 → 422 CROSS_BOARD, 행 불변
- 다른 보드 카드를 predecessor로 → 422 CROSS_BOARD
- 다른 보드 Tag 연결 → 422 CROSS_BOARD
- 동시에 A→B, B→A → 하나만 201/200, 다른 하나는 409 DEPENDENCY_CYCLE
- DUE_SOON을 읽은 뒤 job이 다시 돌아도 같은 due_at이면 행이 하나
- due_at이 지난 카드는 DUE_SOON이 아니라 OVERDUE 한 행
- Owner 역할 초대 → 403 OWNER_INVITE_NOT_ALLOWED
- 마지막 is_done 컬럼 해제 → 409 LAST_DONE_COLUMN
- If-Match 없는 카드 PATCH → 428 IF_MATCH_REQUIRED
