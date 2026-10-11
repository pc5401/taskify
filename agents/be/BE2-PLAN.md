# BE-2: VS1 readiness 계획

기준: `4ee00b23baab734c6a658f72f47f0229da8a21e2`, `codex/be2-readiness`.
범위: 문서 조사만. 구현·계약·migration 변경, 설치, DB 실행, 테스트 재실행 없음.
현재 계약: `docs/contract/{feature-spec.md,erd-api.md,v0.2.1.md,openapi.yaml}`.

## 현재 준비 상태

BE-1 OUTBOX에 Prisma 5.22 validate/generate, Nest build, mock 단위 19개, DB 없는 부팅/404 테스트 1개 통과가 기록되어 있다. 이번 턴은 그 기록과 코드 구조를 읽었으며 재실행하지 않았다. `src/app.module.ts`는 PersistenceModule만 등록하고 업무 controller가 없다. 인증/내 보드 HTTP를 사용할 수 없으며 FE 실서버 연동 또는 VS1 완료 상태가 아니다.

실제 PostgreSQL migration 적용, 복합 FK, deferred Owner trigger, 오류 metadata 번역, 동시성/롤백은 여전히 미검증이다. schema/DDL의 정적 일치는 PostgreSQL 실행 성공을 뜻하지 않는다. 현 README 실행 경로는 과거 worktree 절대경로다. 후속 실행 시 현재 worktree의 `apps/api`를 사용해야 하며, 이번 문서 범위에서는 README를 수정하지 않았다. 현재 작업 트리에서 node_modules 존재나 실행 가능성도 새로 보증하지 않는다.

기존 QA 001~013 중 VS1 직접 관련 인수 문장은 002(초대 수락 전 상세 403 NOT_MEMBER)다. register/login/refresh/logout/내 목록/보드 생성 전용 인수 문장은 추가 요청해야 한다. CHARTER에 따라 케이스 없이 기능을 선행 구현하지 않는다.

## 이미 확정된 정책 — 다시 선택하지 않음

| 항목 | 확정 내용 | 근거 |
|---|---|---|
| 인증 인터페이스 | 자체 API `/v1`, Bearer JWT. register/login은 공개, accessToken + refreshToken + user 응답. refresh는 본문 refreshToken, 회전. logout은 인증 필요, 204 Refresh revoked | OpenAPI paths 및 securitySchemes.bearerAuth |
| 가입/내 정보 | 이메일 형식, 비밀번호 최소 8자, nickname 필수 1~30자. 중복 409 EMAIL_TAKEN, 로그인 실패 401 INVALID_CREDENTIALS. /me PATCH는 version 잠금 없음, 비밀번호 변경은 현재 비밀번호 필요 | feature-spec 3.1, OpenAPI 요청/응답 |
| 내 보드 | 내가 멤버인 보드만. BoardListItem.myRole은 호출자 멤버십에서 계산, DB 저장하지 않음 | v0.2.1 보드 목록 |
| 목록 외형 | cursor 문자열, limit 기본 20/최소 1/최대 100, items 및 nextCursor, 끝은 null, offset 금지 | erd-api 6, OpenAPI parameters |
| 생성 원자성 | board + OWNER member + 기본 컬럼 3개가 한 트랜잭션. 세 번째 컬럼만 is_done=true | v0.2.1 트랜잭션 최종 |
| 기본 컬럼 이름 | **할 일 / 하는 중 / 완료**. 이름은 미확정 항목이 아니다 | feature-spec 3.4 |
| 컬럼 순서 | 정수 position, 간격 1024, position unique 없음 | erd-api 유지 항목, v0.2.1 DB 제약 최종 |
| 상세 접근 | 초대 PENDING만 있고 멤버가 없으면 403 NOT_MEMBER, 내용 비노출 | QA 002, OpenAPI getBoard |

기본 컬럼 이름은 이전 별도 프로젝트 인계 메모의 추정보다 현재 계약 원문을 우선한다. JWT 사용 자체, 기본 컬럼 개수·이름, myRole, 목록 limit를 새 승인 사안으로 돌리지 않는다.

