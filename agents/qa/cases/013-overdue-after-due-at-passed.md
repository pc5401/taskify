# 013 지난 마감은 OVERDUE 한 행

## 인수 문장

`due_at`이 이미 지난 카드에 대해 알림 생성 job이 실행되면 DUE_SOON이 아니라 OVERDUE 알림이 정확히 한 행 생긴다.

근거: `docs/contract/erd-api.md` 3절("now() >= due_at 이면 DUE_SOON을 만들지 않는다. OVERDUE 한 번"), 9절("due_at이 지난 카드는 DUE_SOON이 아니라 OVERDUE 한 행"). `docs/contract/v0.2.1.md` 동일 job 규칙.

## 사전 상태

- 카드 C: `assigneeId=U`, `dueAt = now-1h`, 완료 컬럼에 있지 않음.
- 이 카드에 대한 기존 DUE_SOON 또는 OVERDUE 알림 없음.

## 요청

알림 생성 job 실행(HTTP 엔드포인트 아님, DB 상태로 검증).

```
-- job 로직
IF now() >= due_at:
  INSERT INTO notifications (user_id, type, resource_id, due_at_snapshot, ...)
  VALUES (U, 'OVERDUE', C.id, C.dueAt, ...)
  ON CONFLICT DO NOTHING
  -- DUE_SOON 행은 생성하지 않음
```

## 기대 HTTP와 code

HTTP 응답 없음(백그라운드 job). 검증은 DB 질의:

- `notifications`에서 `(user_id=U, type=OVERDUE, resource_id=C.id, due_at_snapshot=C.dueAt)` 조건 행 수 = 1.
- `notifications`에서 `(user_id=U, type=DUE_SOON, resource_id=C.id, due_at_snapshot=C.dueAt)` 조건 행 수 = 0.

## 변하지 않아야 하는 필드

- job 실행 전 다른 카드/다른 사용자의 알림 행 불변.
- 이 카드에 과거 DUE_SOON 알림이 이미 있었다면(사전 상태와 별개 변형) 그 행은 지워지지 않고 유지된다. 새 알림만 멈춘다("완료 컬럼으로 옮기면 기존 알림은 지우지 않고, 새 알림만 멈춘다"와 동일한 "지우지 않음" 원칙).

## 결과: 미실행
