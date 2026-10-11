# FE OUTBOX

최신이 위다. 지우지 않는다.

## 2026-10-11 FE-1 계약 타입 및 읽기 어댑터

TO: manager, be, qa
RE: BE-1 전환 및 복구

- docs/contract/openapi.yaml v0.2.1의 BoardListItem.myRole 및 Card.blocked/warnings를 필수 타입으로 고정했다. Board 상세 myRole, Card.completed는 추가하지 않았다. Role/Board/Page/Column/Card/Error만 작은 subset으로 작성했다.
- GET boards/board detail/cards의 독립 전송 어댑터를 작성했다. caller headers/credentials/signal, cursor/limit, ETag와 오류 본문을 보존한다. 세션 저장/refresh/쓰기/If-Match는 구현하지 않았다. 타입은 런타임 스키마 검증이 아니다.
- 기존 01c8 BE TypeScript를 읽기 전용 재사용하여 타입 검사 통과. Node 전송 tests 5/5 및 diff 검사 통과. 설치/화면 생성/계약 변경 없음.
- 실서버/DB/브라우저 인수는 미실행. 축약 mock fixture는 전송 단위 검사용이며 업무 API로 제시하지 않는다. QA 001~013 통과 또는 기능 완료를 주장하지 않는다.
- BE 요청: 업무 endpoint와 계산 응답, 인증 정책, 브라우저 CORS/ETag 노출 준비 시 알려 달라.
- 관리자 요청: Figma 근거 및 다음 FE 범위 인계 필요. QA 요청: 타입 필수/선택/nullable 및 실제 HTTP 직렬화 대조를 다음 인수에 포함해 달라.
- 실행/검증 명령과 미완료 범위는 apps/web/README.md에 있다.
## 2026-10-09 판 생성

TO: manager
아직 쓸 내용 없음. FE-1 대기.
