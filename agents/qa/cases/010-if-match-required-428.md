# 010 If-Match 없으면 428

## 인수 문장

versioned 쓰기 요청에 If-Match 헤더가 없으면 428 IF_MATCH_REQUIRED이고 행은 바뀌지 않는다. 대표 예시로 카드 PATCH를 쓴다.

근거: `docs/contract/erd-api.md` 6절("없는 If-Match는 428 IF_MATCH_REQUIRED"), 9절("If-Match 없는 카드 PATCH → 428 IF_MATCH_REQUIRED"). `docs/contract/v0.2.1.md`("versioned 쓰기에 If-Match가 없으면 428 IF_MATCH_REQUIRED... 행은 바꾸지 않는다"). `docs/contract/openapi.yaml` `patchCard`의 428 응답은 `responses/IfMatchRequired`.

## 사전 상태

- 카드 C (`version=2`, `title="기존 제목"`).

## 요청

```
PATCH /cards/{C.id}
Authorization: Bearer <Editor 토큰>
Content-Type: application/json
(If-Match 헤더 없음)

{ "title": "새 제목" }
```

## 기대 HTTP와 code

428, `code=IF_MATCH_REQUIRED`.

## 변하지 않아야 하는 필드

- `Card(C).title` = "기존 제목" (유지)
- `Card(C).version` = 2 (증가하지 않음)

## 결과: 미실행
