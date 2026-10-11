# 001 Viewer의 카드 수정은 403, 행 불변

## 인수 문장

Viewer가 카드 수정(PATCH /cards/{cardId})을 호출하면 403으로 거절되고 카드 행은 바뀌지 않는다.

근거: `docs/contract/feature-spec.md` 1장(Viewer: 카드 수정 불가), 6장 QA 시나리오 1. `docs/contract/openapi.yaml` `patchCard`의 403 응답은 `responses/Forbidden`.

## 사전 상태

- 보드 B. 사용자 U는 `board_members`에 `role=VIEWER`로 존재.
- 카드 C는 보드 B 소속, `version=3`, `title="원래 제목"`, `columnId=col-1`.

## 요청

```
PATCH /cards/{C.id}
Authorization: Bearer <U의 토큰>
If-Match: "3"
Content-Type: application/json

{ "title": "변경 시도" }
```

## 기대 HTTP와 code

403, `code=FORBIDDEN` (`components.responses.Forbidden`).

## 변하지 않아야 하는 필드

- `Card.title` = "원래 제목" (유지)
- `Card.version` = 3 (증가하지 않음)
- `Card.columnId`, `Card.updatedAt` 불변

## 결과: 미실행
