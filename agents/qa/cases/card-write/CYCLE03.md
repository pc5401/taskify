# Cycle03 카드 생성·이동 선행 인수

기준 승인계약64f7ae9 / 통합2650067 (선행 integration6528fea), 기존 OpenAPI CreateCardRequest/MoveCardRequest/Card 및 v0.2.1 트랜잭션 규칙. shared/cycle-03-preparation.md의 세 제안은 부모가 전달한 2026-10-13 사용자 승인으로 확정했다. 계약 보완401/422CardWriteInvalid/409CardMoveConflict를 반영했다. 선행 작성 당시 아래 모두 미실행이며 제품 구현을 승인 근거로 삼지 않는다. 최신 결과는 마지막 절과 별도 RESULTS를 참조한다.

POST /columns/{columnId}/cards 생성, POST /cards/{cardId}/move 이동만 포함한다. 별도 카드 PATCH/삭제/의존 변경/태그 편집 HTTP는 제외한다. SQL 준비 fixture는 제품 생성 기능 통과 증거가 아니다.

| 사례 | 인수 문장과 요청 | 기대 | 실패 또는 no-op 불변 |
|---|---|---|---|
| WRITE001 | Owner/Editor가 유효 생성 body 제출, 계약 외 creatorId 입력은 무시하고 인증사용자를 작성자로 저장하는지 확인(unknown field422 요구 없음) | 201 공개 Card, ETag=version; 작성자는 인증사용자. 끝에 추가. 선택필드/태그 연결 정확 | 비밀/session 필드 비노출; 다른 보드 불변 |
| WRITE002 | Viewer/외부/PENDING/없는 시작 column 또는 card의 생성·이동 | 접근 불가 403; 비멤버 내용 비노출. revoked/expired/missing 인증401 | card/column/tag/link/activity 모두 불변 |
| WRITE003 | UUID/body/필드 길이/타입/date 검증 및 잘못된 연결. 권한 확인 뒤 foreign column/assignee/predecessor/beforeCard | 계약대로422 INVALID_INPUT 또는 CROSS_BOARD; 접근 가능한 시작 자원부터 검증 | 신규 card/tag/link/activity 없음; source와 destination 불변 |
| WRITE004 | 이동 If-Match 누락, 오래된 version, 정상 최신 version | 428 IF_MATCH_REQUIRED; 409 VERSION_CONFLICT(details.version 현재값); 정상200 Card+ETag | 실패 card.column_id/position/version/updated_at 및 activity 불변 |
| WRITE005 | WIP 한 자리 남은 destination에 다른 요청으로 동시 create/create, create/move, move/move | 각 경합 정확히 하나 성공, 하나409 WIP_LIMIT_EXCEEDED; count<=limit | 실패 요청 card/tag/activity 잔존 없음, 이동 source 유지 |
| WRITE006 | 다른 목적지로 같은 card+같은 If-Match 동시 이동 | 하나만 실제 변경 성공; 다른 요청409 VERSION_CONFLICT | 실패 목적지에 phantom placement/activity 없음; version 단일 변경 |
| WRITE007 | 같은 column이 full인 상태에서 자기 자신 제외한 재배치; 자기 beforeCard 이동; 이미 바로 앞 또는 이미 끝 이동 | 재배치 허용; 자기 앞422; 결과순서 동일200 no-op | no-op version/updated_at/position/activity 불변; 자기 앞 실패 불변 |
| WRITE008 | beforeCard 앞/끝 이동, position gap 소진, 시작/끝 Int32 overflow 준비 | 목적지 최종 순서 정확; 필요시1024 간격 정리; 위치가 바뀐 기존 카드 version 증가 | 정리 외 다른 컬럼/보드 불변; 모든 position Int32 범위. 기존 동률은 position/id 읽기 순서 기준 |
| WRITE009 | 미완료 선행 카드의 종속 카드를 done column으로 이동 | 200 허용, blocked=true, warnings=[BLOCKED_BY_PREDECESSOR]; active 목적지면 warnings=[] | blocked/completed 저장 필드 생성 없음; predecessor 관계 불변 |
| WRITE010 | 생성 tags 대소문자 중복/기존 표기/공백 원문, 동시에 같은 새 lower(name) 태그 생성 | lower 중복 기존 tag 재사용, 최초 저장 표기 유지, 요청 중복 link 제거, 공백 trim하지 않음; concurrent 두 생성 성공 | board+lower(name)당 tag1행, card+tag당 link1행; 다른 보드 tag는 공유하지 않음 |
| WRITE011 | 카드·태그·link·activity가 생성/이동 성공과 원자적으로 커밋; 실제 제약 실패를 유발한 run-owned fixture | 성공 관련 행 함께 존재; 실패 rollback 후 전체 snapshot 동일 | 실패 후 카드/태그/link/activity/version/updated_at 잔존 변화 없음 |
| WRITE012 | BFF 생성/이동, Origin missing/mismatch, browser bearer 위조, UI 중복제출/409/428/422 처리 | 서버 token으로만 중계, Origin403 FORBIDDEN; 공개 결과/ETag 보존; UI 성공후 서버 재조회·오류 표시·중복방지 | client access/refresh 비노출. 실제 클릭/시각과 HTTP/mock 증거 분리 |

