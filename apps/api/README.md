# API

BE-1: NestJS 10 + Prisma 5.22 + PostgreSQL 기반. 계약 v0.2.1.

현재는 HTTP 업무 엔드포인트가 없는 골격이다. FE가 실서버에 연결할 단계는 아니다.
Prisma는 실제 쿼리 전까지 DB에 연결하지 않는다.

## 실행 (PowerShell)

```powershell
Set-Location 'C:\Users\USER\.codex\worktrees\01c8\taskify-board\apps\api'
# 이 작업 폴더에는 원래 설치된 node_modules를 복사해 두었다.
# 새 checkout에서 node_modules가 없을 때만 npm.cmd ci를 수행한다.
Copy-Item .env.example .env  # 최초 1회, 기존 .env는 덮어쓰지 않는다.
$env:DATABASE_URL = 'postgresql://taskify:taskify@localhost:5432/taskify?schema=public'
npm.cmd run prisma:validate
npm.cmd run prisma:generate
npm.cmd run build
npm.cmd test -- --runInBand --watch=false
npm.cmd run test:e2e -- --runInBand --watch=false
npm.cmd run start:dev
```

PORT 기본 3000, 향후 API prefix는 /v1. 현재 모든 요청은 404다.
Nest 자체는 .env를 자동 로드하지 않으므로 PORT도 필요하면 PowerShell 환경 변수로 지정한다.
Prisma CLI는 .env를 로드한다. 생성 클라이언트는 generated/client (Git 제외).
Windows에서 경로 접근 EPERM이 발생하면 Codex의 승인된 실행을 이용한다.
실행 정책 변경이나 관리자 계정으로 DB를 띄울 필요는 없다.

## 향후 이미 준비된 DB에 migration 적용

연결 문자열을 실제 DB 값으로 바꾸고 `npm.cmd run prisma:deploy`를 실행한다.
이 명령은 DB에 DDL을 적용하므로 이번 복구에서는 실행하지 않았다.
DB 설치·시작용 스크립트는 인계하지 않았다.
다음 명령으로 migration 전체를 재생성하면 수동 SQL(부분 인덱스·CHECK·트리거)이 빠지므로
기존 migration.sql을 덮어쓰지 않는다.

## 구현과 남은 작업

- 스키마: User, Board, BoardMember, Column, Card, Tag, CardTag, Invitation,
  ChecklistItem, Comment, Activity, Notification. blocked/warnings/myRole은 저장하지 않는다.
- migration: 복합 FK 5개, 보드별 소문자 태그 unique, PENDING 초대 unique,
  마감 알림 snapshot unique, self dependency/WIP CHECK, 커밋 시 Owner 존재 트리거.
- 내부 서비스: 의존 변경과 역할 변경은 실제 transaction + board FOR UPDATE,
  권한 검사, If-Match, version 조건부 갱신을 사용한다. 의존 변경은 활동 로그도 남긴다.
- WIP용 목적지 column FOR UPDATE 헬퍼가 있다. WIP 이동 기능 자체는 아직 없다.
- 미완료: 인증·HTTP 컨트롤러·DTO·전체 CRUD·기본 컬럼 생성·WIP 계산/이동·완료 컬럼 보호·
  초대 수락·태그 API·검색·마감 알림 job·전체 응답 직렬화/ETag 연결.
- FK 및 Owner 트리거 오류 번역은 드라이버 metadata를 이용한다. 실제 PostgreSQL 오류 형태는
  통합 테스트로 확인해야 한다.

## 검증의 한계

단위 테스트는 mock DB로 분기와 쿼리 호출 순서를 검사한다. 앱 부팅 테스트는 DB 연결 없이
404와 정상 종료를 검사한다. migration 적용, 실제 FK/트리거 동작, cascade 삭제,
동시 A→B/B→A, Owner 경쟁, WIP 경쟁, 알림 멱등은 DB에서 검증하지 않았다.
QA 001~013은 아직 HTTP/DB 인수 테스트 통과가 아니다.
