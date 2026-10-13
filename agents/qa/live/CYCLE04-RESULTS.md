# Cycle04 멤버·담당자 독립 QA 결과

승인계약83ab6c/통합27d5c50. BE 제품7efe1687192e57fdf5b1ff66729b2307cd172302 clean 확인. FE 제품 ceaa97b6325efa8d59a19ddd04e612c0fa203811 / 최종 인계 e1622a427bdd3ee337456b14fc2fb1bb4224cd62. 인계 diff는 역할문서/README만이며 제품 source/config 변화 없다. 최종 독립 mock 시 e1622a4 확인, dev가 생성한 next-env.d.ts 차이는 FE가 dev 종료 후 정리했고 QA 최종 clean을 다시 확인했다. 실제11은 FE 구현 중 서버에서 먼저 실행했고, 최종 코드 정적/mock 및 부모 재기동 browser 증거를 별도 기록한다. QA는 브라우저를 조작하지 않는다.

## 브라우저 전용 fixture

run a23f379f-e19b-45c3-97c4-385444810485 / board b5f71a74-ad23-4aad-a930-cd353d7f35c8. 새 사용자 owner/editor/viewer 및 외부/PENDING 경계 사용자, main3컬럼/카드7개/미완료 선행/태그Alpha/3담당자 샘플과 미지정. SQL seed는 제품 HTTP 생성 검증이 아니다. 고정 fixture dummy example.test 로그인 값은 QA ignored .runtime/cycle04-browser.json에만 저장하고 부모에게 경로만 전달했다. 최초 PowerShell health 연결거부로 DB 접속 전 중단했고 부모 ready 확인 후 Nodefetch me401을 직접 확인하여 seed했다.

## QA 독립 실제 DB/API/BFF

cycle04-members.cjs **11 checks PASS / exit0**. run794ab8f0-0dce-4269-8c72-083e982e6275 / board eeee3ff0-40ad-4c34-9e1d-e7609236fbfb. 브라우저 fixture와 다른 UUID run으로 실행하여 기존 브라우저 카드 및 private JSON을 변경하지 않았다. 보존PG127.0.0.1:55432/taskify_validation/API3301/v1/BFF3002, ready/loopback/DB명 게이트 및 기존01c8 pg/jsonwebtoken 읽기 재사용, 설치 없음. active-db pointer→runtime-env 파일 비출력 사용. 실제 JWT/DBsession guard를 실행하되 SQL seed된 토큰은 제품 login 발급 검사와 구분한다.

| 선행 인수 | 독립 실제 증거 | 제한 |
|---|---|---|
| MEMBER001 | API+BFF Owner/Editor/Viewer200; userId/nickname/role/joinedAt 공개 keys만; DB joinedAt ASC/userId ASC 일치; GET snapshot 불변 | seed 사용자 nickname 존재. optional nickname absent 전수검사 아님 |
| MEMBER002 | outsider/PENDING/타보드멤버/없는 보드403 NOT_MEMBER, snapshot 불변 | 초대 수락/role 관리 쓰기 HTTP는 이번 범위 아님 |
| MEMBER003 | malformed UUID422, 무인증401 및 editor폐기/viewer절대만료 후 API+BFF401 | 깨진 JWT 문자열의 실제 HTTP 별도 요청은 이번 harness 미실행(이전 cycle 증거와 합산하지 않음) |
| ASSIGNEE001 | API+BFF Owner/Editor가 owner/editor/viewer 각 userId 및 null 생성201; 응답/DB담당자와 creator_id/auth 일치, ETag 및 activity1 확인 | 모든 생성 선택필드 조합은 아님 |
| ASSIGNEE002 | Viewer403 FORBIDDEN, 유효 outsider422 CROSS_BOARD, missing/invalid user422 INVALID_INPUT; card/tag/link/activity 등 snapshot 불변 | race 중 멤버 탈퇴와 생성의 경합 미실행 |
| ASSIGNEE003 | viewer조회 assignee+column+exactAlpha AND 한 카드만; foreignassignee200빈목록; GET snapshot 불변 | 브라우저 필터 선택 동작은 부모 검증으로 분리 |
| UI001~002 | 최종 FE static/mock23 및 부모 실제 담당자선택/필터/닉네임/Viewer/buttons/로그아웃 확인 | QA 독립 UI 클릭은 수행하지 않음; 아래 역할 browser 범위 참조 |

