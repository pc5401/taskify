# 007 WIP 초과 이동은 409, column_id 불변

## 인수 문장

WIP 한도를 채운 컬럼으로 카드를 이동(POST /cards/{cardId}/move)하면 409 WIP_LIMIT_EXCEEDED이고 카드는 원래 컬럼에 남는다(`column_id` 불변).

근거: `docs/contract/feature-spec.md` 6장 QA 시나리오 4("WIP 2인 컬럼에 세 번째 카드를 옮기면 거절되고 원래 컬럼에 남는다"). `docs/contract/v0.2.1.md`("카드 move 409: VERSION_CONFLICT 또는 WIP_LIMIT_EXCEEDED. 실패 시 column_id 불변"). `docs/contract/openapi.yaml` `moveCard`의 409 응답은 `responses/WipExceeded`(예시 `components.responses.MoveConflict`의 `wip`).

## 사전 상태

- 컬럼 D: `wipLimit=2`, 이미 카드 2개 존재(한도 가득 찬 상태).
- 카드 C는 다른 컬럼 S에 존재(`boardId`는 D와 같은 보드, `columnId=S.id`, `version=1`, `position=2048`).

## 요청

```
POST /cards/{C.id}/move
Authorization: Bearer <Editor 토큰>
If-Match: "1"
Content-Type: application/json

{ "toColumnId": "{D.id}" }
```

## 기대 HTTP와 code

409, `code=WIP_LIMIT_EXCEEDED`, `details.wipLimit=2`, `details.count=2`.

## 변하지 않아야 하는 필드

- `Card(C).columnId` = S.id (유지, D로 바뀌지 않음)
- `Card(C).position` = 2048 (유지)
- `Card(C).version` = 1 (증가하지 않음)
- 컬럼 D에 속한 카드 수 = 2 (늘지 않음)

## 결과: 미실행
