# 012 DUE_SOON은 읽어도 같은 due_at이면 한 행

## 인수 문장

DUE_SOON 알림을 읽은 뒤 알림 생성 job이 같은 `due_at`으로 다시 실행되어도 해당 알림 행은 하나만 존재한다. 읽음 여부는 멱등 unique 키에 영향을 주지 않는다.

근거: `docs/contract/erd-api.md` 3절(unique `(user_id, type, resource_id, due_at_snapshot)`, "읽음은 unique에 영향 없다", "job은 INSERT ... ON CONFLICT DO NOTHING"), 9절("DUE_SOON을 읽은 뒤 job이 다시 돌아도 같은 due_at이면 행이 하나"). `docs/contract/v0.2.1.md` DB 제약(`notifications (user_id, type, resource_id, due_at_snapshot) where type in (DUE_SOON, OVERDUE)`).

## 사전 상태

- 카드 C: `assigneeId=U`, `dueAt = now+20h`, 완료 컬럼에 있지 않음.
- 알림 job 최초 실행으로 `Notification(userId=U, type=DUE_SOON, resourceId=C.id, dueAtSnapshot=C.dueAt)` 1건 생성됨(`id=N1`).
- U가 `POST /notifications/{N1.id}/read`를 호출해 `N1.readAt`이 채워짐.

## 요청

알림 생성 job을 동일한 `due_at` 조건으로 재실행한다(HTTP 엔드포인트가 아닌 내부 스케줄 job이므로 DB 상태로 검증).

```
INSERT INTO notifications (user_id, type, resource_id, due_at_snapshot, ...)
VALUES (U, 'DUE_SOON', C.id, C.dueAt, ...)
ON CONFLICT DO NOTHING
```

## 기대 HTTP와 code

HTTP 응답 없음(백그라운드 job). 검증은 DB 질의: `notifications`에서 `(user_id=U, type=DUE_SOON, resource_id=C.id, due_at_snapshot=C.dueAt)` 조건에 맞는 행 수 = 1.

## 변하지 않아야 하는 필드

- `N1.id` 불변 (새 행이 추가되지 않음)
- `N1.readAt` 유지 (이미 읽음 상태 유지, job 재실행으로 초기화되지 않음)
- 해당 조건의 행 수 = 1

## 결과: 미실행
