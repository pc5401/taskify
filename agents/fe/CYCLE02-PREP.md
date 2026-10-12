# Cycle02 FE 준비

기준430bfd1. 범위는 GET보드상세/컬럼/카드, /boards/[boardId]읽기칸반,
내보드목록의실제Link. 카드생성/이동과역할변경 UI는이번배치제외.
QA선행케이스 및 상세정렬/cursor/필터정책확정전 제품코드대기.

Figma mandatory figma-design-to-code SKILL을읽고 기존상세frame6:69의
get_design_context를스크린샷포함1회요청했으나 Starter호출한도로실패.
반복하지않았다. 과거rootmetadata에는 sidebar/topbar/3columns 구조가있지만
high-fidelity/screenshot/assets없음. 이번새상세화면에대한임시UI예외승인은
부모가확인한다. 정확디자인재현또는visualPASS를주장하지않는다.

기존 Next설치docs page/route를읽었다. dynamicparams는Promise로await한다.
기존shared입력/버튼/색상과BFF암호화/쿠키/refresh경로를재사용한다.

BFF는엄격UUIDboardId와허용된GETsuffix(detail/columns/cards)만upstreamtarget으로
조합한다. 사용자URL/임의path/Bearer는사용하지않는다. 카드query는계약의
cursor/limit/columnId/assigneeId/tag만URLSearchParams로전달하고정책확정후
파라미터검증/422동작을따른다. detail/columns에불필요query를전달하지않는다.
upstreamstatus/error/ETag및기존tokenredaction/no-store를유지한다.

browserclient는board/columns/cardPage와allCards를제공할예정이다. 서버cursor를
불투명하게사용하고page를순차로모두조회하여id중복을막는다. 반복cursor는
명시적으로거절하여무한조회/불완전성공을막고필터/AbortSignal을모든page에
유지한다. 서버순서를보존하며FE가role또는권한계산하지않는다.

UI는권한허용여부를서버응답으로알며401login/403NOT_MEMBER내용미노출/422오류/
loading/빈columns/빈cards를구분한다. 보드상세Board에myRole을추가하지않고
Card.blocked/warnings/columnId를서버값으로사용한다. 생성/이동버튼노출없음.
필드외예시담당자이름/avatar/카드수/멤버수는발명하지않는다. 상세준비중문구를
실제내보드Link로교체한다. 실제DB/runtime는부모인계후새fixture로만검증한다.

예정검증: targetinjection거절,쿼리인코딩/화이트리스트,401/403/ETag보존,
page>1전체조회/id중복/반복cursor/취소,서버calculatedfields유지,TypeScript/Nextbuild.
브라우저가능여부는실행때확인하고visual/click을HTTP로대신통과하지않는다.

## QA 선행 반영 및 대기

QA5e3e6bdd40856741ea4670cee13b411b1dc6d476를fast-forward하고
agents/qa/cases/board-read/CYCLE02.md READ001~011과PENDING을읽었다.
확정부분은3role동일조회/session/membership/BoardETag/schema/blocked직접선행이다.
PENDING은position방향/tie/cardcursorbinding/deletedanchor/filterAND/tagcase/
foreignfilter/repeatedquery/missingboard/warnings관계/machineresponse보완이다.
부모가조회정책및새임시UI승인질문을제출했으므로승인전제품코드는대기한다.
이번main병합/push없음; 카드생성/이동은후속이며이번UI버튼도노출하지않는다.
