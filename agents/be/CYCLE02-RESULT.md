# Cycle02 board reads BE result

QA prerequisite5e3e6bd was read before implementation. User approved the full read
policy proposal; coordinator explicitly delegated contract writing to BE for this
batch. Contract1cc619f records that approval and adds401/403/422 OpenAPI responses.
No new policy or schema/migration was invented by implementation.

## Delivered behavior

- GET /v1/boards/:boardId returns public Board and version ETag.
- GET /v1/boards/:boardId/columns returns public Column items, no cards.
- GET /v1/boards/:boardId/cards returns CardPage, tags, computed blocked/warnings.

SessionGuard protects every route. OWNER/EDITOR/VIEWER membership is sufficient;
missing boards, nonmembers and pending invitees receive403 NOT_MEMBER. UUID/query
format violations receive422 INVALID_INPUT; invalid sessions receive401. GET reads
do not mutate version, dates, position or relationships. Only new GET routes were
added; card creation/movement remains outside the product batch.

Columns and cards order position ASC/id ASC. Card filters are AND and tag is exact
case/space-preserving match. Valid foreign/unknown filter IDs yield empty lists.
Optional nullable public fields retain DB null; private creator/relations/session
fields are excluded. blocked uses only direct predecessor column.isDone. warnings
is [BLOCKED_BY_PREDECESSOR] only when blocked and current card column is done.

Card cursor is canonical base64url JSON:

```text
{boardId,filters:{columnId:null|UUID,assigneeId:null|UUID,tag:null|string},position,id}
```

UUIDs normalize to lowercase for PostgreSQL UUID identity; tag stays exact. A cursor
must match the same board and filters. Position/id boundary comparison does not look
up its anchor, so deleted anchors continue. Malformed/mismatched cursors return422.
No cross-page snapshot or signing policy was added. Existing query scalar types
reject repeated arrays; empty tag remains a string condition without new minLength.

## Verification

TypeScript build PASS. Nine suites/49 tests PASS; new read tests include six service
unit cases and three real Nest routing/guard/query cases using explicit mocks.
The throwing shared error helper is now typed never for correct input narrowing.

Eight independent BE live checks passed against the parent-started retained PG18.4
cluster55432/taskify_validation and API3301:

1. All three roles read all endpoints; detail ETag and empty board response.
2. Nonmember/pending/missing board reject without data.
3. Actual column position/id order and public schema.
4. Computed blocked/warnings/tagNames/null projection.
5. AND/exact-tag filters and foreign/unknown valid IDs return empty.
6. Stable card page order without duplicates/omissions, bound cursor and deleted anchor.
7. UUID/query/session errors and logout immediately denying reads.
8. Repeated reads preserve remaining board/column/card database state.

Run prefix58ffe27d-581d-4c19-b525-19db2ddc7250. New fixtures were seeded directly in
the approved isolated DB. Only the run-owned unreferenced anchor was deleted for the
approved cursor case; other fixtures remain. No reset or existing-data deletion.
Secret values stayed in ignored runtime configuration and in-memory HTTP responses.

Live results in ignored be-cycle02-reads.json are reproducible with
apps/api/scripts/live-board-reads.cjs after parent runtime coordination. These are BE
checks, not independent QA acceptance or browser/Figma verification. QA and parent
control final acceptance and server shutdown. Main/push was not performed.
