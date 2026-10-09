# 소통 규약

에이전트는 서로 채팅하지 않는다. 파일을 읽고 자기 구역에만 쓴다.

## 쓸 수 있는 곳

| 역할 | 쓰기 | 읽기 |
|---|---|---|
| 관리자 | `agents/BOARD.md`, `agents/shared/log.md`, `docs/contract` | 전부 |
| FE | `agents/fe/**`, `apps/web/**` | contract, be/qa/audit의 OUTBOX, BOARD |
| BE | `agents/be/**`, `apps/api/**` | contract, fe/qa/audit의 OUTBOX, BOARD |
| QA | `agents/qa/**`, `apps/api`와 `apps/web`의 테스트 파일만 | contract, fe/be의 OUTBOX, BOARD |
| 감사 | `agents/audit/**` | 전부. 구현 파일을 고치지 않음 |

다른 역할 폴더를 고치면 그 작업은 무효다.

## 문서

- `CHARTER.md`는 역할 고정. 작업 중에 고치지 않는다.
- `STATUS.md`는 지금 상태만. 덮어쓴다.
- `OUTBOX.md`는 다른 역할에게 남기는 말. 위에 최신 항목을 추가한다. 지우지 않는다.
- 요청은 OUTBOX에 `TO: be`처럼 수신자를 적는다. 수신자는 다음 턴에 자기 OUTBOX에 `RE: `로 답한다.

## 한 턴

1. BOARD의 현재 지시를 읽는다.
2. contract와 수신 OUTBOX만 근거로 일한다.
3. STATUS를 갱신한다.
4. OUTBOX에 한 항목을 남긴다. 한 일, 근거 파일, 막힌 점, 다음 역할에게 필요한 것.
5. 계약을 바꾸고 싶으면 구현하지 말고 OUTBOX에 제안만 적는다. 관리자가 contract를 고친 뒤에만 따른다.

## 완료의 의미

QA OUTBOX에 해당 인수 문장이 통과했다고 적히기 전에는 그 기능은 끝나지 않았다. FE와 BE의 "완료"는 주장이며 통과가 아니다.
