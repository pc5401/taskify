# Auth / me / boards HTTP 선행 인수 규격

기준: 통합 8dabfd5 (b6b2282 기반과 이메일/페이지 경계 승인 포함), docs/contract/openapi.yaml v0.2.1 및 v0.2.1.md 승인 정책, feature-spec.md 3.4. 실제 API는 /v1, 브라우저 중계는 /api. 기존 QA001~013 및 AUTH-BFF001~009를 수정하지 않는다. 아래 모든 결과는 **미실행**이다. DB 설치/기동/접속 없이 인수 규격만 작성한다.

각 절은 독립 인수 케이스다. HTTP 공개 응답은 계약 schema에 맞추며 password/passwordHash, 세션/회전 해시, 암호문 등 내부 저장 필드를 노출하지 않는다. 직접 BE auth의 accessToken/refreshToken은 승인된 공개 계약이고 브라우저 BFF는 user만 반환한다. 미정 정책을 구현 선택으로 확정하지 않는다.

## HTTP-001 Register 유효 입력/응답

요청: POST /v1/auth/register {email:"qa-one@example.test",password:"valid-pass",nickname:"QA"}.
기대:201 AuthResponse(accessToken,refreshToken,user). user는 id/email/nickname/createdAt 및 선택 avatarUrl의 User schema. 비밀번호는 안전한 해시로 저장하고 원문은 DB/로그/응답에 없다. 세션 발급은 AUTH-BFF004~005 수명/해시 규격을 충족한다. BFF는 승인 Origin으로 동일 요청 시201 {user}와 opaque HttpOnly cookie만 반환한다.
불변: 다른 사용자/세션/보드 행 불변. 결과: 미실행.

## HTTP-002 Register DTO 경계 및 중복

요청: required email/password/nickname 각각 누락; email 형식 오류; 비string; password7자; nickname0자/31자. 각각 독립 요청. 유효한 password8자, nickname1자/30자 경계도 확인. 이미 저장된 **완전히 동일한 email 문자열**로 재등록.
기대:잘못된 schema 입력422 INVALID_INPUT, 정상 경계201, 동일 email 중복409 EMAIL_TAKEN. 오류 envelope code/message/details. malformed JSON은 request 검증 대상으로 명확히 거절하되 정확한 HTTP/code는 계약에 명시되지 않아 별도 관리자 확인 대상이다. unknown key 거절/무시 정책과 nickname 공백 trim 정책도 발명하지 않는다.
불변:거절 시 users/auth_sessions/refresh_credentials에 부분 생성 없음, 기존 사용자 비밀번호/프로필 불변. 결과: 미실행.

## HTTP-003 Login 검증/오류/공개 응답

요청:등록한 계정/맞는 password로 POST /v1/auth/login; 같은 email의 틀린 password; 존재하지 않는 email. BFF에도 승인 Origin으로 요청.
기대:정상200 AuthResponse 및 신규 로그인 session. 틀린 password/없는 계정은 둘 다401 INVALID_CREDENTIALS이며 user/token/passwordHash 원문 없음. BFF 정상200 {user}/cookie, 실패401 유지. 로그인 요청 required email/password의 string/email 제약은 반드시 검증하나 login path에422 응답이 없으므로 schema 위반의 정확한 오류 매핑은 관리자 확인 대상으로 유지한다. register password8자 제약을 LoginRequest에 임의 추가하지 않는다.
불변:실패는 세션 발급/기존 세션 폐기 없음. 결과: 미실행.

## HTTP-004 Refresh HTTP 및 rotation/reuse

요청:POST /v1/auth/refresh {refreshToken:R0}; 새 R1 재사용 정상 회전; 이미 소비한 R0 재사용; unknown/expired token. 누락/비string 입력은 schema 검증 대상으로 별도 실행.
기대:정상200 **AuthResponse의 필수 user 포함**; 15분 access와 절대7일 만료 유지. unknown/expired/재사용 token401 UNAUTHENTICATED. 소비 R0 재사용은 해당 로그인 session 폐기, R1/현재 access도 거절, 다른 session 유지. 인증 실패와 DTO schema 위반을 구분하며 refresh path에는422가 선언되지 않아 DTO 오류의 정확한 code/status는 미확정으로 보고한다.
불변:회전으로 expiresAt 연장 금지; 거절 시 새 credential 발급 금지; 재사용 이력 삭제 금지. 결과: 미실행. 세부 DB/경쟁 규격은 AUTH-BFF004~006,008.

## HTTP-005 Logout 현재 세션 즉시 차단

요청:같은 사용자 S1/S2를 로그인. S1 access로 POST /v1/auth/logout 후 만료 전 S1 access로 GET /me와 GET/POST /boards, S1 refresh. S2 access로 GET /me.
기대:logout204 body 없음; 이후 S1 요청401 UNAUTHENTICATED; S2 정상. missing/malformed/tampered/expired bearer는401 UNAUTHENTICATED. BFF Origin 누락/불일치403 FORBIDDEN, 정상 logout 쿠키 제거. BFF 네트워크502는 upstream 폐기 미확정으로 구분하며 즉시 차단 통과로 표시하지 않는다.
불변:S2/auth user/board 행 불변. 결과: 미실행.

## HTTP-006 GET /me 현재 사용자 및 비밀 제외

