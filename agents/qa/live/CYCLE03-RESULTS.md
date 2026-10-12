# Cycle03 생성·이동 독립 QA 결과

2026-10-13. 승인계약64f7ae9/통합2650067. BE 제품161809962154be9e9d802e43fe93b186e04133f8, 최종 인계98b80a62f74e86a1d857051a26426e99361aa3db는 문서/README만 변경했다. FE b785965bdd4df8dc9877a3631dd66bf33cea2ae0. 독립 정적 검토 및 mock 실행 시 최종 HEAD/clean 확인. 부모는 실행 dist가 BE 제품 최종 소스와 같으며 FE 최신 hotreload 기준이라고 확인했다.

## 독립 실제 DB/API/BFF

cycle03-write.cjs **19 checks PASS / exit0**, run c5f04bf7-7c3e-4efb-8e81-22efb42f7aa3. 다른 사이클 검증 숫자와 합산하지 않는다. preserved PG18.4 127.0.0.1:55432/taskify_validation, API3301/v1, BFF3002. active-db pointer→config.directory/runtime-env.json을 읽기 사용하고 명시 ready gate/DB명/loopback 검사. 기존01c8 pg/jsonwebtoken 읽기 재사용, 설치 없음.

고유 run 사용자5명/보드2개/컬럼/카드/tag/session/ciphertext를 SQL fixture로 준비했다. 실제 생성·이동은 HTTP로 호출했다. seed 세션은 실제 login 발급 검사가 아니며 서버의 JWT+DB guard 실행과 구분한다. 기존 데이터 reset/TRUNCATE/삭제 없음, 세 실패/성공 run fixture를 보존했다. 마지막 auth 검사에서 run-owned 세션만 폐기/절대만료시켰다.

| 선행 규격 | 실제 확인한 증거 | 남는 범위 |
|---|---|---|
| WRITE001 | API+BFF Owner/Editor201, 공개 Card/ETag; DB creator_id=auth사용자(요청 creatorId 위조 무시); 설명/담당자/선행 저장 | 모든 선택필드 조합과 dueAt 저장값 전수 검사는 아님 |
| WRITE002 | API+BFF Viewer/외부/PENDING403, missing 시작자원403 NOT_MEMBER, 무인증401; 마지막 revoked/absolute-expired401 | 모든 오류 우선순위 조합을 전수 실행하지 않음 |
| WRITE003 | 길이/타입/UUID/없는 및 타보드 연결422, beforeCard self422, 실패 전체 snapshot 불변 | date validation은 독립 DTO unit 증거 별도; 모든 길이 경계의 실제 HTTP 전수 실행 없음 |
| WRITE004 | API+BFF missing428, malformed strong quoted header422, stale409/current version, 실패 불변 | UI 사용자 동작은 정적 검토만 |
| WRITE005 | 실제 API create/create, create/move, move/move 동시 요청 각 하나성공·하나WIP409, 최종count=limit; 실패 이동 source/version/activity 불변 | BFF를 통한 동시 경합은 별도 실행하지 않음 |
| WRITE006 | 다른 두 목적지 동일card/If-Match 경합 하나200·하나VERSION_CONFLICT409, version2/activity1 | 대량 반복 부하/상호 교환 이동 경합은 미실행 |
| WRITE007 | API+BFF full 같은컬럼 자기 제외 재배치, 바로앞/끝 no-op200/current ETag; 전체 snapshot 불변 | UI 중복전송 방지는 정적, 클릭 미실행 |
| WRITE008 | API gap[0,1]/Int32 max append/min prepend 이동 정확한 순서·범위·변경 기존카드version+1 | 생성 경로 overflow 자체는 별도 실실행 없음; 공통 allocate 정적 확인 |
| WRITE009 | API+BFF 미완료선행→done 이동 허용, blocked=true/done warning 및 CARD_MOVED metadata non-null | 완료선행의 모든 생성/이동 조합 전수 아님 |
| WRITE010 | API+BFF Alpha/alpha 기존 표기 재사용·link 중복제거·공백원문; 두 다른컬럼 동시에 같은 lower 새태그 생성201둘/tag1/link각1 | PG lower 비ASCII 모든 locale 조합은 미실행 |
| WRITE011 | 성공 CARD_CREATED/CARD_MOVED actor/metadata; activity INSERT 의도적 실패 시 실제500 및 card/column/tag/link/activity 전체 rollback | 재정렬 다른카드 새 event 개수를 요구하지 않음 |
| WRITE012 | BFF Origin missing/mismatch403 및 snapshot불변; If-Match/ETag/status 공개중계. client토큰 비노출 정적/mock | 실브라우저 클릭/시각/Figma/HTTPS cookie 미실행 |

## 실패 주입과 정리

