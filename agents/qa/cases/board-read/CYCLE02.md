# Cycle02 조회·권한 선행 인수 문장

기준 integration430bfd1, docs/contract/openapi.yaml v0.2.1, feature-spec.md 역할/보드/초대/의존정책, erd-api.md 페이지, v0.2.1.md 인증session. 이번범위 GET /v1/boards/{boardId}, /columns, /cards 및BFF읽기중계. 카드생성/이동/쓰기HTTP는포함하지않는다. 결과전부 **미실행**. 미확정항목은아래PENDING에명시하며제품구현을승인근거로삼지않는다.

기존QA13/AUTH-BFF9/HTTP11을보존한다. 직접격리DB fixture로카드/태그/멤버/선행을준비할수있으나실제카드생성·이동제품API인수로표기하지않는다. 부모가관리하는기존보존cluster에서runUUID 신규fixture만사용하며reset/기존데이터삭제금지.

## READ001 Owner/Editor/Viewer 조회 허용과 Board 응답

인수:각role은자신의membership가있는보드의세조회경로에동일하게접근한다.
요청:Uowner/Ueditor/Uviewer bearer로 GET /boards/B,GET /boards/B/columns,GET /boards/B/cards. BFF cookie별로동일요청.
기대:각200. GETboard는Board schema(id,title,color,version,createdAt,updatedAt 및optionalnullable description)와ETag="version". 상세Board에myRole필수를추가하지않는다. columns는{items:Column[]}이며카드데이터포함없음. cards는CardPage {items,nextCursor}. Viewer를write권한없다는이유로403거절하지않는다.
불변:board/member/column/card/version/updated_at/position 불변. 결과:미실행.

## READ002 비멤버 및 미수락 초대의 보드 경계

인수:보드B에membership없는사용자와PENDING초대만있는사용자는조회할수없다.
요청:각사용자로세경로조회. 다른보드A에서는OWNER이지만B에는비멤버인사용자도반복한다.
기대:GETboard403 NOT_MEMBER. columns/cards도승인역할정책에따라조회거절,boardtitle/description/column/card/assignee/tag/선행정보없음. columns/cards403response선언은계약보완대상(PENDINGmachine). 멤버가없는상태를empty200으로숨기고정상보드접근으로처리하지않는다.
불변:invitation PENDING 유지,membership자동생성없음,세션/보드행불변. 결과:미실행.

## READ003 다른 보드 자료를 목록에 섞지 않음

사전:A/B각각다른컬럼·카드·태그·선행fixture,사용자U는둘다멤버인경우와A만멤버인경우를나눈다.
요청:A의columns/cards를조회;A의cards에B columnId/assigneeId/tag이름을query로보낸다.
기대:어떤응답도B카드/컬럼/선행/태그를노출하지않는다. 두보드멤버여도A읽기는A자료만. foreignfilter의정확HTTP/code(빈200대422)는PENDING-FILTER이므로임의확정하지않는다. 정상응답item의boardId=A,card.columnId는A컬럼이어야한다.
불변:읽기filter로관계/권한/position/version 변경없음. 결과:미실행.

## READ004 보호 조회 session 확인

요청:validboardUUID에대해세경로에bearer누락/깨진signature/만료JWT/revokedsession/absoluteexpiredsession. 같은사용자S1을logout하거나refresh재사용폐기한후세경로반복,S2는조회한다. BFF도각cookie로반복.
기대:무효S1은401 UNAUTHENTICATED,현재S2와정상membership는200. GET이라고session폐기를우회하지않는다. BFF browser bearer는신뢰하지않으며서버cookie session만사용. 읽기쿠키없는Origin은CSRF쓰기규칙으로403만들지않는다.
불변:S2 폐기/만료와membership 불변,보호자료비노출. 결과:미실행. machine401response선언은보완대상.

## READ005 UUID 및 query 입력 검증

요청:인증멤버로boardId형식오류; cardquery columnId/assigneeId형식오류;limit0/101/비정수/중복배열;손상cursor. uuid형식은유효하지만없는id는별도READ011에둔다.
기대:기존schema/INVALID_INPUT 규칙에따라형식오류를일관되게거절하며500 Prisma/DB형변환오류및내부SQL노출없음. 정확422 선언은PENDINGmachine보완후확정. limit기본20,범위1~100. 알수없는query거절/무시정책은발명하지않는다.
불변:membership/card/column 불변,에러에다른보드자료없음. 결과:미실행.

## READ006 컬럼 정렬과 스키마