## 실제 실행 계획과 게이트

부모 ready 이전 DB/API/BFF 연결 및 start 금지. 기존 보존 cluster127.0.0.1:55432/taskify_validation만 사용한다. runtime env를 비출력으로 읽고 DB명/loopback 및 명시 ready 값을 검증하는 독립 harness를 agents/qa/live에 준비한다. 모듈은 기존 pg/jsonwebtoken을 읽기 재사용하며 설치하지 않는다.

각 실행 UUID 신규 owner/editor/viewer/외부와 보드·컬럼·카드만 seed하고 서로 다른 경합마다 별도 목적지와 count snapshot을 둔다. 실제 HTTP 요청을 Promise.all로 출발시키며 최종 DB 상태/응답/활동 행을 교차 확인한다. 타임아웃이나 통신 오류는 성공으로 처리하지 않는다. WIP와 CAS는 순차 mock으로 대신 통과시키지 않는다. rollback 검사는 새 fixture만 제한적으로 조작하고 임시 제약을 사용한다면 finally에서 제거한다. 기존 사용자 데이터 삭제/reset/TRUNCATE 금지, 결과 fixture 보존.

API 실검증/BFF 실검증/실제 Nest+mock persistence/순수 helper mock/정적 검토/실브라우저 클릭은 따로 기록한다. CUA 표면이 없으면 브라우저 미실행을 유지한다. 기존33와 READ11의 공백을 자동 통과시키지 않는다. 서버 종료는 부모 조율이다.

## 계약 확인 완료

64f7ae9에401/422 복합오류 및 move409 복합오류를 선언했다. If-Match는 strong quoted positive integer만 허용, 형식 오류422 INVALID_INPUT/누락428 IF_MATCH_REQUIRED다. no-op은 현재 ETag/version 반환. 재정렬 다른 카드에 새 활동 이벤트/개수를 요구하지 않고 기존 이벤트 payload non-null 및 원자성만 확인한다. CreateCardRequest에 priority가 없으며 unknown field의 새로운 거부 정책을 요구하지 않는다.

## 2026-10-13 최신 결과

독립 실제19checks PASS(run c5f04bf7-7c3e-4efb-8e81-22efb42f7aa3), BE1618099/FEb785965 기준. WRITE001~012 부분 증거와 미실행 범위는 agents/qa/live/CYCLE03-RESULTS.md에 매핑했다. BE 서비스/DTO unit15 및 FE mock22 독립 PASS는 actual과 별도다. 전체 사례·기존업무를 자동 완전통과 처리하지 않는다. 실제 브라우저 표면 없어 클릭/시각 미실행 유지.
