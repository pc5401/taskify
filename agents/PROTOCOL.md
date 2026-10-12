# 소통 규약

사용자가 승인한 하위 에이전트 조율에서는 관리자와 역할 에이전트가 작업 배정·결과 보고를 메시지로 주고받는다.
결정과 검증 결과는 파일에도 기록하며 각 역할의 쓰기 구역을 지킨다.

## 쓸 수 있는 곳

| 역할 | 쓰기 | 읽기 |
|---|---|---|
| 관리자 | `agents/BOARD.md`, `agents/PROTOCOL.md`, `agents/shared/**`, `docs/contract`, 학습 문서 검토/배포 기록 | 전부 |
| FE | `agents/fe/**`, `apps/web/**` | contract, be/qa/audit의 OUTBOX, BOARD |
| BE | `agents/be/**`, `apps/api/**` | contract, fe/qa/audit의 OUTBOX, BOARD |
| QA | `agents/qa/**`, `apps/api`와 `apps/web`의 테스트 파일만 | contract, fe/be의 OUTBOX, BOARD |
| 감사 | `agents/audit/**` | 전부. 구현 파일을 고치지 않음 |
| 해설 | `agents/explainer/**`, `docs/learning/**` | 전부. 제품 코드·계약은 읽기만 |

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

## 사이클을 마칠 때

1. 관리자는 이번 사이클의 범위와 최종 BE/FE/QA 결과를 확정한다. 프로젝트 전체 완료와 구분한다.
2. 해설 에이전트를 호출해 원자료를 한국어 학습 문서로 묶는다. 기본 요청 모델은 `gpt-6-astra`, 추론 수준은 `high`다.
3. 해설은 `docs/learning/cycle-template.md`를 바탕으로 역할 흐름·결정 이유·발견한 문제·검증 범위·다음 단계를 표와 그림으로 설명한다.
4. 관리자는 수치·승인 근거·미검증 항목을 원자료와 대조한 후 문서를 커밋한다.
5. main 병합·push가 승인된 사이클에서는 완료 결과를 문서에 추가하고 원격 반영을 확인한다.

이는 개발 사이클의 완료 절차다. 일정 예약이나 백그라운드 자동 실행을 뜻하지 않는다.
