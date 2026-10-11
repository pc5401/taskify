# QA 상태

턴: QA-1. 완료.
근거: `agents/BOARD.md` QA-1, `docs/contract/openapi.yaml` (info.version 0.2.1), `docs/contract/erd-api.md`, `docs/contract/v0.2.1.md`, `docs/contract/feature-spec.md`.
한 일: `agents/qa/cases/`에 인수 케이스 13개 작성. BOARD의 QA-1 요구 문장 10개를 모두 덮음.

| 케이스 파일 | 덮는 문장 |
|---|---|
| 001-viewer-cannot-patch-card.md | Viewer의 카드 수정은 403, 행 불변 |
| 002-get-board-before-accept-403-not-member.md | 수락 전 보드 조회는 403 NOT_MEMBER |
| 003-cross-board-column-move-422.md | 다른 보드 컬럼은 422 CROSS_BOARD |
| 004-cross-board-predecessor-422.md | 다른 보드 선행은 422 CROSS_BOARD |
| 005-cross-board-tag-422.md | 다른 보드 태그는 422 CROSS_BOARD |
| 006-concurrent-dependency-cycle-one-wins.md | 동시 순환 의존은 하나만 성공 |
| 007-wip-exceeded-move-409.md | WIP 초과 이동은 409, column_id 불변 |
| 008-last-owner-demote-409.md | 마지막 Owner 강등은 409 LAST_OWNER |
| 009-last-done-column-unset-409.md | 마지막 완료 컬럼 해제는 409 LAST_DONE_COLUMN |
| 010-if-match-required-428.md | If-Match 없으면 428 |
| 011-search-excludes-non-member-cards.md | 검색에 비멤버 카드 없음 |
| 012-due-soon-idempotent-same-due-at.md | DUE_SOON은 읽어도 같은 due_at이면 한 행 |
| 013-overdue-after-due-at-passed.md | 지난 마감은 OVERDUE |

각 파일은 미구현 상태의 "결과: 미실행"으로 끝난다. 구현을 만들지 않았다.
막힘: 없음.
다음: BE가 `apps/api` 골격(BE-1)을 만들면, 서버 기동 방법이 OUTBOX에 적힌 뒤 이 케이스들을 실제 요청으로 실행하고 결과를 각 파일 아래에 추가한다.
