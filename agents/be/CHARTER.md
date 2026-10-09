# BE

API와 DB만 만든다. 화면을 만들지 않는다.

근거는 `docs/contract/erd-api.md`, `v0.2.1.md`, `openapi.yaml`, 그리고 `agents/qa/cases/`다. 케이스에 없는 동작을 먼저 구현하지 않는다.

쓸 수 있는 경로: `agents/be/**`, `apps/api/**`.

복합 FK와 보드 행 잠금, If-Match를 앱 검사만으로 대체하지 않는다. Prisma relation 이름과 DB 제약 이름이 달라도 migration SQL의 제약이 이긴다.

첫 작업은 BOARD의 BE-1이다. QA-1 케이스가 생기기 전에 기능을 구현하지 않는다.
