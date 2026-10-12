# 승인 VS1 실제 PostgreSQL/API/BFF 검증 계획

기준 integration032ea67, 현재 QA33개. 사용자 승인 live 검증 배치이며 부모가 준비한 **격리 개발 DB와 로컬 endpoint만** 사용한다. DB 설치/시작/연결은 부모 준비 정보 수신 전 수행하지 않는다. QA는 reset/TRUNCATE/기존 데이터 삭제를 하지 않는다. 새 UUID/run 접두 fixture만 생성하며 직접SQL 변경은 fixture session/board에 한정한다. 임시 실패주입 trigger는 run 고유 이름/제목 prefix에 한정하고 finally에서 자신이 만든 trigger/function만 제거한다. 기존 migration/제품 정책 변경 없음.

## 범위 / 판정 매핑

| 기존 규격 | 이번 실제 검증 | 끝나도 남는 범위 |
|---|---|---|
| HTTP001~006,011 | register/login DTO422,exact email,public fields,refresh.user/rotation/reuse persisted revoke,currentlogout/S2 유지,me identity | 모든 경계 fixture를 다 실행한 것으로 확대하지 않음 |
| HTTP007~010 | 실제 membership filter/myRole,keyset 정렬,삭제된 run anchor 이후계속,defaultcolor/3columns/ETag,실DB failtrigger rollback | concurrent 목록 snapshot 요구 없음 |
| AUTH-BFF001~007 | opaque persistent HttpOnly/SameSite/Path cookie,Origin missing/mismatch403,PG hash/ciphertext,GCM row AAD,key presence,현재logout | DOM storage/log 전체 관찰 및 운영 HTTPS Secure 브라우저는 별도 |
| AUTH-BFF008 | 같은 cookie 병렬 요청의 refresh1회/새 원문 재사용 없음,실PG 행잠금 | request scheduling 관찰 결과와 설계 보장을 구분 |
| AUTH-BFF009 | parent restart 전후 동일 cookie 유지/PG 데이터 지속 | 실제 browser 종료 복구/absolute7일 대기 없음 |
| QA001~013 | VS1 업무 HTTP 미구현이므로 **미실행 유지** | 직접FK/trigger probes를 해당 업무API 통과로 올리지 않음 |

절대7일 경계는 run-owned auth_session/WebSession expires_at를 과거로 조정하여 gate 거절을 검증한다. 최초 발급7일 및 회전 non-extension은 저장 시각 비교로 확인한다. 벽시계7일 실제 경과, access15분 자연 만료와 구분한다. 동시 BFF refresh는 테스트 secret으로 만료 JWT를 만들어 해당 run-owned 암호문만 갱신하여 유발한다. JWT를 브라우저에 전달하지 않는다.

## 준비 및 실행 gate

`live-vs1.cjs`는 `--check`에서 파일 syntax와 설정 gate만 확인하고 DB/HTTP를 호출하지 않는다. 실제 실행은 다음 환경변수를 부모가 준비한 뒤만 허용한다:

- TASKIFY_QA_LIVE_READY=approved-isolated-vs1
- TASKIFY_QA_LIVE_DATABASE_URL / TASKIFY_QA_EXPECT_DATABASE (연결된 current_database와 일치)
- TASKIFY_QA_API=http://127.0.0.1:<apiPort>/v1, TASKIFY_QA_BFF=http://127.0.0.1:<webPort>
- TASKIFY_QA_PG_MODULE=기존 pg 패키지의 절대경로
- TASKIFY_QA_JWT_MODULE=기존 jsonwebtoken 패키지 절대경로
- TASKIFY_QA_SESSION_KEY=실행 BFF AES key(base64), TASKIFY_QA_JWT_SECRET=실행 BE key (출력하지 않음)

서버 시작/종료/재시작은 부모/역할에서 수행한다. `--restart-check`를 붙이면 BFF cookie는 메모리에만 보관하고 핵심검사후 stdin newline을 기다린다. 부모가 BE/BFF를 재시작한 뒤 newline을 보내면 동일cookie GETme 복구를 검증한다. Harness는 token/password/cookie/URL credentials/key를 로그 또는 결과 artifact에 기록하지 않는다.

## PostgreSQL 제약 probes

시스템 catalog에서 승인 테이블/컬럼을 확인한다. run-owned 새board WITHOUT owner는 deferred constraint를 immediate로 강제하여23514를 기대하고 rollback한다. 기존fixture 마지막owner 강등도 rollback, WIPcheck23514, cross-board card/column FK23503, self predecessor23514를 실제 SQL로 확인한다. 이는 DB 제약 검증이며 도메인HTTP422/409 번역 통과가 아니다. 기존 fixture 객체 삭제는 run-owned pagination anchor만 수행하며 사용자 데이터/DB 자체는 보존한다.

## 결과 기록

실행 report에는 기준SHA,DB이름(credential 제외),server endpoints(credential 제외),검사PASS/FAIL 및 미실행 매핑을 적는다. 실제 PG/Nest/BFF 네트워크와 previousmock을 구분한다. Harness failures는 즉시 부모/역할에 전달하며 보고 전 제품 코드/계약을 바꾸지 않는다. 시각browser/Figma검증은 이번 HTTP/DB 결과와 별개다.
