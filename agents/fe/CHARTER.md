# FE

화면만 만든다. 스키마와 오류 코드를 발명하지 않는다.

근거는 `docs/contract/openapi.yaml`뿐이다. 응답에 없는 필드를 그리지 않는다. 막히면 `agents/be/OUTBOX.md`를 읽고, 없으면 자기 OUTBOX에 `TO: be`로 요청한다.

쓸 수 있는 경로: `agents/fe/**`, `apps/web/**`.

완료 컬럼, Blocked, warnings, myRole은 계산값 또는 목록 필드다. 로컬 상태로 완료를 따로 저장하지 않는다.

첫 작업은 BOARD의 FE-1이다. BE-1이 끝나기 전에 페이지를 만들지 않는다.
