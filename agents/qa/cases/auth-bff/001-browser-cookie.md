# AUTH-BFF-001 브라우저는 불투명 영속 HttpOnly 쿠키만 받는다

## 인수 문장 및 근거

브라우저는 불투명 영속 HttpOnly 쿠키만 받는다.
근거: docs/contract/v0.2.1.md의 사용자 승인 브라우저 인증 B안 및 인증 세션 정책. upstream HTTP 성공/오류 형식은 docs/contract/openapi.yaml.

## 요청 / 재현

설정된 Origin에서 BFF 로그인 후 응답, 쿠키, local/sessionStorage 및 로그를 관찰한다. 브라우저를 종료하고 절대 만료 전 다시 열어 보호 중계를 요청한다.

## 기대 HTTP와 저장 상태

로그인/중계는 upstream 계약의 성공 코드. 쿠키는 서버 생성 랜덤 식별자, HttpOnly, SameSite=Lax, Path=/이며 종료 후 복구 가능한 만료 속성을 가진다. JSON/HTML/저장소/로그에는 accessToken/refreshToken이 없다.

## 변하지 않아야 하는 필드

관찰만으로 인증 세션 만료와 토큰 원문은 변경되지 않는다.

## 결과: 미실행

인수 규격만 작성. DB 설치/실행/접속 없음. mock 또는 정적 검토로 실제 DB/HTTP/브라우저 인수 통과를 주장하지 않는다.