## 승인/관리자 계약 정리가 필요한 실제 공백

아래는 선택지와 영향이며 선택하거나 기본값을 적용한 것이 아니다. 관리자가 사용자 결정과 계약 근거를 기록한 뒤 관련 구현을 열어야 한다.

| ID | 남은 결정과 근거 | 선택지 및 영향 | 막히는 작업 |
|---|---|---|---|
| A1 | access/refresh TTL 수치 및 refresh 만료 기준이 없음 | 고정 만료 또는 사용 시 연장(절대 수명 상한 포함 여부). 짧고 긴 TTL은 재인증 빈도와 탈취 노출 기간에 영향. 숫자는 승인 필요 | 토큰 발급·만료 인수 케이스 |
| A2 | 세션 저장/식별, 다중 기기와 logout 폐기 범위가 없음. logout에 요청 본문이 없으므로 서버가 Bearer에서 폐기 대상을 식별할 방법 필요 | 현재 세션만 폐기하려면 세션 식별과 저장 모델 필요. 전체 세션 폐기는 다른 기기도 로그아웃시킴. 회전 토큰 재사용 시 해당 세션/토큰 계열/전체 세션 중 폐기 범위 결정 필요 | session schema, refresh/logout transaction |
| A3 | feature-spec 3.1은 로그아웃 후 보호 화면 거절, OpenAPI는 refresh 폐기만 설명. 기존 access JWT 유효기간 중 서버 거절 시점이 명시되지 않음 | 즉시 거절을 위해 세션 유효성 조회/폐기 확인을 둘지, 클라이언트 제거와 access 만료를 기준으로 할지 결정. 후자는 복사된 access의 API 접근이 계속될 수 있어 승인 없이 명세 충족으로 간주 불가 | guard, logout 인수 조건 |
| A4 | 비밀번호 변경 시 기존 세션 처리와 FE 토큰 보관 방식이 없음 | 현재/전체 세션 폐기 또는 유지; 메모리·브라우저 저장·서버 중계는 재접속과 세션 수명/노출 특성에 영향. 쿠키 전송을 추가하면 현재 JSON refresh 계약과의 관계도 관리자 결정 필요 | 비밀번호 변경, FE 인증 통합 |
| B1 | CreateBoardRequest.color는 선택적이고 응답 Board.color는 필수이나 계약에 기본 색상 값 없음 | 승인한 기본 색상 지정 또는 color 필수로 계약 개정. 후자는 기존 선택적 요청과 호환성 변화. 형식은 현재 string이므로 임의 hex/palette 제한도 추가하지 않음 | color 생략 보드 생성 |
| B2 | cursor 정렬 키/방향, 동률 기준, 페이지 사이 추가·삭제 의미, 잘못된 cursor 처리 미기재 | 생성 시각 기준 또는 가입 시각 기준(각각 안정적인 ID 동률 처리 필요), 갱신 시각 기준은 수정 시 순서 이동. 삭제된 anchor 처리와 오류 계약을 함께 고정. 표현 인코딩은 순서/검증 의미를 정한 뒤 구현 | 내 보드 목록 pagination |
| A5 | 현재 계약은 이메일 unique만 명시. 대소문자/공백 동일성 및 정규화 규칙은 현재 계약에 없음 | 대소문자 무시/정규화 또는 그대로 구분. 가입 중복·로그인·초대 이메일 일치 모두에 영향. 이전 계약을 가져올 경우 관리자가 현 contract에 근거 복원 필요 | 이메일 중복/로그인/초대 경계 |

### 기존 코드가 결정을 대신하면 안 되는 지점

- `apps/api/prisma/schema.prisma` Board.color는 이미 `@default("#5534DA")`, 초기 migration에도 동일한 DEFAULT가 있다. **현재 docs/contract에서 그 값의 승인 근거를 찾지 못했다.** 구현에 있다는 이유로 승인 완료로 취급하지 않는다. B1 결정 전 DB 적용/보드 생성 완료를 선언하지 않는다. 이번에는 수정하지 않았고 관리자/QA 확인 대상으로 보고한다.
- User.email은 String 및 unique, migration은 TEXT unique다. 이는 A5의 대소문자 무시를 보장하지 않는다. citext나 lower(email)을 승인 없이 덧붙이지 않는다.
- schema에는 refresh/session 모델이 없다. 기존 내부 transaction 서비스로 인증 수명주기를 대신할 수 없다.

