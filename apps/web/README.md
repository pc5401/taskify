# FE-1 계약 타입 및 읽기 전송 어댑터

근거: `docs/contract/openapi.yaml` v0.2.1, BOARD FE-1, BE OUTBOX 2026-10-11.
이번 산출물은 프레임워크 없는 TypeScript 모듈이다. 패키지 설치, UI/Figma 추정,
실서버 연결, 세션 저장/갱신/로그아웃 정책, 가짜 업무 API는 추가하지 않았다.
BE 업무 HTTP endpoint는 아직 미등록이므로 정상 기능으로 연결할 수 없다.

## 타입 범위

`src/contract.ts`: Role, Board, BoardListItem, BoardPage, Column, Card, CardPage,
CardWarning, ApiErrorCode, ApiErrorBody만 옮긴 작은 부분집합이다.
BoardListItem.myRole은 필수이고 Board 상세에는 없다. Card.blocked와 warnings도
필수이며 서버 값을 그대로 소비한다. `completed`를 추가하거나 계산값을 저장하지 않는다.
선택 필드와 null 허용을 구분했다. UUID/date-time은 wire string이고 정수/길이/format
검증은 OpenAPI 제약이다. 이 모듈은 런타임 검증기를 대신하지 않는다.

BoardPage는 OpenAPI allOf의 Board 조건과 직접 properties.items의 BoardListItem 조건이
동시에 적용되므로 BoardListItem[]로 표현했다. 계약 파일은 수정하지 않았다.

## HTTP 범위

`createReadClient(apiBase, fetcher)`는 명시적인 `/v1` 포함 base와 fetch 구현을 받는다.
GET /boards, GET /boards/{boardId}, GET /boards/{boardId}/cards만 제공한다.
목록 cursor/limit를 지원하며 카드 columnId/assigneeId/tag 필터와 쓰기는 후속 범위다.
호출자가 headers(계약상 Authorization Bearer), credentials, 선택 signal을 전달한다.
기본 토큰 저장소, 인증 헤더 발명, 자동 refresh/retry 또는 쿠키 설정은 없다.
실행 예제 계정/토큰을 저장하지 않는다.

반환값은 data/status/etag이다. HTTP 오류의 status/body/etag를 보존하고 네트워크 오류를
그대로 전달한다. 오류 body는 unknown이므로 소비 단계에서 계약 오류 형태를 확인해야 한다.
성공 응답은 JSON 문법만 검사하고 스키마는 검사하지 않는 경계 단언이다.
쓰기/If-Match는 구현하지 않았다. 브라우저 cross-origin ETag 접근은 BE가
Access-Control-Expose-Headers를 정한 뒤 통합 검증해야 한다.

## 수행한 검증

기존 BE의 TypeScript를 읽기 전용으로 재사용했다. 새 의존성이나 lockfile은 없다.
다른 checkout에서는 TASKIFY_TYPESCRIPT를 기존 TypeScript 모듈 경로로 지정한다.
작업 트리 루트에서 실행:

```powershell
$env:TASKIFY_TYPESCRIPT = 'C:/Users/USER/.codex/worktrees/01c8/taskify-board/apps/api/node_modules/typescript'
node "$env:TASKIFY_TYPESCRIPT/bin/tsc" -p apps/web/tsconfig.json
node --test apps/web/checks/http.test.cjs
git diff --check
```

2026-10-11: 타입 검사 통과, Node transport tests 5/5 통과, diff 검사 통과.
타입 검사는 myRole 위치, Card 필수 키, warnings enum, nullable/optional, completed 부재를 확인한다.
전송 검사는 URL 인코딩/헤더/ETag, 403 본문 보존, 비JSON 실패, 네트워크 오류, signal을 확인한다.
테스트의 축약 fixture는 전송 보존 검사용이며 유효한 전체 API 응답 예제나 실제 서버가 아니다.
OpenAPI 자동 생성/드리프트 검증, 실제 HTTP/DB 인수, UI/브라우저 테스트는 미실행이다.
QA 001~013 통과 또는 제품 기능 완료를 주장하지 않는다.

## 다음 인계

1. BE가 업무 endpoint, 계산 필드/목록 myRole 직렬화, 인증 정책, CORS/ETag 노출을 확정하고 OUTBOX로 알린다.
2. 관리자가 Figma 근거와 다음 FE 범위를 제공한 뒤 Next.js/Tailwind 화면 작업을 시작한다.
3. 새 계약 변경 시 이 작은 subset과 type checks를 함께 대조한다. 필요 시 자동 타입 생성/런타임 검증을 별도 도입한다.
4. QA는 계약 형태 및 실제 권한/DB 불변을 독립 검증한다. 미완료인 세션 정책을 프론트가 추정하지 않는다.
