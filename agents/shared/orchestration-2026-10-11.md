# Codex 조율 배치

기준: 4ee00b2. 사용자 요청에 따라 QA/BE/FE 하위 에이전트를 사용한다.

| 역할 | 브랜치 | Worktree(저장소 루트 기준) | 범위 |
|---|---|---|---|
| 통합 | codex/orchestration | .worktrees/integration | BOARD/공유 기록/통합 |
| QA | codex/qa-be1-review | .worktrees/qa | agents/qa |
| FE | codex/fe1-contract | .worktrees/fe | apps/web, agents/fe |
| BE | codex/be2-readiness | .worktrees/be | agents/be |

기존 main의 미커밋 QA/Nest 파일과 기존 01c8 작업 트리는 보존한다.
node_modules, .env, 빌드 산출물과 중첩 Worktree를 Git 추적에서 제외하기 위한
.gitignore만 main 작업 폴더와 통합 Worktree에 추가했다.
원격/제품 정책은 변경하지 않는다. 실제 DB 기능 검증은 이 배치의 판정 범위에 없다.

## 진행 상태

### 2026-10-12 후속 HTTP 및 임시 화면 배치

사용자가 다음 단계 진행을 요청했고 QA/BE/FE 역할을 재개했다.
이메일은 입력 그대로 비교하고, 목록은 cursor가 가리키는 보드 삭제 후에도 저장된
joined_at/board_id 정렬 경계 이후를 조회하도록 명시 승인받았다.
QA 인수 문장 11개를 먼저 추가했다. login/refresh/GET·POST boards의 기존 입력 오류
422 INVALID_INPUT 선언 누락을 OpenAPI에 보완했고 QA가 YAML/내부 참조를 검사했다.

사용자 Figma 참조는 https://www.figma.com/design/uUzjrPIuWIrQG8a93G0rTq/ 이다.
로그인 6:2, 내 보드 6:24 metadata는 확인했지만 상세 context/screenshot은 호출 한도로 거절됐다.
사용자가 임시 UI 구현 후 디자인 보정을 승인했으므로 화면 구현을 진행한다.
정확한 Figma 일치, 실제 PostgreSQL 및 브라우저의 전체 로그인 흐름은 별도 검증 대상이다.
DB 설치/실행/연결, main 병합 및 push는 이 배치에서도 수행하지 않는다.

BE 결과 fb0e6b34dd73501d309296808394fe226e82a4ae를 통합했다.
register/login/refresh/logout, GET /me, GET/POST /boards와 AppModule 연결이 구현됐다.
빌드 및 7 suites/38 tests 통과. QA는 실제 Nest 라우트와 mock Prisma를 사용한
HTTP suite 7개를 독립 재실행해 통과했다. 실제 PostgreSQL commit/rollback 및
멤버십 필터/동시성/지속성의 입증은 포함하지 않는다.

FE 결과 1d7f12e2e81552b905831ff02ddd4db96e11b0a9를 통합했다.
Next/Tailwind 로그인/가입/내 보드/생성/logout 임시 UI와 BFF 전용 browser client가 구현됐다.
타입 검사/빌드, BFF 8개 및 browser client 4개 mock 통과.
DB 없는 dev HTML smoke에서 /login, /register, /boards 200과 폼/제목을 확인했다.
테스트 dev 서버는 종료했다. CUA 브라우저 surface가 없어 시각/클릭 검증은 미실행이다.
기존 Figma 상세 디자인에 맞추는 보정과 실제 DB를 사용하는 전체 흐름 인수가 다음 단계다.
실행 문서: apps/api/README.md, apps/web/README.md. 역할별 최종 독립 QA 기록은 agents/qa/review에 둔다.

### 2026-10-12 개발 재개: 승인된 B안 기반 구현

이전 토큰 제한으로 중단된 작업을 BE/FE/QA 하위 에이전트로 재개했다.
로컬 설정의 기본 모델은 gpt-6.1-sol, reasoning effort는 low다. 모델 override는 하지 않았다.
실제 하위 에이전트 런타임 모델 ID는 도구에서 제공하지 않아 설정값과 구분한다.

- BE 최종 0f981eccc57bf867b4e0407136ae19418ad09397: 인증 세션/refresh 해시 이력,
  JWT 발급·검증, 절대 만료, 잠금 회전/재사용 폐기, 현재 세션 logout, guard와 migration.
  Prisma validate/generate, TypeScript build, 3 suites/26 mock tests 통과.
- FE 최종 4f0fa1d90aebeb9f4430c3eacda5da90917948f4: Next 서버 auth/me/boards 중계,
  opaque HttpOnly cookie, PostgreSQL 암호화 세션 저장, 행 잠금 refresh, Origin 검증.
  타입 검사/빌드, BFF mock 8개 및 기존 transport mock 5개 통과.
