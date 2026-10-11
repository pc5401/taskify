# BE OUTBOX

최신이 위다. 지우지 않는다.

## 2026-10-11 BE-1 전환 및 복구

TO: manager, qa, fe
RE: QA-1 완료

### 복구와 구현

- 원래 OneDrive 폴더의 QA 001~013, STATUS/OUTBOX를 현재 Codex worktree로 인계했다.
  사용자 승인 범위에 따른 원본 복원이며 케이스 내용은 수정하지 않았다.
  cases의 README 포함 모든 파일은 복사 후 SHA-256이 원본과 일치했다.
- 기존 NestJS 설정·package.json·lockfile을 보존하고 node_modules를 복사했다.
  연결(Junction) 생성은 접근 거부였고, 재설치하지 않았다.
- Prisma 스키마와 초기 migration SQL 작성. 복합 FK 5개 및 계약 unique/CHECK 포함.
  Prisma가 표현하지 못하는 태그 lower(name) 인덱스, PENDING 초대와 마감 snapshot 부분 unique,
  커밋 시 Owner 존재 deferred trigger는 migration SQL에 직접 포함했다.
  새 보드의 Owner 누락도 거부하며, 보드 cascade 삭제 후에는 Owner를 요구하지 않는다.
- Nest PersistenceModule, lazy PrismaService, transaction 서비스 작성.
  의존 설정/해제와 역할 변경은 board FOR UPDATE 안에서 권한과 버전을 검사한다.
  의존 체인 검사, LAST_OWNER 보호, version 조건부 갱신(CAS), 의존 활동 로그 포함.
  WIP용 목적지 column FOR UPDATE 헬퍼 작성. 실제 WIP 이동은 미구현.
- If-Match 기반: 누락 428, 잘못된 강한 ETag/본문 버전 불일치 422,
  stale version 409 및 현재 version 반환. ETag 생성 함수 포함.
  HTTP 컨트롤러에 연결된 것은 아니다. 댓글 등 비버전 자원에 전역 적용하지 않는다.
- Card.completed/blocked/warnings와 Board.myRole을 저장 컬럼으로 만들지 않았다.
  InviteRole은 EDITOR/VIEWER만 가능하다. 코드잇 API/FE 구현 없음.

### DB 없이 수행한 검증

- Prisma 5.22.0 validate: 통과.
- 기존 로컬 Windows 엔진으로 Prisma Client generate: 통과.
- schema에서 DB 없이 migrate diff --from-empty --to-schema-datamodel --script로 기본 DDL 생성,
  수동 제약을 추가했다. 이 절차는 PostgreSQL에서 SQL을 실행한 검증이 아니다.
- npm.cmd run build: 통과.
- npm.cmd test -- --runInBand --watch=false: 2 suites, 19 tests 통과.
  mock DB 기반이며 순환/교차 보드/권한/마지막 Owner/버전 충돌과 잠금 호출 순서를 검사한다.
- npm.cmd run test:e2e -- --runInBand --watch=false: 1 suite, 1 test 통과.
  DB 없는 Nest 부팅/404/종료 검사만 수행한다.
- git diff --check: 통과.
- Windows sandbox의 realpath EPERM은 승인된 로컬 실행으로 해결했다.
  초기 generate의 엔진 다운로드 시도는 실패했고, 로컬 엔진 경로 지정 후 성공했다.
  scripts/prisma-local.cjs가 기존 엔진을 재사용한다. PostgreSQL은 실행하지 않았다.

### DB에서 검증하지 않은 항목

- migration 전체 적용 및 SQL/PLpgSQL 실행 유효성.
- 복합 FK의 실제 거부와 422 오류 번역 metadata.
- Owner 트리거의 INSERT/강등/삭제/이동/커밋/보드 cascade 삭제 동작 및 409 오류 번역.
- 실제 동시 A→B/B→A 직렬화, 역할 변경과 일반 version 쓰기의 경쟁/rollback.
- WIP 경쟁, 마지막 완료 컬럼 경쟁 및 카드 이동 시 행 불변.
- 알림 snapshot unique와 읽음 이후 멱등. 알림 job 자체도 미구현.
- QA 001~013의 HTTP/DB 인수 검증은 미실행. QA 통과로 판정하지 않는다.

### 실행 방법

PowerShell에서 apps/api로 이동한다. 현재 node_modules는 인계되어 있으므로 재설치하지 않는다.
새 checkout에서 설치 폴더가 없을 때만 npm.cmd ci를 실행한다.
최초 1회 .env.example을 .env로 복사하고 DATABASE_URL을 설정한다.
Nest 런타임용으로 $env:DATABASE_URL도 설정한다(.env 자동 로드 모듈은 아직 없음).

```powershell
$env:DATABASE_URL = 'postgresql://taskify:taskify@localhost:5432/taskify?schema=public'
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run build
npm.cmd test -- --runInBand --watch=false
npm.cmd run test:e2e -- --runInBand --watch=false
npm.cmd run start:dev
```

기본 PORT=3000, prefix=/v1. 현재 등록된 업무 HTTP endpoint가 없어 요청은 404다.
DB는 실제 쿼리 전까지 연결하지 않는다. 이미 준비된 DB에 DDL을 적용하는 후속 작업에서만
실제 연결 문자열을 설정하고 npm.cmd run prisma:deploy를 실행한다. 이번에는 실행하지 않았다.
자세한 경로와 실행 안내는 apps/api/README.md.

### 미완료 기능과 FE 인계

인증, HTTP 컨트롤러/DTO, 보드/컬럼/카드 등 전체 CRUD, 기본 컬럼 생성,
WIP 이동/정렬, 마지막 완료 컬럼 보호, 멤버 삭제, 초대 수락, 보드별 태그 API,
검색, 알림 job, 응답 계산 필드/직렬화와 ETag의 HTTP 연결은 후속 BE 작업이다.

FE 새 대화는 agents/PROTOCOL.md, agents/fe/CHARTER.md, BOARD FE-1 및 이 OUTBOX를 읽는다.
현재 FE-1의 범위인 OpenAPI BoardListItem.myRole과 Card.blocked/warnings 타입 고정부터
진행할 수 있다. 이번 골격을 동작하는 업무 API로 간주해 실서버 연동하지 않는다.

### 커밋 기록

- 기반 커밋: 71e3dca (판/계약).
- a26261c: QA-1 원본 인계.
- e11cf89: BE-1 스키마/migration/잠금/If-Match/검증 및 실행 문서.
- 브랜치: codex/be1-recovery. 로컬 커밋이며 원격 push하지 않았다.
- 이 OUTBOX/STATUS의 최종 인계 기록은 위 구현 커밋 다음 문서 커밋에 저장한다.

## 2026-10-09 판 생성

TO: manager
아직 쓸 내용 없음. QA-1 대기.
