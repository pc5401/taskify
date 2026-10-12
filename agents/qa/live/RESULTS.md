# VS1 실제 PostgreSQL/API/BFF 독립 검증

2026-10-12. 기준 integration032ea67 (BEfb0e6b3, FE1d7f12e), 부모 승인 격리환경. PostgreSQL18.4,127.0.0.1:55432/taskify_validation, 기존2migration 적용은 BE역할 수행. QA API127.0.0.1:3301/v1, 운영 Next worker3002/3003를 실제네트워크로 사용했다. DB credentials/key/token/password/cookie는 문서와 로그에 기록하지 않는다.

실행: QA `live-vs1.cjs --restart-check`, 기존 FEpg/01c8jsonwebtoken 모듈 읽기 재사용. 준비env gate/DB명/loopback 확인. 첫 sandbox EACCES는 DB연결 단계에서 발생했고 승인된 로컬 재시도로 진행했다. reset/TRUNCATE/기존사용자 데이터삭제 없음. run고유 fixture만 생성/변경했고 승인된 새anchorboard만삭제,나머지 fixture보존. 실패주입trigger/function은 finally에서 해당run것만제거했다.

## 실제 PASS 증거

1. 실DB AuthSession/RefreshCredential/WebSession 컬럼 확인.
2. 실제HTTP register DTO422,완전동일email409 EMAIL_TAKEN,대소문자다른login401 INVALID_CREDENTIALS,공백email422,정상login200. 공개user필드 및 password hash 원문비노출.
3. 최초access900초/refresh7일 저장시각 확인,회전200 user포함,기존credential consumed/hash이력 및 만료non-extension. 소비refresh재사용401 뒤 DBrevoked_at 지속 및 현재access401,다른login GETme200.
4. 실제board생성201/ETag,보라색default,OWNERmembership 및 컬럼 할 일/하는 중/완료0/1024/2048,세번째만is_done. 호출자목록OWNER,다른사용자목록비멤버제외.
5. 고유fixture참여시각으로 실제keyset순서 확인. anchormembership삭제/복원후cursor계속 및 실제anchorboard삭제후에도nextpage200/정확다음항목. 새참여는첫page새로고침에서확인,이전cursor경계는유지. 손상cursor422.
6. 해당run제목의ownerINSERT만실패시키는임시trigger로createHTTP실패유발. transaction실패후새board잔존0건 확인.
7. actualSQL owner없는보드 및 마지막OWNER강등의deferredtrigger23514,잘못된WIP23514,교차board-columnFK23503,selfpredecessorCHECK23514. 각실패probe는ROLLBACK. 업무HTTP도메인오류번역검증과구분.
8. BFF Origin누락/불일치403 FORBIDDEN,login200 useronly. 256bitopaque쿠키 HttpOnly/SameSiteLax/Path=/MaxAge/Expires/운영Secure. PGsessionHash 및AESGCM원문복구/틀린AAD실패 확인. GETme200.
9. 해당run WebSession의access만만료된서명JWT로바꿔3002/3003worker동시4요청. 모든GETme200,PGrefreshcredential증가정확1개,WebSessionexpires_at불변/미폐기. 실제행잠금직렬화결과이며mock결과가아니다.

## 재시작 및 최종 단계

동일cookie는QA프로세스메모리에만유지. 검사9후checkpoint에서부모가BE/Next두worker를자신의handle로재시작했고DB는계속유지했다. 부모ready알림후stdin newline으로재개하여다음3개PASS,총12checksPASS/exit0. run ID76b9f054c6774a5eb53cd279bfd92e69.

10. 재시작후동일cookie GETme200. 동일환경키와PG저장상태로프로세스복구를확인했다.
11. BFFlogout204 및cookieMaxAge0. PGweb_sessions.revoked_at/upstreamauth_sessions.revoked_at둘다지속. 동일upstreamaccess GETme401,다른login GETme200.
12. 별도runlogin auth_session.expires_at를과거로조정하여access/refresh401 및credential1개유지(회전없음) 확인. 최초7일non-extension은검사3의저장시각으로확인했고벽시계7일대기는하지않았다.

## 기존 규격에 대한 부분 증거 매핑

| 규격 | 실제 확보한 증거 | 개별 규격 전체 통과 여부 |
|---|---|---|
| AUTH-BFF001 | 쿠키영속속성/useronly/opaque,동일cookie재시작복구 | browser종료/저장소/로그관찰없어부분 |
| AUTH-BFF002 | 운영Secure/Lax/Path,Originmissing/mismatch403 | 실제HTTP범위검증,HTTPSbrowser동작미실행 |
| AUTH-BFF003 | 실제PGhash조회/암호문/GCM복구와AAD실패 | 키누락/암호문변조실HTTP는미실행 |
| AUTH-BFF004~007 | 실제BE해시이력/최초수명/회전/reuse폐기/currentlogout와다른login유지 | 모든보호경로/동시BErefresh전체미실행 |
| AUTH-BFF008 | 2BFFworkers4동시요청/rotation1/PGstate유지 | 해당동시실행PASS,모든경쟁패턴보장으로확대하지않음 |
| AUTH-BFF009 | BE/BFF동시재시작동일cookie복구 | browser종료/7일자연경과미실행 |
| HTTP001~006,011 | 실제authDTO일부경계,publicresponse,exactemail,reuse/logout/me | 모든DTOedge와모든보호경로는미실행 |
| HTTP007~009 | PGmembership/order/keyset/deleteanchor/newparticipation,기본값/ETag | 동률정렬/모든role/모든DTOedge는미실행 |
| HTTP010 | 실제ownerINSERT실패주입후board잔존0 | board/column단계개별실패주입은미실행 |
| QA001~013 | 직접schemaFK/trigger관련증거는별도표시 | 업무HTTP미구현이므로미실행 |

## 별도 발견된 BE transaction 경계 결함

BE역할의추가실DB회귀에서ownerconstraint가실제COMMIT시23514를발생시키지만Prismainteractive transaction의오류전파/409 LAST_OWNER처리가충분하지않은결함이보고됐다. QA검사7의rawSQLconstraintPASS는이서비스경계의통과가아니다. 부모가통지한TransactionsService.run의constraint검사시점/좁은metadata매핑복구는최종수정SHA를별도독립검토해야하며본032ea67결과로해결판정하지않는다.

## 미실행 / 판정 범위

이결과는구체실행한12검사의통과이며33개기존규격전체를자동승격하지않는다. 기존QA001~013 업무HTTP는미구현미실행. 정렬동률/모든DTO경계/5개복합FK전체/도메인오류번역/자연7일벽시계경과/로그전체노출관찰은이harness에서완전검증하지않았다. 브라우저DOM클릭/localStorage실관찰/브라우저종료복구/쿠키HTTPS실전송/Figma정확일치도미실행. 운영Secure는응답헤더로확인했고Nodefetch가명시쿠키를전달한HTTP검증이지실브라우저HTTPS검증이아니다.

33개문서의결과는후속매핑에서개별검증범위와미검증범위를구분한다. schemaCHECK/FK실패가QA업무422/409통과의근거는아니다. 제품정책변경/제품코드편집/설치/main병합/push 없음.
