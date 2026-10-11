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

역할별 작업을 배정했다. 완료 시 커밋과 검증·미검증 결과를 이 파일에 기록한다.
