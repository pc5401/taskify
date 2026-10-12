# AUTH/BFF 독립 검토 (2026-10-12)

## 기준과 판정

- BE: 0f981eccc57bf867b4e0407136ae19418ad09397, .worktrees/be.
- FE: 4f0fa1d90aebeb9f4430c3eacda5da90917948f4, .worktrees/fe.
- 계약: docs/contract/v0.2.1.md 승인 BFF/인증 정책, openapi.yaml.
- QA 선행 규격: AUTH-BFF001~009, QA 브랜치 b49563e.

판정: **기반 코드의 정적/mock 범위 통과, 실제 기능 인수 보류**. 검토 범위에서 차단 결함을 발견하지 않았다. 실제 DB/HTTP/브라우저 통과를 뜻하지 않는다.

## 검토 근거

| 승인 요구 | 읽기 검토 근거 | 결과 한계 |
|---|---|---|
| 브라우저 불투명 영속 HttpOnly 쿠키/토큰 비노출 | FE bff.ts의 랜덤 쿠키, Max-Age/Expires, user만 반환, JSON 토큰 키/알려진 원문 제거 | 실제 브라우저 저장소/로그/응답 관찰 없음 |
| 운영 Secure, SameSite=Lax, Path=/, Origin403 | bff.ts cookie와 변경 요청 Origin 선검사; runtime.ts 운영 플래그 | 운영 브라우저/프록시 검증 없음 |
| PG 해시 조회 및 AES-256-GCM | crypto.ts 랜덤 IV, 인증 태그, session_hash AAD; runtime.ts 필수 키와 PG store만 구성 | 실제 SQL 적용/키 운영/재시작 미검증 |
| refresh 해시 이력, 15분 JWT, 절대7일 | BE auth-session.service.ts의 SHA-256 저장, consumedAt 유지, exp-iat900, 최초 expiresAt 재사용; access-token.service.ts HS256 서명/검증 | 실DB 저장 원문 검증 없음 |
| 회전된 토큰 재사용 현재 세션 폐기 | BE refresh: auth_sessions FOR UPDATE 후 재조회, consumedAt이면 revokedAt 갱신과 null 반환, transaction 밖에서401 | mock은 commit/rollback DB 의미를 구현하지 않음; throw-outside 구조 정적 확인 |
| 현재 logout, guard 즉시 확인 | BE logout sid 잠금/현재 행만 폐기; authenticate 매 요청 session 조회, sub 일치/폐기/만료 검사 | 보호 HTTP routes 미등록; guard를 모든 미래 route에 연결해야 함 |
| 동시 BFF refresh 최신행 직렬화 | FE store.ts BEGIN/SELECT FOR UPDATE 후 callback에서 복호화, 갱신/폐기 COMMIT; expires_at 변경 SQL 없음 | 실제 PG 다중 worker 경쟁 미검증 |
| 재시작 지속성 | BE/FE PG 저장 기반이며 런타임 메모리 대체 없음 | 실제 재시작/브라우저 복구 미검증 |

BE Prisma AuthSession/RefreshCredential/WebSession 및 additive SQL을 읽었다. FE INSERT가 UUID를 공급하며 web_sessions의 id/session_hash/encrypted_tokens/expires_at/revoked_at/created_at 이름과 타입이 일치한다. BE 인증 저장에 refresh 원문 필드는 없다. JWT sid/sub를 signature 검증 후 DB 사용자와 비교한다. 필수 키 검사는 AuthSessionModule provider 초기화에 있으며, 현재 AppModule에 아직 연결되지 않은 기반 모듈이다.

FE 라우트는 login/register/logout POST, me GET/PATCH, boards GET/POST에 제한된다. 브라우저 Authorization은 전달하지 않으며 고정 upstream 경로로 서버 토큰을 보낸다. Origin 누락/불일치는403 FORBIDDEN. Cookie 불능/세션 만료는401 UNAUTHENTICATED. 로컬 transport502는 새로운 도메인 code를 만들지 않는다.

## 독립 실행 및 보고된 검증 구분

QA 독립 실행: .worktrees/fe/apps/web에서 `node --experimental-transform-types --test checks/bff.test.mjs`, **8/8 PASS**, 종료0. Origin, 쿠키/응답, 인증 암호화, mock 두 worker 회전1회, 절대 만료, logout 실패/refresh, 상태/ETag를 확인했다. 테스트 store는 명시적 mock이고 runtime PG에 연결하지 않는다.

BE의 Prisma validate/generate, TypeScript build,3 suites/26 mock tests PASS와 FE build/typecheck는 각 역할의 보고를 읽었으며 QA 재실행으로 표기하지 않는다. BE 테스트 파일을 읽었고 재사용 폐기 테스트의 transaction mock은 callback 전달 방식이어서 실제 COMMIT 증거가 아니다.

DB 설치/기동/접속, migration 실행, 라이브 upstream, 브라우저, 의존성 설치 없음. 제품/계약 수정 없음. 기존 QA001~013과 AUTH-BFF001~009는 모두 미실행 유지.

## 후속 검증에서 반드시 남는 항목

실제 PG 잠금/rollback/migration, 두 BFF worker 동시 refresh, refresh 재사용의 commit 후 current access 차단 및 다른 세션 유지, 운영 쿠키/Origin, 브라우저/프로세스 재시작, 로그/저장소 비노출을 승인된 live 단계에서 검증해야 한다.

FE logout 네트워크 실패는 local row 폐기/쿠키 제거 후502로 upstream 폐기 미확정을 알린다. 이미 보유한 upstream access의 즉시 차단을 그 실패 상태에서 보장하거나204 성공으로 보고하지 않는다. BE HTTP 연결이 없는 현재 단계에서 실제 logout 인수 통과를 주장할 수 없다.

Nest 회전과 BFF 암호문 저장은 서로 다른 트랜잭션이다. upstream 회전 후 저장/COMMIT 실패 또는 응답 유실은 로그인 재요구 및 이전 refresh 재사용 폐기 위험이 있으며 FE README가 이를 명시한다. mock 직렬화가 분산 원자성 증거는 아니다.