- QA는 구현에 앞서 auth-bff 인수 문장 9개를 확정했고 최종 커밋을 독립 검토한다.

BE와 FE는 codex/orchestration에 병합했다. main 병합과 push는 수행하지 않았다.
DB 설치/실행/연결 및 실제 HTTP/브라우저 인수는 미실행이다.
BE 로그인/가입 HTTP 및 AppModule 연결, 내 보드 업무 API, FE 화면 구현은 다음 작업이다.
FE 중계 경로의 존재는 대응하는 BE HTTP API 완성이나 전체 Slice 1 완료를 의미하지 않는다.
실행 방법과 환경 변수는 apps/api/README.md 및 apps/web/README.md에 기록했다.

첫 배치 완료. 각 결과는 codex/orchestration에 merge하여 이력과 역할별 브랜치를 보존했다.

| 역할 | 결과 커밋 | 결과 |
|---|---|---|
| BE | 9f9211c | BE2-PLAN, 기존 정책/미확정 항목/작은 구현 단위 정리 |
| FE | 85f7394 | FE1 계약 타입·읽기 어댑터, 타입 검사 및 전송 mock 5/5 통과 |
| QA | 2c176e7, 10dab39 | BE1 검토 보류, 독립 mock 19개 통과, FE1 타입/읽기 정적 subset 통과 |

QA001~013은 전부 미실행이다. DB 설치/실행/접속, 업무 API 구현, 실제 browser 인수,
의존성 설치/복사는 이번 배치에서 수행하지 않았다. 구현된 FE는 Next 화면이 아닌 계약 모듈이다.
BE1의 #5534DA default 승인 근거 누락을 QA P2로 보고했다. 기존 값을 바꾸지 않았다.
원격 push 및 main 병합은 수행하지 않았고, 기존 사용자 미커밋 산출물은 보존했다.

## 사용자에게 전달한 정책 제안 — 답변 전 미적용

- 인증: access 15분, refresh 7일 고정 만료, refresh 해시 DB 보관,
  현재 세션 logout, 보호 요청 시 세션 확인, 회전 토큰 재사용 시 해당 세션 폐기.
- 보드: 기존 #5534DA 기본값 승인, 멤버십 joined_at DESC + board_id DESC 정렬,
  잘못된 cursor는 422 INVALID_INPUT.
- 세션 저장 모델·migration 등 위 제안을 제품 코드나 계약에 적용하지 않았다.
- 이메일 대소문자 동일성과 FE 토큰 보관/새로고침 유지 방식 등 나머지 공백은
  agents/be/BE2-PLAN.md에 기록되어 있으며 관련 구현 전 별도 확정한다.

## 다음 조율 순서

### 보드 정책 승인 반영 (2026-10-11)

사용자가 기본 색상 #5534DA, 참여 시각 최신순(joined_at DESC / board_id DESC),
잘못된 cursor 422 INVALID_INPUT 제안을 승인했다. docs/contract/v0.2.1.md에 기록했다.
QA R1 기본 색상 승인 근거 공백은 이 승인으로 해소됐다. 이는 실제 DB/기능 테스트 통과 판정이 아니다.
BE2-PLAN의 B1/B2는 이번 승인 범위에 대해 확정이며, 삭제된 anchor/데이터 변경 세부 처리는 여전히 별도 검토한다.
아래 인증 승인 전까지 인증 제안은 대기 상태였다.

### 인증 정책 승인 반영 (2026-10-11)

사용자가 직전 인증 설명을 승인했다. access15분, 로그인 시점 기준 refresh7일 고정 만료,
refresh 회전/해시 저장, 현재 로그인 세션만 logout, 보호 요청에서 세션 확인,
회전된 refresh 재사용 시 해당 세션 폐기를 docs/contract/v0.2.1.md에 기록했다.
이 승인은 정책 확정이며 인증 코드/DB/HTTP 인수 통과가 아니다.
BE2-PLAN A1/A2/A3은 이 승인 범위에 대해 확정이다.
이메일 동일성, FE 토큰 보관, 비밀번호 변경 시 세션 처리는 여전히 미확정이다.

1. 사용자 정책 답변과 기존 승인 근거를 확인하고 필요한 계약 정리를 수행한다.
2. QA가 인증·내 보드 전용 인수 문장을 먼저 추가한다(기존13개는 이 범위 전체를 덮지 않음).
3. BE에게 가입·로그인·GET /me의 작은 작업을 배정한다. refresh/logout은 확정한 세션 정책에 따라 분리한다.
4. FE에게 Figma 참조를 확보한 뒤 Next/Tailwind 화면·mock 작업을 배정한다.
5. 실제DB 실행 허용/환경이 준비된 후 migration과 API/브라우저 인수 검증을 별도 실시한다.
6. QA 판정에서 정적/모의/실제DB/실제HTTP 통과 범위를 구분하고 확인된 단위만 main 병합 대상으로 제시한다.
