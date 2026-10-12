# FE 실제 BFF 검증 계획 — 2026-10-12

사용자 실제DB/API/BFF검증 승인 후 integration032ea67 반영. BE 격리 DB
(taskify_validation, port55432 예정) 인계를 기다리며 기존 DB/reset/delete 금지.
production .next/BUILD_ID 존재(직전 build PASS). enabled computer surfaces
apps=[]/browsers=[]이므로 실제HTTP cookiejar와 visual/click 검증을 구분한다.

## 실행 준비

apps/web/checks/live-worker.mjs는 ignored JSON 환경 파일에서 필요한 서버 env만
읽고127.0.0.1 ports3002/3003에 next start를 실행한다. 두 worker의
NEXT_APP_ORIGIN은 http://localhost:3002로 동일하다. 3003는 검증HTTP 접속만이며
브라우저origin 정책 변경이 아니다. TLS 브라우저 Secure-cookie 실제전송 검증이
아니라 운영 응답의 Secure 속성 및 명시 cookiejar HTTP 검증이다.

checks/live-bff.mjs는 TASKIFY_LIVE_ENV_FILE JSON을 읽는다. 필요한 구성:
DATABASE_URL, TASKIFY_LIVE_DATABASE_NAME=taskify_validation, TASKIFY_SESSION_KEY,
NEXT_APP_ORIGIN, TASKIFY_API_BASE, AUTH_JWT_SECRET. 비밀은 출력/커밋하지 않는다.
추가 override TASKIFY_LIVE_BFF_BASE/SECOND는 각각 localhost3002/3003 기본.
state는 .runtime/live-bff-state.enc에 AES-GCM 암호화한다. .runtime은 gitignore.
node --experimental-transform-types checks/live-bff.mjs initial 실행 후
BE와 두worker를 정상 종료/재시작하고 같은 환경키로 recovery 실행한다.

## 검증

initial: 새 고유계정 fixture만 등록/로그인한다. 누락/불일치 Origin403,
user-only 응답/토큰필드비노출, 256bit cookie, HttpOnly/Lax/Path/Secure 및
MaxAge<=7일/Expires, me 사용자, 보드생성201/default/ETag/목록myRole,
invalidcursor422, 실제PG ciphertext/hashlookup 및 upstream accessTTL900 확인.
이번 실행의 web_session fixture만 승인된 expired-access JWT로 재서명/암호화
수정한다(iat/exp 차900 유지, products TTL 변경 없음). 두worker 동시me요청
후 refresh_credentials 증가1, web_session deadline불변/미폐기 확인.

recovery: 같은 암호화fixture에서 cookie 복구, BE+Next 재시작 이후 동일 사용자
복구/절대만료불변. logout204/cookieclear/localPGrevoked 및 예전 access즉시401.
기존DB/기존행 손대지 않고 생성 fixture데이터는 보존한다. 모든 서비스는 실행
배치 종료 때 담당역할이 정상 종료한다. 상태/body/쿠키/키/토큰/DBURL을 로그로
남기지 않으며 named check 결과만 출력한다.

현재 결과: harness/worker node --check PASS. 실제검증은 BE 인계 전 미실행.
Figma 정밀보정은 기존 호출한도로 후속; 재시도하지 않는다. 상품정책 변경 없음.