11은 API5+BFF5+revoked/absoluteexpiry1이며 다른 cycle/역할 checks와 합산하지 않는다. 브라우저용7카드와 별도 HTTPrun의 생성 결과를 모두 보존했다. 기존 사용자 데이터 reset/TRUNCATE/삭제 없다. SQL probe세션 폐기/만료는 HTTPrun의 새 sid만 사용했고 부모 UI 로그인 계정 세션에 영향주지 않았다.

## 최종 정적/mock 및 부모 browser 증거

BE 멤버 조회는 SessionGuard→UUID→실제membership 확인 후 boardId predicate와 nickname만 포함한 user select를 사용한다. 회원 email/password/session을 select/응답하지 않는다. joinedAt/userId 기술 정렬 및 공개 projection 확인. 독립 실제 Nest controllers/SessionGuard/query parsing + mock Prisma/AuthSessionService HTTP suite **4/4 PASS**. JWT/session은 mock이므로 실제11과 합산하지 않는다.

FE 최종 정적: 멤버 GET 고정 BFF 경로, client relative cookie요청, BoardScreen 전체 members까지 성공해야 data를 저장. 담당자 dropdown은 members userId만 제출/미지정null, 필터assigneeId+AND, 카드 nickname을 JSX로 표시하고 optional fallback. pendingref 중복제출/role/403/401 처리 기존 흐름 유지. 최종 product source/config와 이 동작을 재확인했다. 독립 BFF8/browser-api4/board-read11 **23/23 PASS** (멤버고정GET경로/projection/errors 포함), 실제 React DOM 테스트가 아니다. devIndicators:false가 개발배지와 로그아웃 버튼의 겹침을 제거하도록 설정된 것도 확인했다. client nickname은 JSX텍스트이고 email/password/session/token을 멤버목록에 사용하지 않는다.

부모만 CUA browser click/visual/Figma를 실행한다. QA는 세션 충돌 방지를 위해 inventory/브라우저 조작도 하지 않았다. 부모 결과는 아래 역할 증거로 기록하며 QA 독립 클릭으로 주장하지 않는다. 기존33/READ11/WRITE12의 미실행 공백을 자동 승격하지 않는다.

## 부모 실제 browser/시각 역할 증거

근거: integration/agents/shared/design-cycle04/BROWSER-RESULTS.md와 같은 폴더 jpg들. 부모가 in-app browser를 직접 조작했다. Owner 로그인→내보드→상세, 생성담당자 QA editor 선택/새카드 닉네임, 담당자필터 editor카드3개, tied 이동, 같은위치 no-op안내, Viewer 재로그인/조회필터 및 생성·추가 버튼0개가 PASS다. 이는 HTTP fixture와 분리한 브라우저용run에서 진행했고 클릭에 따른 새카드/이동은 부모 검사 결과다.

데스크톱1440×900/모바일390×844(pageWidth375<=390), 폼/창내부scroll/닫기 확인 PASS. 최초 logout 클릭은 Next 개발 배지가 가려 결함을 발견했다. FE devIndicators:false 수정/최종빌드/재기동 후 실제 mouseclick→로그인 도착 PASS로 복구 확인했다. QA 자체 React DOM 검사나 독립 재클릭을 추가하지 않았다.

Figma node6:69 원본 및 캔버스 근거의 sidebar230/topbar72/column316/gap14/color 보정 범위다. 추가 MCP는 Starter 호출한도로 제한됐다. 모든 pixel 일치/전체 제품 디자인 완료가 아니다. 로그인/내보드/생성창 상세 원본 미확보, 정밀 일치 미주장. 기본색상정책 #5534DA 유지. 이미지: figma-board-reference.jpg, assignee-dialog.jpg, board-assignee-desktop.jpg, board-mobile.jpg, dialog-mobile.jpg, board-viewer.jpg, logout-click.jpg. QA는 부모 보고서를 읽었으며 독립 시각 판정 수치로 합산하지 않는다.

## 최종 판정과 종료

이번 HTTP 검증 범위에 발견된 차단 결함 없다. 실제11/Nestmock4/FEmock23/부모browser 증거는 서로 합산하지 않는다. BE build65 및 FE build/typecheck는 역할보고다. UI의 모든422/409/428·networkfailure·같은틱 중복클릭과HTTPS browser cookie 전송의 실제 전수검사는 이번 미실행이며 static/mock 또는 이전cycle 부분증거와 구분한다. 기존업무33/READ11/WRITE12 공백 및 카드담당자PATCH는 자동승격하지 않는다.

부모가 API/web/PG 정상종료,3301/3002/3003/55432 closed와보존데이터 유지 확인. QA가 재기동/reset/기존data삭제한 적 없음. fixture 및 privateignored JSON 보존.
