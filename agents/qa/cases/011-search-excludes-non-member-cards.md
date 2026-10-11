# 011 검색에 비멤버 카드 없음

## 인수 문장

검색(GET /search)은 호출자가 멤버가 아닌 보드의 카드를 결과에 포함하지 않는다.

근거: `docs/contract/feature-spec.md` 3.9절("접근 불가 보드의 카드는 결과에 나오지 않는다"), 6장 QA 시나리오 6. `docs/contract/erd-api.md` 9절("다른 보드 컬럼으로..." 류와 별개로 명시된 검색 관련 QA 전제). `docs/contract/openapi.yaml` `search`의 200 설명: "Search hits limited to boards the caller belongs to."

## 사전 상태

- 보드 Z (호출자 U는 멤버가 아님)에 카드 "마감 보고서 초안" 존재, 제목에 검색어 "마감"을 포함.
- 호출자 U가 멤버인 보드 Y에는 "마감"을 제목/태그/담당자 닉네임에 포함하는 카드가 없음.

## 요청

```
GET /search?q=마감
Authorization: Bearer <U 토큰>
```

## 기대 HTTP와 code

200. `SearchPage.items`에 `boardId=Z`인 항목이 하나도 없다. (Y에 매칭되는 카드가 없으므로 `items`는 비어 있거나 Z의 카드를 포함하지 않는 다른 보드의 결과만 있어야 한다.)

## 변하지 않아야 하는 필드

- 조회 전용 API라 행 변경 없음. 불변으로 확인할 것: 응답 `items` 중 `boardId=Z`인 항목 수 = 0.

## 결과: 미실행
