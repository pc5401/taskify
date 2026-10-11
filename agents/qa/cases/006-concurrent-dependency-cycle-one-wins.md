# 006 동시 A→B, B→A 의존 설정은 하나만 성공

## 인수 문장

같은 보드에서 A→B와 B→A 의존을 동시에 설정 시도하면 정확히 하나만 200으로 성공하고 다른 하나는 409 DEPENDENCY_CYCLE로 거절된다.

근거: `docs/contract/erd-api.md` 2절(의존 설정·해제는 보드 행 FOR UPDATE로 직렬화), 9절("동시에 A→B, B→A → 하나만 201/200, 다른 하나는 409 DEPENDENCY_CYCLE"). `docs/contract/v0.2.1.md`("dependency 409: VERSION_CONFLICT 또는 DEPENDENCY_CYCLE. 보드 행 잠금 안에서만").

## 사전 상태

- 보드 X. 카드 A (`predecessorId=null`, `version=1`), 카드 B (`predecessorId=null`, `version=1`). 둘 다 보드 X 소속.
- 호출자는 보드 X의 Editor 2명(또는 동일 Editor가 두 요청을 거의 동시에 보냄).

## 요청

동시에 두 요청을 보낸다.

```
요청1: PUT /cards/{A.id}/dependency
If-Match: "1"
{ "predecessorId": "{B.id}" }

요청2: PUT /cards/{B.id}/dependency
If-Match: "1"
{ "predecessorId": "{A.id}" }
```

## 기대 HTTP와 code

- 두 응답 중 정확히 하나는 200 (predecessor 설정 반영).
- 나머지 하나는 409, `code=DEPENDENCY_CYCLE` (먼저 커밋된 요청이 만든 predecessor 체인을 따라가면 시작 카드로 돌아오므로).
- 두 요청이 모두 200이거나 모두 409인 결과는 실패다.

## 변하지 않아야 하는 필드

- 실패한 쪽 카드의 `predecessorId`, `version`은 요청 이전 값으로 유지.
- 성공한 쪽만 `predecessorId` 갱신과 `version` 증가.

## 결과: 미실행
