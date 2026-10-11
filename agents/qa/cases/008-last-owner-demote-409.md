# 008 마지막 Owner 강등은 409 LAST_OWNER

## 인수 문장

보드의 마지막 Owner를 Editor 또는 Viewer로 바꾸려 하면(PATCH /boards/{boardId}/members/{userId}) 409 LAST_OWNER이고 역할은 바뀌지 않는다.

근거: `docs/contract/feature-spec.md` 3.3절("마지막 Owner는 나가거나 강등될 수 없다"), 6장 QA 시나리오 5. `docs/contract/erd-api.md` 4절("변경 결과가 owner 0이면 409 LAST_OWNER", "보드 행 FOR UPDATE 후 owner 수를 센다"). `docs/contract/openapi.yaml` `changeRole`의 409 응답은 `responses/LastOwner`.

## 사전 상태

- 보드 B에 Owner가 정확히 1명(U, `role=OWNER`). 다른 멤버는 Editor/Viewer뿐.
- 보드 B의 현재 `version` (예: 7).

## 요청

```
PATCH /boards/{B.id}/members/{U.id}
Authorization: Bearer <U 토큰>
If-Match: "7"
Content-Type: application/json

{ "role": "EDITOR" }
```

## 기대 HTTP와 code

409, `code=LAST_OWNER`.

## 변하지 않아야 하는 필드

- `Member(U).role` = OWNER (유지)
- 보드 B의 owner 수 = 1 (유지)

## 결과: 미실행
