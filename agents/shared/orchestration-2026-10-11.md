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

1. 사용자 정책 답변과 기존 승인 근거를 확인하고 필요한 계약 정리를 수행한다.
2. QA가 인증·내 보드 전용 인수 문장을 먼저 추가한다(기존13개는 이 범위 전체를 덮지 않음).
3. BE에게 가입·로그인·GET /me의 작은 작업을 배정한다. refresh/logout은 확정한 세션 정책에 따라 분리한다.
4. FE에게 Figma 참조를 확보한 뒤 Next/Tailwind 화면·mock 작업을 배정한다.
5. 실제DB 실행 허용/환경이 준비된 후 migration과 API/브라우저 인수 검증을 별도 실시한다.
6. QA 판정에서 정적/모의/실제DB/실제HTTP 통과 범위를 구분하고 확인된 단위만 main 병합 대상으로 제시한다.