부모가 승인한 임시 function/trigger 이름은 qa03_+UUID(하이픈 제외)다. trigger는 activities INSERT에서 **run owner actor AND run board AND exact run card title**에만 P0001 예외를 발생시킨다. 기존 정책 trigger/DDL 정의는 수정하지 않았다. 실제 create+tag 및 move 요청이 각각500을 반환했고, 요청 전후 전체 run snapshot 동일/새tag 잔존0을 확인했다. 유효한 다른 run-title 생성201은 영향받지 않았다. 다른 보드의 기존 활동 ID들을 전후 비교해 불변을 확인했으며 다른 실행이 새 활동을 추가하는 것은 잘못 실패로 세지 않는다.

finally에서 UUID 고유 이름의 정확한 trigger/function만 DROP했고 pg_trigger/pg_proc 각각 부재를 확인했다. 제거 후 **동일 create body201 및 동일 move200**을 확인해 DTO422를 rollback 증거로 잘못 세지 않았다. trigger의 세션과 실패 rollback 이후 정상 서비스 커밋 복구도 확인했다.

## QA harness 오류 이력

첫 실행은 API2 checks 후 QA가 공개 Card에 계약 외 creatorId를 요구해 실패했다. OpenAPI Card에 그 필드는 없으므로 응답 요구를 제거하고 DB creator_id 검사만 유지했다. 두 번째 실행은14 checks 후 QA 새 tag 이름39자가 계약 max30을 넘어422로 실패했다. rollback tag45자도 DTO 거절을 원자성 증거로 잘못 셀 위험이 있어 함께 고쳤다. 고유 run suffix20자 이하로 줄이고 atomic 실패는500/제거후 동일body201을 요구했다. 두 실패를 제품 결함이나 통과로 기록하지 않는다. 실패 fixture를 지우거나 이전 부분통과 수를 최종19에 합산하지 않았다.

## 독립 mock 및 정적 검토

- BE cards.spec.ts **15/15 PASS**: placement 경계/DTO 날짜/no-op/stale/self-before/Viewer. 서비스 transaction mock 및 DTO unit이며 실제 Nest HTTP+mock persistence suite가 아니다. Windows sandbox realpath EPERM을 로컬 읽기 의존성 escalation으로 해소했고 출력/cache는 QA ignored runtime에 한정했다.
- FE BFF8+browser-api4+board-read10 **22/22 PASS**: 기존 검증에 write target/Origin/If-Match/ETag/status/serverbearer 및 role pagination uppercase UUID 비교 포함. 실제 React DOM 테스트가 아니다.
- 부모 OpenAPI YAMLparse/224 internalrefs PASS 보고는 역할 보고이며 QA 독립 full meta-schema 실행으로 표시하지 않는다. BE build+64mock, FE build/typecheck+22mock은 역할 보고이고 위 독립 재실행과 별도다.

BE 정적: 모든 카드 route SessionGuard, 권한→열 UUID순 lock→카드 UUID순 lock, source 변경 재조회/3회 bounded retry, CAS 및 rollback, 목적지 count/자기제외/no-op 체크, 공통 allocate 및 기존 위치 변경 version 증가, SQL lower canonical순 tag upsert/표기 유지, activity 동일 transaction/public DTO 확인. 보드 전체 lock으로 대체하지 않았다.

FE 정적: POST 고정 UUID경로만 허용, BFF Origin 검사/서버 bearer/If-Match 중계. client 상대 BFF요청+cookie만 사용, token 없음. CardWritePanel pending ref가 같은 틱 중복제출을 막고 두 fieldset을 busy로 비활성화한다. 401로그인이동/403내용제거/409·428재조회/422입력오류/no-op 안내/성공 재조회. UI 담당자 지정은 아직 미지원이라고 표시한다. 현재 필터로 조회된 카드만 선행/이동 선택에 표시한다. 반영은 static/helper mock 증거이며 클릭 검증으로 표현하지 않는다.

## 미실행 및 종료

CUA 문서 복원 후 surface inventory 재확인: apps[]/browsers[]. 새 브라우저 표면 없음. 외부 설치/native 우회 없이 실제 클릭·DOM·시각·Figma 정확일치 및 HTTPS browser cookie 검사는 미실행이다.

기존33문서와 READ11의 공백은 자동 승격하지 않는다. 이번 생성/이동의 부분 증거만 위 매핑으로 기록하며 dependency 변경/순환 쓰기, role/컬럼 관리 HTTP, 검색/알림 등은 별도 범위다. 검증한 범위에 발견된 차단 제품 결함은 없다. 부모가 API/web 종료 및 PG fast stop, 네 포트closed/data보존을 확인했다. QA는 서버를 재기동하지 않았다.
