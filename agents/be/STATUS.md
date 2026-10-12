# BE 상태

사이클03 생성/이동 구현 및 빌드 준비 완료, 실제 QA 검증 대기.
기준 integration64f7ae9; QA 선행6e3b8e9 및 후속8d9294d.
POST columns/:columnId/cards, POST cards/:cardId/move만 추가.
컬럼 UUID순→카드 UUID순 잠금, bounded3회 source 재조회 retry,
If-Match/CAS, WIP self제외, no-op, position 재배치/version,
PG lower 태그 dedup/upsert, 활동 원자성 구현.
검증 TypeScript build 및10 suites64 tests PASS. 실제검증 대기.
DBschema/migration 변경없음. runtime 부모 기동/종료 조율.
