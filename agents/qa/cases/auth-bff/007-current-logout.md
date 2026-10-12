# AUTH-BFF-007 logout은 현재 세션만 폐기하며 기존 access를 즉시 거절한다

## 인수 문장 및 근거

logout은 현재 세션만 폐기하며 기존 access를 즉시 거절한다.
근거: docs/contract/v0.2.1.md의 사용자 승인 브라우저 인증 B안 및 인증 세션 정책. upstream HTTP 성공/오류 형식은 docs/contract/openapi.yaml.

## 요청 / 재현

S1/S2 로그인 후 S1 access로 POST /auth/logout. 아직 JWT 만료 전인 S1 access 및 refresh로 재요청하고 S2 보호 요청도 보낸다.

## 기대 HTTP와 저장 상태

logout 성공은 OpenAPI 응답. S1 보호/refresh는 즉시 401. S2 보호/refresh는 유효하게 유지. 모든 보호 경로의 guard는 세션 유효성을 확인한다.

## 변하지 않아야 하는 필드

S2 폐기 상태/만료/회전 이력 불변. 사용자 전체 세션 폐기 금지.

## 결과: 미실행

인수 규격만 작성. DB 설치/실행/접속 없음. mock 또는 정적 검토로 실제 DB/HTTP/브라우저 인수 통과를 주장하지 않는다.

