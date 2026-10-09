# Taskify

멀티 에이전트 실습용 칸반. 채팅으로 역할을 넘기지 않는다. 계약과 각 역할의 OUTBOX가 소통이다.

## 읽는 순서

1. `agents/PROTOCOL.md`
2. `agents/BOARD.md`
3. `docs/contract/v0.2.1.md`
4. 자기 역할의 `CHARTER.md`

필드명은 `docs/contract/openapi.yaml`이 이긴다. 잠금과 정책은 `docs/contract/erd-api.md`와 `v0.2.1.md`가 이긴다.

## 디렉터리

- `docs/contract` — 관리자만 수정. FE/BE/QA는 읽기만.
- `agents/fe|be|qa` — 그 역할만 수정.
- `agents/audit` — 평가자만 수정.
- `agents/shared/log.md` — 관리자만 추가.
- `apps/api`, `apps/web` — 구현. 계약에 없는 엔드포인트를 만들지 않는다.
