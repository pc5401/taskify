# AUTH-BFF-004 BE는 refresh 원문 대신 해시와 재사용 판별 기록을 유지한다

## 인수 문장 및 근거

BE는 refresh 원문 대신 해시와 재사용 판별 기록을 유지한다.
근거: docs/contract/v0.2.1.md의 사용자 승인 브라우저 인증 B안 및 인증 세션 정책. upstream HTTP 성공/오류 형식은 docs/contract/openapi.yaml.

## 요청 / 재현

로그인 R0 후 POST /auth/refresh {refreshToken:R0}, 성공 R1 후 저장 상태를 관찰한다.

## 기대 HTTP와 저장 상태

성공은 OpenAPI 200. BE 인증 저장에 R0/R1 원문 없음. R0 무효화 및 해당 세션으로 귀속 가능한 이력이 남고 R1 해시가 유효하다. BFF 암호문 저장은 별도 승인 범위다.

## 변하지 않아야 하는 필드

사용자 및 다른 세션의 해시/폐기 상태 불변.

## 결과: 미실행

인수 규격만 작성. DB 설치/실행/접속 없음. mock 또는 정적 검토로 실제 DB/HTTP/브라우저 인수 통과를 주장하지 않는다.