## 작은 후속 구현 단위와 선행 조건

모든 단위는 관리자 BOARD 배정 + QA 인수 문장 작성 후 착수한다. 아래는 다음 구현 계획이지 이번 턴 산출 코드가 아니다.

1. **VS1-A0 계약 DTO/오류 및 직렬화**: 확정된 가입/로그인/내 정보 요청 경계와 공개 User 응답만 구현. nickname 길이·password 최소 길이·passwordHash 비노출을 DB 없이 검사. A5 결정 전 이메일 정규화는 구현하지 않는다.
2. **VS1-A1 register/login + GET /me**: A1/A2/A5 확정 후 암호 해싱, 사용자 생성/중복 오류, 통합 로그인 실패, 토큰 발급, guard를 작은 PR로 묶는다. 실패로 계정 존재를 구분하지 않는다. 해시 알고리즘/파라미터는 구현 보안 검토 대상으로 기록하며 제품 정책으로 위장한 새 비밀번호 제한을 만들지 않는다.
3. **VS1-A2 refresh/logout**: A1~A4 확정 후 세션 저장·회전·재사용·폐기 구현. 실제 동시 refresh는 DB 인수 검증 필수. 실패/폐기 이후 토큰을 되살리지 않는지 검사한다.
4. **VS1-A3 내 정보 변경**: PATCH /me와 POST /me/password. User에 If-Match를 전역 강제하지 않는다. password 변경은 A4의 폐기 정책과 함께 구현한다.
5. **VS1-B1 내 보드 목록**: 인증 기반 + B2 확정 후 멤버십 필터, myRole 응답, stable cursor를 구현한다. 비멤버 보드·다른 사용자의 역할 누출, 동률·마지막 페이지를 QA 케이스로 고정한다.
6. **VS1-B2 보드 생성**: B1 확정 후 한 트랜잭션으로 OWNER와 `할 일/하는 중/완료` 컬럼을 생성한다. position 간격 1024와 마지막만 완료 상태를 검증한다. Owner deferred trigger의 커밋 검증 및 중간 실패 rollback은 실제 PostgreSQL에서 확인해야 한다.
7. **VS1-B3 상세 접근/연결 인수**: QA 002에 맞춰 멤버십 접근 경계를 연결하고 FE가 실제 JWT로 가입→로그인→목록→생성→로그아웃을 수행하도록 한다. 보드 수정·삭제는 별도 배정 범위이며 이번 작은 목록/생성 단위에 자동 확장하지 않는다.

## DB 없이 검증 가능한 것 / 불가능한 것

DB 없이 가능한 후속 검사: DTO 입력 경계, User/BoardListItem 직렬화, JWT clock 주입 기반 만료 분기(승인 TTL로), 무인증 guard, mock membership 필터/내 역할 계산, 승인된 cursor 인코딩·디코딩과 동률 분기, 생성 트랜잭션 호출의 기본 컬럼 이름/순서/isDone, HTTP 오류 매핑, 기존 build/unit/부팅 smoke 회귀.

DB 없이 입증 불가: 이메일 실제 unique 경쟁, refresh 회전 동시성·재사용의 저장 원자성, pagination 실제 정렬과 데이터 변경 경계, 보드/멤버/컬럼 commit 및 rollback, deferred Owner trigger, migration SQL/드라이버 오류 metadata. mock에서 통과해도 QA 인수 통과 표시는 하지 않는다.

출구 조건: 승인 미결 항목의 관리자 계약 반영, VS1 QA 케이스 선작성, 실제 DB를 사용하는 후속 작업의 별도 허용과 검증, QA OUTBOX의 해당 인수 문장 통과. 지금은 **정책 공백과 구현 순서를 정리한 상태**다.