사전:B컬럼은position이1024,0,2048이며추가fixture동률position도준비한다. 카드fixture가각컬럼에존재한다.
요청:GET /boards/B/columns 두번.
기대:Column필수id,boardId,title,position,isDone,version 및optionalnullable wipLimit. 카드배열포함없음;컬럼전체조회에는cardcursor를추가하지않는다. position정렬을따르며정렬방향/동률idtie는PENDING-ORDER확정후비교. 컬럼createdAt등내부필드필수로추가하지않는다.
불변:position/is_done/wip_limit/version 및카드행불변. 결과:미실행.

## READ007 카드 목록 스키마와 계산형 blocked

사전:C0선행없음,C1선행이non-done컬럼,C2선행이done컬럼,C3자신은done이나선행non-done. nullable assigneeId/dueAt/predecessorId/description과tagNames있는fixture도준비.
요청:GET /boards/B/cards. fixture선행column.is_done 변경전후GET반복(직접DB검증fixture변경;제품쓰기API아님).
기대:Card필수id/boardId/columnId/title/position/blocked/warnings/version/createdAt/updatedAt. C0false/C1true/C2false/C3true. blocked는자기컬럼done이나dueAt으로추측하지않고직접선행의column.isDone만따른다. Card.completed 생성금지;blocked/warnings 저장컬럼없음. userpassword/hash/sessionciphertext 및관련보드내부정보비노출. tagNames는배열로계약필드명보존.
불변:GET으로card.version/updated_at/column_id/predecessor_id 변경없음. 결과:미실행.

## READ008 warnings 읽기 규격

요청:READ007fixture cards조회.
기대:warnings는항상array이며enum BLOCKED_BY_PREDECESSOR 외값없음. blocked와warnings의정확관계(모든blocked에경고대done차단카드만경고)는현재읽기명세에없어PENDING-WARNING. 쓰기move example을조회규칙으로확대하지않는다.
불변:경고계산으로카드쓰기/position/version변경없음. 결과:미실행.

## READ009 카드 position 페이지 및 cursor 경계

사전:여러컬럼에같은position을포함한25개이상카드,같은필터조건으로고정데이터를조회.
요청:GET /boards/B/cards 기본limit및limit1/100,nextCursor연속조회. cursor를다른board 또는다른filter에재사용;페이지anchor삭제후계속조회도독립fixture로준비.
기대:응답CardPage {items,nextCursor},최대limit개,nextCursor=null은끝. fixeddata전체페이지에서중복/누락없음. position정렬방향·동률·경계payload·삭제anchor·board/filterbinding은PENDING-CURSOR확정후비교한다. 내보드cursor(joined_at/board_id)승인을cardcursor에자동확대하지않는다.
불변:GET으로순서/멤버십/카드행변경없음. 결과:미실행.

## READ010 columnId/assigneeId/tag 필터

사전:B컬럼2개,담당자2명/미할당,태그Alpha와다른태그fixture. 다른B카드가같은tag문자열도보유.
요청:각filter단독,조합,존재안하는tag,tag대소문자변형,foreigncolumn/assigneeUUID,반복querykey.
기대:단독filter는승인된해당조건을만족하는B카드만반환;비멤버자료없음. 모든조합AND/OR,tag exact/case,foreign·unknownid코드,tagempty/반복query는PENDING-FILTER이므로결정전최종PASS기대보류. 검색API태그검색동작/DBlowerunique를filter태그정책으로추측하지않는다.
불변:filter는관계/태그/멤버행불변. 결과:미실행.

## READ011 없는/삭제된 board 접근

요청:UUID형식이유효한없는board 및승인run-owned삭제fixtureboard로세경로조회.
기대:board/columns/cards 비노출. missingboard403 NOT_MEMBER대404 NOT_FOUND와권한검사순서는PENDING-MISSING. feature-spec3.2의삭제카드URL권한없음문장은GETboard의없는id전체로확대하지않는다.
불변:조회때보드/회원가입생성없음. 결과:미실행.

## 제품 구현 전 계약 공백 감사

- PENDING-ORDER: columns/cards position ASC/DESC 및동률안정키. 카드position은컬럼별로겹칠수있어전역페이지순서확정필요.
- PENDING-CURSOR: cardposition정렬경계,삭제anchor처리,다른board/filter재사용검증,페이지간변경snapshot여부.
- PENDING-FILTER: tag문자열case/정확일치,filter조합AND/OR,foreign/unknowncolumn·assignee조회코드,반복querykey.
- PENDING-MISSING: 유효uuid없는board403대404 및정보노출정책.
- PENDING-WARNING: readwarnings와blocked의정확관계.
- PENDINGmachine: getBoard만403 선언됨;columns/cards403및세조회401/UUID·query422/missing응답보완필요. schemaUUID format은존재한다.

정책은부모가계약에기록한후이문서PENDING을갱신한다. 선행규격전달은확정부분을먼저계약기반으로구현하라는승인이며미정정책을역할이임의선택할근거가아니다. 실제DB/HTTP/브라우저및mock은별도기록할것이다.
