# BE-1 독립 QA 정적 리뷰

기준: `4ee00b23baab734c6a658f72f47f0229da8a21e2`, `codex/qa-be1-review`.
범위: schema / migration SQL / transaction locks / If-Match / 기존 테스트. 구현·계약 변경 없음. DB 설치·실행·접속 없음.

## 판정: 보류

BE-1 기반 구조는 검토 가능하나 업무 기능 통과는 아니다. QA 001~013은 모두 **미실행**을 유지한다. 기존 13개는 인수 케이스 수이며 성공 테스트 수가 아니다.

### 수정 또는 승인 근거가 필요한 항목

- **R1 / P2 / 기본 color 값의 승인 근거 누락** — `apps/api/prisma/schema.prisma:68`, `apps/api/prisma/migrations/20261011000000_be1_foundation/migration.sql:33`. `CreateBoardRequest`는 color를 선택 속성으로 두고 현재 `docs/contract`에는 `#5534DA`라는 기본값이 없다. 그러나 migration은 이 값을 DB default로 확정한다. 향후 color 생략 생성의 사용자 관찰 결과가 이 값으로 결정된다. 기본값의 기존 승인 근거를 관리자가 확인하거나 승인 전 확정하지 않도록 BE가 정리해야 한다. QA가 다른 색으로 변경하지 않는다. 이는 정책 근거 누락이며 실제 HTTP 재현 결과가 아니다.

### 버그로 단정하지 않은 확인 항목

- **R2 / self predecessor 오류 의미** — `apps/api/src/persistence/transactions.service.ts:70–73`: predecessorId===cardId는 409 DEPENDENCY_CYCLE. 현재 `feature-spec.md` §3.6은 자기 자신 거절을 규정하고 `erd-api.md` §2는 시작 카드 만나면409로 적는다. 과거422 기대를 현재 계약에 몰래 재도입하지 않는다. 관리자에게 기존422 기대 유지 여부만 확인 요청한다. 현재 계약만으로 확정 결함 판정하지 않음.
- **R3 / 실제 Prisma 오류 metadata** — `transactions.service.ts:23–29`, `transactions.service.spec.ts:86–98`: 복합 FK 번역은 P2003 + constraint name, owner 번역은 known-request error metadata 내 constraint name에 의존. 테스트는 그 문자열을 직접 만든 mock이다. 실제 PostgreSQL deferred trigger commit 실패에서 같은 code/meta가 오는지는 증거 없음. migration 적용 후 직접 위반을 유도하여 CROSS_BOARD/LAST_OWNER 번역을 확인해야 한다. 현재 “실제로 번역 실패한다”는 주장도 하지 않는다.
- **R4 / 읽기·쓰기 라이프사이클** — `schema.prisma:125`와 SQL206의 predecessor ON DELETE NO ACTION은 선행 카드를 참조 중이면 단독 DELETE를 막는다. 아직 삭제 API는 없으며 최신 제한된 계약의 삭제 후 정리 방식은 구체적이지 않다. 삭제 구현 때 같은 보드 잠금 아래 해제 전략과 버전/로그 요구를 명시하고 검증해야 한다. 현 범위의 완료 기능 버그로 확대하지 않는다.

## 정적으로 확인한 내용

- SQL과 Prisma에 필수 복합 FK 다섯 개 및 대상 unique가 존재한다. optional assignee/predecessor의 nullable 열과 FK MATCH SIMPLE 기본 동작에 부합하는 구조다. 실제 DB 거부는 미검증.
- tags lower(name), PENDING 초대, DUE_SOON/OVERDUE snapshot 부분 unique가 SQL에 있다. read_at은 알림 unique에 없다. wip/self-predecessor CHECK도 있다.
- owner deferred trigger는 board INSERT와 membership INSERT/UPDATE/DELETE에 있고 변경 전·후 보드 및 삭제된 보드 예외를 다룬다. 커밋 단계 직렬화/교착/실제 snapshot은 DB 검증 필요.
- dependency와 role 변경은 같은 transaction의 board FOR UPDATE 이후 권한·버전 확인을 수행한다. dependency는 사슬 추적 후 CAS와 activity를 transaction에 둔다. WIP는 별도 column lock helper만 존재하며 WIP 이동 기능은 미구현이다.
- If-Match helper는 누락428, 비정상 강한 ETag422, body mismatch422, stale409 + 현재 version을 구현한다. HTTP controller/ETag 응답 연결은 없다.
- member helper는 Viewer 변경을 거절한다. role 변경은 owner-only 및 마지막 Owner 보호를 수행한다. middleware 인증을 구현했다고 해석하지 않는다.

