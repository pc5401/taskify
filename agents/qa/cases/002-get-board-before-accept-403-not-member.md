# 002 수락 전 보드 조회는 403 NOT_MEMBER

## 인수 문장

초대를 수락하기 전에 보드를 조회(GET /boards/{boardId})하면 403 NOT_MEMBER이고 카드를 포함한 보드 내용은 보이지 않는다.

근거: `docs/contract/feature-spec.md` 3.3절("수락 전에는 보드가 보이지 않는다"), 6장 QA 시나리오 2. `docs/contract/openapi.yaml` `getBoard`의 403 응답은 `responses/NotMember`. `NotMember` description: "Includes invitees who have not accepted."

## 사전 상태

- 보드 B. `invitations`에 사용자 U의 이메일로 `status=PENDING`인 초대 1건 존재.
- `board_members`에 U의 행은 없음(아직 멤버 아님).

## 요청

```
GET /boards/{B.id}
Authorization: Bearer <U의 토큰>
```

## 기대 HTTP와 code

403, `code=NOT_MEMBER`.

## 변하지 않아야 하는 필드

- `invitations` 행의 `status` = PENDING (조회만으로 상태가 바뀌지 않음)
- `board_members`에 U 행이 생기지 않음

## 결과: 미실행
