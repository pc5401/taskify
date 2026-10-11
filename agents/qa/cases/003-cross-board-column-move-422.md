# 003 다른 보드 컬럼으로 카드 이동은 422 CROSS_BOARD

## 인수 문장

다른 보드의 컬럼으로 카드를 이동(POST /cards/{cardId}/move)하면 422 CROSS_BOARD이고 카드 행은 바뀌지 않는다.

근거: `docs/contract/erd-api.md` 1절(복합 FK `cards (column_id, board_id) → columns (id, board_id)`), 9절("다른 보드 컬럼으로 카드 이동 → 422 CROSS_BOARD, 행 불변"). `docs/contract/openapi.yaml` `moveCard`의 422 응답은 `responses/CrossBoard`.

## 사전 상태

- 보드 A의 컬럼 col-A(`wipLimit=null`)에 카드 C 존재(`boardId=A`, `columnId=col-A`, `version=2`, `position=1024`).
- 보드 B의 컬럼 col-B 존재(보드 A와 무관).
- 호출자는 보드 A의 Editor.

## 요청

```
POST /cards/{C.id}/move
Authorization: Bearer <Editor 토큰>
If-Match: "2"
Content-Type: application/json

{ "toColumnId": "{col-B.id}" }
```

## 기대 HTTP와 code

422, `code=CROSS_BOARD`.

## 변하지 않아야 하는 필드

- `Card.columnId` = col-A (유지)
- `Card.position` = 1024 (유지)
- `Card.version` = 2 (증가하지 않음)

## 결과: 미실행
