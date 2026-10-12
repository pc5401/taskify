# AUTH-BFF-006 회전된 refresh 재사용은 그 로그인 세션을 폐기한다

## 인수 문장 및 근거

회전된 refresh 재사용은 그 로그인 세션을 폐기한다.
근거: docs/contract/v0.2.1.md의 사용자 승인 브라우저 인증 B안 및 인증 세션 정책. upstream HTTP 성공/오류 형식은 docs/contract/openapi.yaml.

## 요청 / 재현

같은 사용자 세션 S1/S2 로그인. S1 R0를 회전하여 R1을 받고 R0 재사용, 이후 R1과 기존 S1 access로 보호 요청. S2도 보호 요청한다.

## 기대 HTTP와 저장 상태

첫 회전 200. 재사용 401 UNAUTHENTICATED, S1 폐기. S1 R1/기존 access는 즉시 401. S2 유효 요청은 성공한다.

## 변하지 않아야 하는 필드

S2 폐기 시각/토큰/만료, 사용자 행 불변. R0 다시 활성화 금지.

## 결과: 미실행

인수 규격만 작성. DB 설치/실행/접속 없음. mock 또는 정적 검토로 실제 DB/HTTP/브라우저 인수 통과를 주장하지 않는다.
