# 009 마지막 완료 컬럼 해제·삭제는 409 LAST_DONE_COLUMN

## 인수 문장

보드의 마지막 `isDone=true` 컬럼을 `isDone=false`로 바꾸거나(PATCH /columns/{columnId}) 삭제(DELETE /columns/{columnId})하려 하면 409 LAST_DONE_COLUMN이고 컬럼은 바뀌지 않는다.

근거: `docs/contract/erd-api.md` 5절("마지막 is_done 컬럼을 false로 바꾸거나 지우면 409 LAST_DONE_COLUMN"), 9절. `docs/contract/openapi.yaml` `patchColumn`의 409 응답은 `responses/LastDoneColumn`, `deleteColumn`의 409 응답은 `responses/ColumnNotEmptyOrLastDone`(example `lastDone`).

## 사전 상태

- 보드의 완료 컬럼이 정확히 1개: Col3 (`isDone=true`, `version=1`, 카드 없음).
- 다른 컬럼들은 모두 `isDone=false`.

## 요청

### 요청 A — PATCH로 해제 시도

```
PATCH /columns/{Col3.id}
Authorization: Bearer <Editor 토큰>
If-Match: "1"
Content-Type: application/json

{ "isDone": false }
```

### 요청 B — DELETE로 삭제 시도

```
DELETE /columns/{Col3.id}
Authorization: Bearer <Editor 토큰>
```

## 기대 HTTP와 code

- 요청 A: 409, `code=LAST_DONE_COLUMN`.
- 요청 B: 409, `code=LAST_DONE_COLUMN` (카드가 없으므로 COLUMN_NOT_EMPTY는 해당 없음).

## 변하지 않아야 하는 필드

- `Column(Col3).isDone` = true (유지)
- `Column(Col3).version` = 1 (증가하지 않음)
- `Column(Col3)` 행이 삭제되지 않음

## 결과: 미실행
