# 004 다른 보드 카드를 predecessor로 지정하면 422 CROSS_BOARD

## 인수 문장

다른 보드의 카드를 predecessor로 지정(PUT /cards/{cardId}/dependency)하면 422 CROSS_BOARD이고 카드 행은 바뀌지 않는다.

근거: `docs/contract/erd-api.md` 1절(복합 FK `cards (predecessor_id, board_id) → cards (id, board_id)`), 9절("다른 보드 카드를 predecessor로 → 422 CROSS_BOARD"). `docs/contract/openapi.yaml` `setDependency`의 422 응답은 `responses/CrossBoard`.

## 사전 상태

- 보드 A의 카드 C1 (`boardId=A`, `predecessorId=null`, `version=4`).
- 보드 B의 카드 C2 (`boardId=B`, 보드 A와 무관).
- 호출자는 보드 A의 Editor.

## 요청

```
PUT /cards/{C1.id}/dependency
Authorization: Bearer <Editor 토큰>
If-Match: "4"
Content-Type: application/json

{ "predecessorId": "{C2.id}" }
```

## 기대 HTTP와 code

422, `code=CROSS_BOARD`.

## 변하지 않아야 하는 필드

- `Card(C1).predecessorId` = null (유지)
- `Card(C1).version` = 4 (증가하지 않음)

## 결과: 미실행
