# 005 다른 보드 태그 연결은 422 CROSS_BOARD로 막히거나, 정상 흐름은 보드 범위 안에서만 생성된다

## 인수 문장

다른 보드의 Tag와 카드를 연결하면 422 CROSS_BOARD다. `docs/contract/openapi.yaml`의 `replaceTags`는 `names`(문자열)만 받고 태그가 없으면 호출한 카드의 보드 안에서 생성하므로("Tags are created in this board if missing"), 정상 구현은 같은 이름이 다른 보드에 이미 있어도 교차 연결을 만들지 않고 호출한 카드의 보드 범위로 새 태그를 만들어야 한다. 이 불변이 깨지면(이름으로 전역 조회해 다른 보드 태그 id를 그대로 재사용) 그 요청은 422 CROSS_BOARD로 거절되어야 하며 조용히 성공해서는 안 된다.

근거: `docs/contract/erd-api.md` 1절(복합 FK `card_tags (tag_id, board_id) → tags (id, board_id)`, unique `tags (board_id, lower(name))`), 9절("다른 보드 Tag 연결 → 422 CROSS_BOARD"). `docs/contract/openapi.yaml` `replaceTags`의 422 응답은 `responses/CrossBoard`.

## 사전 상태

- 보드 B에 이름이 "urgent"인 Tag(tagB) 이미 존재, 보드 B의 다른 카드에 연결되어 있음.
- 보드 A의 카드 C (`boardId=A`, `version=1`, `tagNames=[]`). 보드 A에는 "urgent" 이름의 태그가 아직 없음.
- 호출자는 보드 A의 Editor.

## 요청

```
PUT /cards/{C.id}/tags
Authorization: Bearer <Editor 토큰>
If-Match: "1"
Content-Type: application/json

{ "names": ["urgent"] }
```

## 기대 HTTP와 code

- 정상 구현: 200. 응답 `Card.tagNames`에 "urgent" 포함, 새로 생성된 Tag는 보드 A 소속이며 `tags.id`가 tagB(보드 B 소속)와 다름. `card_tags` 행은 보드 A 소속 Tag만 가리킨다.
- 불변 위반(앱이 이름만으로 전역 조회해 tagB를 그대로 연결하려는 경우): 422, `code=CROSS_BOARD`이고 `card_tags` 행이 생기지 않는다.
- 두 경우 모두 "성공 응답과 함께 보드 B의 tagB가 보드 A 카드에 연결됨"은 허용되지 않는다.

## 변하지 않아야 하는 필드

- 보드 B의 tagB.id, tagB에 연결된 기존 카드들의 `card_tags` 행 (영향 없음)
- 실패 분기에서는 `Card(C).version`과 `Card(C).tagNames` 불변

## 결과: 미실행
