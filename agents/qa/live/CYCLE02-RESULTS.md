# Cycle02 조회·권한 독립 검증

승인계약1cc619f, BE **c08f3e303d996b8a85a92958bb1ecee99e520195**, FE **53c1b52fd10eab7c0f049e8f6c1d8180402cf7c4**의검증뒤변경없는실행소스를부모가확인했다. 아래실제검증은카드생성/이동API를호출하지않고SQL로준비한새fixture를사용했다. FE URLlimit 정합성후속수정은마지막절에별도기록한다.

## QA 독립 실제 실행

`cycle02-read.cjs`: **19checks PASS, exit0**. run1892c640-7658-4b64-8369-47254987c7cd. 부모관리보존PostgreSQL18.4/127.0.0.1:55432/taskify_validation,API3301/v1,BFF3002. activepointer에서runtimeenv를읽고DB명/loopbackgate를확인했다. 기존FEpg/01c8jsonwebtoken읽기재사용,network escalation은사용자승인범위로진행했다.

SQLfixture는새사용자5명(owner/editor/viewer/outsider/pending),보드2개,동률컬럼,카드32개,선행active/done,태그Alpha와membership/invitation/session/ciphertext다. fixtureJWT+sid도SQL로seed하므로기존register/login발급기능검증으로표시하지않는다. 실제Nestguard는서명/만료/DBsession을검증한다. anchor카드1개는승인된새fixture삭제검사로제거하고나머지결과데이터는보존했다. 기존사용자데이터삭제/reset/TRUNCATE 없음. 직접선행카드fixturecolumn변경은검증후복원했고제품moveAPI인수가아니다.

| READ 규격 | 독립 실제 증거 | 남는 범위 |
|---|---|---|
| 001 | API/BFF Owner/Editor/Viewer 각각3경로200,Board ETag/컬럼schema/카드page | 실UI/브라우저역할전환미실행 |
| 002 | 외부/PENDING초대각3경로403 NOT_MEMBER,보드내용없음 | 초대제품수락기능미구현 |
| 003 | 두보드멤버owner도A자료만반환,foreigncolumn/assignee필터빈목록 | FK무결성파괴fixture를만들어회피하지않음 |
| 004 | revoked/absolute-expiredsession API+BFF모든읽기401,다른session200;API깨진/만료JWT/missing401 | BFFbrowserforgedbearer는static/mock확인 |
| 005 | UUID/query/limit/cursor/scalar반복422 INVALID_INPUT,내부SQL없는응답 | 모든유효UUID문자형변형/모든query조합을망라하지않음 |
| 006 | 동률position/id ASC컬럼정렬,카드배열없는Column응답 | 빈컬럼목록UI시각은미실행 |
| 007~008 | no-pred/activepred/donepred/currentdone각blocked/warnings정확. 선행fixture컬럼변경후재계산,저장computed필드없음 | 카드상세HTTP/쓰기move별도범위 |
| 009 | API+BFF32카드전역position/id ASC,limit3끝까지중복누락없음. board/tag/columnfilter다른cursor422. 실SQLanchor삭제후API경계계속 | 삭제직후BFF동일cursor는별도반복하지않음;정적중계및기존API증거와구분 |
| 010 | AND조합,정확Alpha만매칭,alpha/양끝공백/빈tag/foreign및unknownUUID200빈목록 | 빈tag신규minLength없음. 모든복합조합을전수실행하지않음 |
| 011 | 없는UUID세경로API/BFF403 NOT_MEMBER | 기존사용자보드를삭제하여검사하지않음 |

19checks는API7+BFF7+anchor삭제/계산재확인/session폐기/JWT절대만료/조회행불변5다. 최종board/columns/cards모든조회필드를초기snapshot과비교(승인anchor삭제제외)하여GET이version/updated_at/position/관계를변경하지않음을확인했다. 응답에password/session/token/ciphertext필드없음을검사했다.

## 독립 mock / 정적 검토

