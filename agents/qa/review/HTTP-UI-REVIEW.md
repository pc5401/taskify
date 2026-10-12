# Auth / me / boards HTTP 및 임시 UI 독립 검토

2026-10-12. BE **fb0e6b34dd73501d309296808394fe226e82a4ae**, FE **1d7f12e2e81552b905831ff02ddd4db96e11b0a9**의 clean 최종 worktree를 읽었다. 근거는 OpenAPI v0.2.1/915f545422 선언,8dabfd5 이메일·cursor 승인,61436df 임시 UI 승인, QA HTTP001~011 및 기존 규격이다.

판정: **정적 코드 및 독립 mock 검증 범위 통과, 실제 기능 인수 보류**. 이 범위에서 차단 결함을 발견하지 않았다. Figma 정확 일치/시각 클릭/실제 DB 전체 흐름을 통과로 판단하지 않는다.

## QA 독립 실행

- BE `http.spec.ts`: **1 suite / 7 tests PASS**, TypeScript diagnostics 켠 ts-jest. QA의 `http-mock-jest.cjs`는 기존01c8 node_modules를 읽기 재사용하고 BE 최종 source를 대상으로 실행한다. 처음 sandbox Temp realpath EPERM 발생 후 승인된1회 재시도로 종료0. 새로운 설치/DB 연결 없음.
- FE `node --experimental-transform-types --test checks/bff.test.mjs checks/browser-api.test.mjs`: **12/12 PASS** (BFF8+browser-api4), 종료0. 명시적 fetch/store mock만 사용한다.
- 이전 OpenAPI 검증은 기존 js-yaml YAML parse, 버전,212 internal refs,4개422 InvalidInput/code 확인 PASS. 전체 meta-schema 검증을 주장하지 않는다.

BE 검증은 실제 Nest AppModule/전역 ValidationPipe/controller/session guard 및 HTTP 응답을 사용하며 PrismaService만 명시 mock으로 대체한다. register DTO 경계/공개 필드/중복, exact email 로그인, GETme, refresh.user/재사용 폐기, boards role/keyset/422, 생성 ETag/OWNER/기본컬럼, logout204/보호경로 즉시401을 확인했다. 이것은 서비스를 직접 호출한 테스트보다 넓은 HTTP 증거지만 PostgreSQL 증거가 아니다.

BE7 suites/38 tests와 build, FE typecheck/build 및 login/register/boards HTML200 smoke는 역할 보고이며 QA 재실행으로 표시하지 않는다. HTML200은 React 상호작용/시각 품질/인증 흐름 검증이 아니다. 부모가 확인한 CUA inventory apps/browsers 없음으로 시각 클릭 검증은 수행되지 않았다.

## 정적 검토 결과

BE는 Register/Login/Refresh DTO의 계약 제약과 APP_PIPE422 INVALID_INPUT을 적용한다. 이메일 원문을 저장·조회하며 정규화하지 않는다. 알려지지 않은 계정도 scrypt를 수행하고 일반 INVALID_CREDENTIALS로 거절한다. Public User는 명시 projection이며 AuthResponse는 accessToken/refreshToken/user를 반환한다. register와 최초 session 발급은 같은 transaction client로 저장한다. refresh.reuse 폐기는 여전히 transaction 밖에서401을 던지므로 commit을 되돌리는 구조가 아니다. me/boards/logout에 session guard가 연결됐다.

BoardsService는 호출자 membership에서 조회하며 joinedAt DESC/boardId DESC와 저장된 두 경계를 사용한다. 삭제 anchor 조회에 의존하지 않는다. create는 board/OWNER member/할 일·하는 중·완료를 같은 transaction 안에서 생성하며 position0/1024/2048, 세 번째만 isDone. color생략 #5534DA, 명시 문자열을 그대로 사용한다. 생성201 Board+ETag와 목록 myRole을 구분한다.

FE client source의 browser-api/auth-form/boards-screen에는 access/refresh 저장·브라우저 Authorization·localStorage/sessionStorage 사용이 없다. browser-api는 상대 /api 요청, same-origin cookie, no-store, abort signal을 사용한다. auth-form은 email을 text/inputMode=email로 받아 FormData 문자열 그대로 전달하며 trim/lowercase하지 않는다. 로그인/가입 오류와 pending/disabled를 표시하고 ref로 같은 요청 중복을 즉시 차단한다.

BoardsScreen은 loading/empty/error/myRole/server order/pagination, invalid cursor 첫 페이지 복구, 생성 후 새로고침,401 로그인 이동을 구현한다. 공용 mutation ref가 create/logout 동시 및 반복 전송을 차단한다. 생성 선택색상 생략은 BE 기본값을 사용한다. 로그아웃204/401은 로그인으로 이동하며 upstream폐기 미확정502는 별도 안내로 이동한다. 컴포넌트의 실제 DOM 클릭/abort/rerender 행동은 실행하지 않고 코드로만 확인했다.

## 인수 범위와 남은 공백

기존 QA001~013, AUTH-BFF001~009, HTTP001~011 합계 **33개 real acceptance는 전부 미실행**으로 유지한다. 위 mock 결과를 개별 케이스의 실DB 인수 통과로 승격하지 않는다.

HTTP mock transaction은 callback만 실행하므로 실제 COMMIT/ROLLBACK/행잠금 검증이 아니다. boards mock은 미리 만든 응답 배열 및 쿼리 인자를 확인하며 실제 membership SQL 필터/정렬/삭제 anchor 결과를 실행하지 않는다. real migration/rollback,동시refresh,다른세션 격리,PG지속성/재시작,쿠키/Origin/로그 비노출,BE-BFF 연결,가입→로그인→생성→logout 전체 브라우저 흐름은 후속 승인 live단계에서 검증해야 한다.

upstream refresh와 BFF 저장은 분산 원자성이 없으며 저장 실패/응답 유실시 재로그인이 필요할 수 있다. logout 네트워크502는 upstream폐기 미확정이며 보유 access의 즉시 차단 보장이 아니다. 이전 AUTH-BFF-REVIEW의 이 한계는 계속 유효하다.

DB 설치/시작/접속, 의존성 설치, 제품/계약 편집, main병합/push 없음. QA 산출물만 기록했다.
