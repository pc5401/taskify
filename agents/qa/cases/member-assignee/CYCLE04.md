# Cycle04 멤버 조회·담당자 선행 인수

기준 integration60617aa, 기존 OpenAPI Member/카드 생성의 assigneeId, 부모가 전달한 사용자 승인 Cycle04 범위. 관리자 계약 보완 SHA는 추후 반영한다. 아래 모두 미실행. 브라우저 조작·시각/Figma 확인은 부모 담당, QA는 HTTP·fixture·정적/mock 증거만 독립 기록한다.

| 사례 | 인수 문장·요청 | 기대 | 불변 |
|---|---|---|---|
| MEMBER001 | Owner/Editor/Viewer 각각 GET /boards/{id}/members 및 BFF 동일 조회 | 200 {items:Member[]}; 실제 membership 사용자 userId/role/joinedAt 및 optional nickname. 공개 projection만, email/password/session/token 비노출 | 회원·보드·session 자동 변경 없음; 초대만 있는 사람 포함 없음 |
| MEMBER002 | 외부/PENDING 사용자/없는 보드 UUID/다른보드 membership로 조회 | 403 NOT_MEMBER; 다른보드나 대상 회원 내용 없음 | invitation/membership/user 불변 |
| MEMBER003 | UUID 형식 오류, 인증 없음/깨진 JWT/만료·폐기 session | UUID422 INVALID_INPUT; 무효 인증401 UNAUTHENTICATED; Viewer 권한은 허용 | 응답 오류에서 SQL·비밀 없음; 기존 session 범위 밖 폐기 없음 |
| ASSIGNEE001 | Owner/Editor 유효 멤버 userId로 생성, 미지정 assigneeId:null 생성 | 201 Card+ETag; DB assignee_id 정확 또는 null, creator_id 인증사용자, activity 원자적 | 기존 다른 카드 담당자 불변 |
| ASSIGNEE002 | Viewer 생성/비멤버·외부보드 담당자/없는 사용자/invalid UUID로 생성 | Viewer403 FORBIDDEN, 접근 없는 시작자원403; 권한 확인 뒤 유효 외부 사용자422 CROSS_BOARD/없는 사용자 및 형식422 INVALID_INPUT | card/tag/link/activity 잔존 없음, 전체 run snapshot 불변 |
| ASSIGNEE003 | 카드 목록 assigneeId 필터·태그/컬럼 AND 조합 및 멤버 조회 | 요청 userId 카드만 반환; 미지정 카드는 지정사용자 필터에 없음. 다른 보드 유효 사용자필터200빈목록 | GET 후 모든 관련 행/version/updated_at 불변 |
| UI001 | 생성 담당자 dropdown에 실제 board member만, 미지정 옵션 선택 | userId 제출, 미지정null; 표시 nickname은 optional fallback 사용자ID 등 안전표시. 필터는 선택 userId, 카드 담당자 nickname 표시 | client 이메일/credential/token 없음, nicknames를 HTML로 주입하지 않음 |
| UI002 | 멤버조회 실패/401/403, 생성 실패/중복제출/성공 후 재조회 | 잘못된 담당자 목록으로 성공 처리하지 않음; role 기반 폼+서버 권한; 오류 표시·중복방지·실제 서버 상태 재조회 | stale 다른보드 멤버·카드 노출 없음 |

Member 조회 순서/검색/전체 user directory, role 관리 HTTP를 새 정책으로 추가하지 않는다. 닉네임 absent/null 처리 범위는 실제 계약의 optional schema를 따라 확정한다. 실제 HTTP 통과를 브라우저 dropdown 클릭/시각 통과로 대체하지 않는다.

## 브라우저 fixture 계획

부모 DB ready 전 연결/start 금지. gate+loopback55432/taskify_validation 확인 후 새 run owner/editor/viewer와 외부/PENDING 경계용 사용자만 SQL seed한다. 사용자 데이터가 없는 새 보드, 기본 active2/done1 컬럼, 미완료 선행, 원문 태그, 카드7개와 담당자3샘플(Owner/Editor/Viewer), 미지정 카드를 만든다. SQL fixture는 제품 생성 성공 증거와 별도다.

부모 로그인용 dummy example.test 계정 및 고정 nonproduction test password는 agents/qa/live/.runtime의 ignored JSON에만 저장한다. 문서·Git·tool 로그에 credential 원문을 쓰지 않는다. 부모에게 파일 경로만 전달한다. 기존 사용자 데이터 reset/삭제 없음, 새 fixture 보존. QA는 브라우저 조작하지 않으며 부모가 실행한 클릭/시각 결과는 역할 증거로 구분한다.