## 실행 증거와 한계

- 처음 두 Jest 시도는 sandbox realpath EPERM으로 테스트 진입 전 실패했다. 이 실행을 제품 실패나 통과로 세지 않는다.
- 기존 `C:/Users/USER/.codex/worktrees/01c8/taskify-board/apps/api/node_modules`와 그 generated client를 재사용한 승인된 DB 없는 재시도: **2 suites, 19 tests PASS**. 설치·복사 없음.
- 재현 설정: `agents/qa/review/jest-existing-deps.cjs`; `TASKIFY_QA_DEPENDENCY_ROOT`에 위 apps/api 경로 지정 후 기존 Jest로 실행. TEMP/TMP와 cache 경로는 QA review `.runtime` 내부.
- 설정은 상대 generated client import만 기존 client로 매핑하고 ts-jest diagnostics를 끄므로 **정적 타입 검사/빌드 성공의 증거가 아니다**. QA worktree의 테스트와 구현 소스를 실행한다. schema는 LF 정규화 시 기존01c8과 일치한다.
- 모든 transaction 테스트는 mock DB다. SQL, rollback, 실시간 동시성, FK metadata를 증명하지 않는다. 이번 e2e, Prisma validate/generate, build, live HTTP, 실제 DB 검증은 **NOT RUN**. BE OUTBOX의 기존 검증 주장과 이번 독립 실행을 구분한다.

## 다음 BE 및 관리자에게

1. R1 기본 color 승인 출처 확인. R2는 정책 정합성만 확인.
2. 향후 승인된 DB 검증에서 migration 적용/롤백, 복합 FK 5종, 새 보드 owner 없음, 마지막 owner 변경·삭제·이동·board cascade, 동시 A→B/B→A와 실제 Prisma 예외 metadata 확인.
3. HTTP 업무 endpoint가 구현된 후 QA001~013을 각각 실행하고 행 불변을 DB와 함께 검증. 현재19 mock 테스트 PASS를 해당 인수 케이스 PASS로 옮기지 않는다.

## FE-1 추가 읽기 검토

대상: 별도 FE worktree `85f7394`, `apps/web/src/contract.ts`, `src/http.ts`, `checks/http.test.cjs`. FE 코드는 수정하지 않았다.

정적 subset 판정: **통과**. `BoardListItem.myRole`은 필수 Role, Board 상세에는 myRole을 추가하지 않았다. Card.blocked와 warnings는 필수이고 warnings 값은 BLOCKED_BY_PREDECESSOR 한 가지다. description/assigneeId/dueAt/predecessorId의 선택·nullable과 Column.wipLimit 선택·nullable가 YAML과 일치한다. Page의 items/nextCursor도 필수다. Card.completed는 없다. UUID/date-time/integer 범위 검증은 타입 선언이 보장하지 않으며 파일도 이를 숨기지 않는다.

읽기 어댑터는 board 목록/상세/cards 경로와 cursor/limit, 호출자 header/credentials/signal 및 ETag를 전달한다. 오류를 빈 목록으로 대체하지 않고 status/body를 보존한다. 응답은 type assertion이므로 유효 JSON이 계약과 다른 모양이어도 차단하지 않는다. 이는 FE-1이 명시적으로 제외한 runtime schema 검증이며 현재 범위 결함으로 판정하지 않는다. 카드 선택 필터 전체를 구현한 client로 주장하지 않는다.

FE의 타입 검사/5개 mock 전송 테스트 PASS는 **FE OUTBOX 보고**이며 QA가 재실행하지 않았다. 축약 fixture에 필수 Board/Card 필드가 모두 없으므로 이5개 결과로 API 스키마 준수를 증명할 수 없다. 실제 browser/backend integration은 **NOT RUN**, QA001~013와 무관하다. 전체 BE/업무 인수 판정은 여전히 보류다.