요청:U1 access로 GET /v1/me; query/header에 U2 식별자를 덧붙여 반복. bearer 누락/invalid/revoked/absolute-expired 반복. BFF cookie로 GET /api/me.
기대:200 User는 항상 인증 U1. passwordHash/refresh 기록/암호문/token bundle 없음. 무효 session401 UNAUTHENTICATED (승인된 모든 보호 요청 유효성 정책 근거; GET /me 경로의 개별401 선언 부재와 구분). BFF도 cookie의 서버 세션 사용자이며 브라우저 bearer를 신뢰하지 않는다.
불변:프로필/멤버십/세션 만료 읽기 불변. 결과: 미실행.

## HTTP-007 GET boards 멤버십/myRole 및 정렬

사전:U1은 B1 OWNER, B2 EDITOR, B3 VIEWER. B4 비멤버이며 미수락 초대만 존재. 같은 joined_at인 보드2개와 서로 다른 joined_at을 준비.
요청:U1 GET /v1/boards, BFF GET /api/boards; U2로 반복.
기대:200 BoardPage {items,nextCursor}; 각 item은 Board 필드와 호출자 OWNER|EDITOR|VIEWER myRole. 비멤버/미수락 보드 제외; U2도 자기 membership만 포함. joined_at DESC, 동률 board_id DESC. myRole 저장 컬럼 없음. 목록과 생성 응답을 구분:POST Board에 myRole 필수를 추가하지 않는다.
불변:읽기로 memberships/board.version/updatedAt/가입시각 변경 없음. 결과: 미실행.

## HTTP-008 GET boards pagination/invalid cursor

요청:limit 생략/유효 경계값/범위 밖/비정수, 정상 nextCursor 연속 요청, 손상된 cursor 요청. 고정 데이터로 페이지들을 합친다.
기대:유효 limit1~100, 기본20 (OpenAPI parameter), nextCursor=null은 끝. 고정 데이터에서 승인 정렬을 따라 중복/누락 없이 다음 page. 잘못된 cursor422 INVALID_INPUT. limit schema 위반은 거절하며 /boards GET에 개별422 선언이 없는 점을 보고한다. 임의 cursor 서명/encryption 정책은 추가하지 않는다.
불변:board/member 읽기 불변. cursor는 마지막 항목 joined_at/board_id 경계를 저장한다. 첫 페이지 anchor를 삭제하고 같은 cursor로 요청해도 저장 경계 뒤 항목을200으로 계속 조회한다. 새로 참여한 보드는 새로고침한 첫 페이지에서 확인하며 기존 cursor에 snapshot/전체 변경 일관성을 요구하지 않는다. 결과: 미실행.

## HTTP-009 POST boards 기본값/입력/응답

요청:인증 U1 POST /v1/boards {title:"QA board"}; description/color 명시 반복; title누락/비string/0자/81자, description501자, color비string. title1자/80자와 description500자 정상 경계.
기대:정상201 Board 및 버전에 맞는 ETag. color 생략 #5534DA, 명시 color는 string 그대로이며 임의 색상 목록/hex 제약 금지. title/description은 CreateBoardRequest 제약. schema 위반은 거절하며 POST /boards 개별422 선언 부재 때문에 정확한 매핑 관리자 확인. 인증 없으면401 UNAUTHENTICATED, 브라우저 쓰기 Origin 누락/불일치403 FORBIDDEN. 생성에 If-Match 요구를 추가하지 않는다.
불변:실패 시 기존 board/member/column 및 사용자 불변. 결과: 미실행.

## HTTP-010 POST boards transaction/기본 컬럼

요청:U1 보드 생성 후 저장/목록 확인. board 생성/owner member 생성/기본 column 생성 각 단계에서 실패를 주입한 독립 시나리오.
기대:성공은 board1개, U1 OWNER membership1개, 기본 컬럼 할 일/하는 중/완료3개이며 세 번째만 is_done. 전부 하나의 transaction으로 생성. 실패는 전체 rollback, ghost board/member/partial columns 없음. 생성 성공 후 목록은 myRole OWNER 및 승인 정렬에 참여. 실제 SQL 오류/rollback은 live DB 단계에서 검증해야 하며 mock 호출 순서만으로 통과하지 않는다.
불변:다른 board/member/column 불변; 실패 시 해당 생성 집합은 전부 미존재. 결과: 미실행.

## HTTP-011 승인 이메일 동일성

요청: Case@example.test 등록 후 같은 password로 case@example.test 로그인; 같은 대소문자 email 로그인; 대소문자만 다른 형식 유효 email 등록; 양끝 공백 때문에 기존 email 형식에 어긋난 입력 등록/로그인.
기대:입력 그대로 저장/비교하며 trim/lowercase 금지. 다른 대소문자 로그인401 INVALID_CREDENTIALS, 동일 문자열 로그인200. 대소문자 변형은 별도 email로 정상 등록201; 완전히 동일 문자열만409 EMAIL_TAKEN. 공백 입력을 trim하여 유효 계정으로 연결하거나 등록하지 않는다. 기존 format 검증에 따라 거절한다; login schema 오류 code/status 미명시 사항은 HTTP003과 동일하게 보고한다.
불변:다른 문자열 로그인 실패가 기존 사용자 email/password/session을 변경하지 않는다. 결과: 미실행.

## 결과 및 인수 게이트

새 HTTP001~011 전부 미실행. 기존22개도 상태 변경 없음. 모듈/DTO/mock/build 정적 검토를 실제 HTTP/PG/브라우저 인수로 승격하지 않는다. 아직 명시되지 않은 오류 매핑은 후속 구현의 선택을 승인 근거로 간주하지 않는다. 이메일/삭제 anchor 정책은8dabfd5 승인대로 확정했다.
