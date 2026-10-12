# AUTH-BFF-005 access 15분, refresh 로그인 기준 절대 7일

## 인수 문장 및 근거

access 15분, refresh 로그인 기준 절대 7일.
근거: docs/contract/v0.2.1.md의 사용자 승인 브라우저 인증 B안 및 인증 세션 정책. upstream HTTP 성공/오류 형식은 docs/contract/openapi.yaml.

## 요청 / 재현

시각 T0에 로그인, JWT exp/iat 확인. T0+6일에 refresh 회전, T0+7일 경계 이후 회전과 보호 요청을 시도한다.

## 기대 HTTP와 저장 상태

access exp-iat=900초. 회전 후 refresh 만료는 T0+7일을 초과하지 않는다. 절대 만료 이후 refresh와 만료 세션 보호 접근은 401; 세부 오류 code는 OpenAPI Unauthorized 범위에서 확인한다.

## 변하지 않아야 하는 필드

회전으로 최초 로그인 시점 또는 절대 만료가 연장되지 않는다.

## 결과: 미실행

인수 규격만 작성. DB 설치/실행/접속 없음. mock 또는 정적 검토로 실제 DB/HTTP/브라우저 인수 통과를 주장하지 않는다.

