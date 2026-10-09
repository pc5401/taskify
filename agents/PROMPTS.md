# 세션에 붙이는 첫 문장

관리자 판은 `agents/BOARD.md`다. 채팅으로 다른 역할에게 말하지 말고, 자기 OUTBOX에만 남겨라.

QA 세션: `agents/PROTOCOL.md`와 `agents/qa/CHARTER.md`를 읽고 QA-1을 수행하라.
BE 세션: QA OUTBOX에 QA-1 완료가 있을 때만 BE-1을 수행하라.
FE 세션: BE OUTBOX에 실행 방법이 있을 때만 FE-1을 수행하라.
감사 세션: 구현을 고치지 말고 `agents/audit/OUTBOX.md`에 통과, 보류, 거절만 남겨라.