- BE `board-reads.http.spec.ts` **3/3 PASS**. 실제Nestcontrollers/SessionGuard/query parsing,Prisma와AuthSessionService는mock. TypeScriptdiagnostics켜진기존QA runner사용. 실제session검증증거는위live19와구분한다.
- FE BFF8+browser-api4+board-read6 **18/18 PASS**. readtarget고정경로/UUID/pathinjection/GETonly,scalarfilter전달/키제한,403/ETag/serverbearer,전페이지순서/중복/반복cursor/abort를확인했다.
- 기존js-yaml로YAML parse/3read401403422refs/전체220internalrefs PASS. fullOpenAPImeta-schema validator실행은아니다.

BE정적검토:세read는SessionGuard공통연결,boardmembership조회후403,UUID/query검증/boardId기반predicate/position-idkeyset및exactfilters검사. computed는직접선행column과현재column만조회계산하며공개DTOprojection을사용한다. GETboardETag와GETcolumns카드없음확인.

FE정적검토:고정UUIDreadroutes에서upstream경로/필터키만허용,serverBearer/BFFcookie만사용. clientallCards가nextCursor=null까지읽고반복cursor및abort를실패로처리한다. BoardScreen은board조회먼저성공후columns/cards를모두완료해야title/자료를표시하며requestKey로다른URL의stale자료를숨긴다. 401로그인이동/403내용숨김/422조건오류/빈컬럼·카드/blocked와donewarning을처리한다. 신규create/movecontrols없음.

BE build9suites49mock 및BE자체live8,FEtypecheck/build/역할mock18/SSR쉘200은역할보고이며QA독립재실행과구분한다. source가역할최종SHA까지검증뒤변경없다는부모확인으로live19기준을고정했다.

## 실브라우저 / 시각 공백

computer-use스킬을읽고CUA surface inventory를준비전과서버ready후다시확인했으나둘다apps[]/browsers[]. 알려진ambientlogin URLtab은explicitbrowser없이어느표면에도연결할수없었고,in-app browser생성시도도 **Browser is not available: iab**로실패했다. 외부브라우저설치/native우회없음.

따라서실브라우저login→보드클릭→필터조작→권한변경→logout,DOM/시각/Figma정확일치와HTTPS쿠키전송은 **미실행**. 실제Nodefetch HTTP/BFF검증과SSR200을실browser통과로표시하지않는다. browser용fixturecredentials는QA ignored .runtime에만생성했고문서/로그/Git에기록하지않았다.

## FE limit URL 정합성 후속

FE53c1b52 정적검토에서BoardScreen이URLlimit을Number로즉시변환하여limit=1e1을10으로전달하는정합성결함을발견했다. BE원문querydigits검증은1e1을422로거절하지만UI는잘못된조건을정상요청으로바꿀수있다. 부모및FE에즉시보고했으며최종 FE **7509f57d9df0e060237d2f72a591c5baae4cdd28**에서 해결했다. UI parseBoardFilters와 BFF read-target이 원문 digits/정수/1~100을 변환 전에 검사하고 반복 scalar를 거절한다. BoardScreen은 null 검증결과를 422 오류로 처리한다. QA 독립 BFF8+browser-api4+board-read7 **19/19 PASS**로 1e1 등 비숫자 원문 거절과 정상 1/100/010 및 반복입력을 확인했다. 최종 HEAD와 clean 작업트리도 확인했다. 이결함은API/BFFlive19PASS와별개의client입력경계다.

기존33문서의미실행공백및업무13개상태를이번조회검사로자동승격하지않는다. 특히Viewer카드수정/순환쓰기/WIP이동/Ownerrole HTTP/완료컬럼쓰기/검색/알림등은이번범위밖이다. 부모가서버start/stop을조율하고QA는DB종료/reset하지않는다.

최종 수정은 원문 limit 검증만 변경했으며 정적 검토와 독립 mock으로 회귀를 확인했다. 실제 live19의 FE 기준은 53c1b52이며 7509f57에 대한 새로운 실제 HTTP/브라우저 실행은 하지 않았다. 부모가 종료한 DB/API/FE를 재기동하지 않았다. 서버 범위에서 확인한 조회·권한 정책과 이 좁은 수정에는 발견된 차단 결함이 없다. 실브라우저 및 미구현 쓰기 기능까지 완료 판정을 확장하지 않는다.
