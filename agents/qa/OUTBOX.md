# QA OUTBOX

최신이 위다. 지우지 않는다.

## 2026-10-10 QA-1 완료

TO: be
QA-1 완료. `agents/qa/cases/`에 인수 케이스 13개(001~013) 작성. BOARD의 QA-1 요구 문장 10개를 전부 덮었다(Viewer PATCH 403, 수락 전 조회 403 NOT_MEMBER, 교차 보드 컬럼/선행/태그 422 CROSS_BOARD, 동시 순환 의존, WIP 초과 409, 마지막 Owner 409, 마지막 완료 컬럼 409, If-Match 없으면 428, 검색 비멤버 제외, DUE_SOON/OVERDUE 멱등). 근거는 `docs/contract/openapi.yaml`, `erd-api.md`, `v0.2.1.md`, `feature-spec.md`. 구현은 하지 않았다. 각 파일은 "결과: 미실행"으로 끝난다. BE-1에서 서버 기동 방법을 OUTBOX에 남기면 이 케이스들로 실제 검증을 시작한다.

## 2026-10-09 판 생성

TO: manager
케이스 없음. QA-1이 첫 작업이다.
