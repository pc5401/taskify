# FE 화면 배치 준비 — 2026-10-12

기준 integration 8dabfd5. 최종 화면 디자인 및 제품 코드 작성 전 QA 선행 케이스와
사용자가 제공할 Figma 참조를 기다린다. DB 실행/접속 및 실제 서버 인수는 제외한다.

## 디자인 참조 조사

추적 파일에 Figma URL, 디자인 PNG/JPG/SVG, Tailwind 설정 없음.
agents/shared/orchestration-2026-10-11.md에는 Figma 참조 확보 후 Next/Tailwind
화면·mock 작업이라는 순서가 있다. agents/fe/OUTBOX.md와 apps/web/README.md도
Figma 근거 대기만 기록한다. 외부 첨부/과거 채팅 자료가 저장소 안에 있다는 근거는 없다.
Figma 수신 후 mandatory figma-design-to-code SKILL.md를 읽고 해당 노드의 디자인
context/스크린샷/asset을 확인한 뒤 배치·색상·typography·반응형 세부를 결정한다.
참조 확인 전 임의 UI 디자인을 확정하지 않는다.

## 화면과 기존 BFF 연결

| 화면/동작 | 브라우저 endpoint | 성공 후 상태 | 오류/경계 |
|---|---|---|---|
| 로그인 | POST /api/auth/login | 200 {user}; 내 보드로 이동 | INVALID_CREDENTIALS 401는 폼 오류 |
| 가입 | POST /api/auth/register | 201 {user}; 내 보드로 이동 | EMAIL_TAKEN 409, INVALID_INPUT 422 |
| 사용자 복구 | GET /api/me | 사용자 표시 | UNAUTHENTICATED 401는 로그인 이동 |
| 내 보드 | GET /api/boards?cursor=...&limit=... | items와 서버 nextCursor 사용 | 빈 목록/로딩/오류 구별, 422 책갈피 오류 |
| 보드 생성 | POST /api/boards | 201; 첫 페이지 새로 읽기 | 401/422 및 네트워크 오류 표시 |
| 로그아웃 | POST /api/auth/logout | 204; 사용자/목록 메모리 비우고 로그인 이동 | 502는 upstream 폐기 미확정 문구와 로컬 종료 표시 |

전송은 동일 origin 상대 URL, credentials same-origin, JSON body. 브라우저에서
access/refresh/Authorization을 만들거나 저장하지 않는다. 기존 BFF가 쿠키 및
Origin을 처리한다. 요청 중 중복 제출 금지, 취소/페이지 전환 시 오래된 응답이
최신 상태를 덮지 않도록 AbortSignal 또는 요청 식별을 사용한다.

이메일 입력은 원문 그대로 전송한다. trim/toLowerCase/Unicode 정규화 금지.
password도 변환 금지. 가입 password 최소8, nickname1~30은 YAML 근거다.
로그인 password에 가입 길이 제한을 새로 적용하지 않는다. 확인 password가
디자인에 존재하면 로컬 일치 확인용이며 upstream 추가 필드로 보내지 않는다.

보드 항목은 기존 BoardListItem의 id/title/description/color/version/createdAt/
updatedAt/myRole만 사용한다. OWNER/EDITOR/VIEWER는 서버 값을 사용한다.
색상 선택 UI의 유무와 palette는 디자인 근거 대기; 선택 생략 시 서버 기본
#5534DA. 임의 색상 제한은 추가하지 않는다. 상세 보드 페이지는 이번 범위 밖이므로
해당 페이지 구현을 전제로 한 가짜 링크를 만들지 않는다.

## Pagination 준비

nextCursor=null이면 다음 버튼/더 읽기 비활성화. 서버 cursor는 불투명 값으로
URLSearchParams로 인코딩하며 자체 decode/정렬 금지. 서버 순서를 유지한다.
잘못된 cursor는 422 INVALID_INPUT으로 명시하고 오류를 빈 목록으로 처리하지
않는다. 부모가 승인한 삭제 anchor/페이지 경계 정책은 새 contract 반영본을
확인한 뒤 연결한다. 현재 8dabfd5에는 기존의 세부 정책 미확정 문구가 있으므로
제품 동작을 추정해 구현하지 않는다.

## Tailwind 및 검증 준비

Next App Router의 layout/pages/client form 경계를 사용한다. Tailwind의 버전과
Next/PostCSS 연결은 프로젝트-local 의존성으로만 추가하고 현재 공식 문서를
확인한다. Figma에서 얻은 토큰을 공통 CSS/Tailwind theme에 매핑하고 asset은
참조에서 내려받은 것을 사용한다. 외부 font 임의 추가 금지.

QA 요청: 로그인/가입 원문 이메일, 인증 복구/401, 보드 empty/error/myRole,
생성 기본값/중복 제출, cursor 경계/책갈피 오류, logout204/502 상태의 선행 인수
문장과 UI mock 검증 범위를 제공해 주세요. mock fetch로 요청/응답 상태를 검증하고
기존 BFF8/8 및 transport5/5를 유지한다. TypeScript/Next build는 로컬 검증이며
실제 DB/HTTP/브라우저 인수로 표시하지 않는다. 화면 시각 검증은 Figma 수신 뒤다.
