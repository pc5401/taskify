# AUTH-BFF-002 운영 Secure 및 변경 요청 Origin 검증

## 인수 문장 및 근거

운영 Secure 및 변경 요청 Origin 검증.
근거: docs/contract/v0.2.1.md의 사용자 승인 브라우저 인증 B안 및 인증 세션 정책. upstream HTTP 성공/오류 형식은 docs/contract/openapi.yaml.

## 요청 / 재현

운영 설정의 로그인 Set-Cookie를 확인한다. BFF 변경 요청을 설정 Origin, 누락 Origin, 다른 Origin으로 각각 보낸다.

## 기대 HTTP와 저장 상태

운영 쿠키 Secure. 누락/불일치 Origin은 403 FORBIDDEN. 일치 Origin만 downstream으로 진행한다. 특정 BFF URL은 FE OUTBOX의 구현 경로에 매핑한다.

## 변하지 않아야 하는 필드

거절된 요청은 web_sessions, 인증 세션, 회전 기록 및 대상 업무 행을 변경하지 않는다.

## 결과: 미실행

인수 규격만 작성. DB 설치/실행/접속 없음. mock 또는 정적 검토로 실제 DB/HTTP/브라우저 인수 통과를 주장하지 않는다.

