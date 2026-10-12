# FE Live BFF 검증 기록 — 2026-10-12

기준 integration032ea67 / FE UI1d7f12e. 사용자 실제 DB/API/BFF 검증 승인.
환경: BE 인계 PostgreSQL18.4, loopback127.0.0.1:55432/taskify_validation,
기존2migration 적용(BE 보고), 실제 Nest127.0.0.1:3301/v1. Next16.4.0
production workers127.0.0.1:3002/3003, 공통configured Origin127.0.0.1:3002.
BE env JSON을 FE ignored .runtime/live-fe-env.json에 필요한 구성으로 복사;
비밀출력/커밋 없음. 기존 DB/reset/delete 하지 않았고 이번 고유fixture만 생성.

## 초기 실제HTTP/PG — PASS29 checks

node --experimental-transform-types checks/live-bff.mjs initial 실행.
등록201/로그인200 user-only응답과 원문email, 256bitopaque cookie,
prodSecure/HttpOnly/Lax/Path/Expires/MaxAge<=604800, Origin누락/불일치403,
GETme 동일사용자, CREATEboard201/default#5534DA/ETag 및 목록OWNER myRole,
invalidcursor422 보존. PostgreSQL web_sessions에서 SHA256hashlookup 및
AES-GCM bundle복호화/원문token없는암호문, 실제 upstream accessTTL900 확인.

부모가 승인한 이번 fixture web_session에만 expiredaccess를 재서명/암호화로
주입했다. 동일 sid/sub, iat/exp차900 유지; 제품TTL/7일 정책 변경 없음.
Promise.all로 two productionworkers GETme 동시시작해 둘다200으로 원래사용자
반환. 실제PG refresh_credentials count가1늘고 web_sessions.expires_at
불변/revoked_atnull. 개별 request응답에는 token/passwordHash/ciphertext키 없음.

첫 실행은 연결후 safetygate에서 inet::text가127.0.0.1/32로 반환되어 fixture
생성전에 중단. host(inet_server_addr())로 IP표기를 정규화해 재실행했다.
연결전 URLscheme/loopbackhost/55432/path taskify_validation,
연결후 current_database/loopbackhost/port55432 일치가 모두필수다.

## 재시작 복구

QA checkpoint 및 부모 동기화 후 BE와 Next두worker를 동일환경으로 재시작했다. 암호화fixture상태는 ignored
.runtime/live-bff-state.enc에만 저장했다. 실제BE+Next2workers 재시작 뒤
recovery phase 실제HTTP/PG12checks PASS. 동일cookie로 두worker에서 원래사용자200복구 및 PostgreSQLabsolute deadline불변 확인. logout204/MaxAge0/localPGrevoked persisted, oldBFFcookie401와 이전upstreamaccess/me401 확인. initial29+recovery12=41namedchecks PASS. Nextworkers는 부모cleanup요청까지 유지한다.

## 범위와 한계

cua enabled inventory apps=[]/browsers=[]; 실HTTP cookiejar검증이다.
운영응답의 Secure속성확인과 HTTP수동Cookie전송이며 HTTPS브라우저의
실제cookie송신/저장소/시각/click/브라우저종료복구 인수는 아니다.
실제두worker/PG회전경로 검증과 syntheticexpiredaccess timefixture를 구분한다.
900초 자연경과를 기다린 검증/7일 자연만료/PG서버재시작은 하지 않았다.
정밀Figma보정은 이전한도로 대기하며 재시도하지 않았다.
