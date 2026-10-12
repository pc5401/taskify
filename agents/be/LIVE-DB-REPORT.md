# Isolated PostgreSQL verification

Baseline cf2f5ae. Existing embedded-postgres 18.4.0-beta.17 Windows binaries were
reused read-only. A new UUID data directory under apps/api/.runtime was initialized
with UTF8/locale C/SCRAM. PostgreSQL18.4 runs on127.0.0.1:55432/taskify_validation.
Both existing migrations were actually applied. No dependency installation, system
service, existing user database, schema or migration change was performed.

## Observed defect and repair

PostgreSQL rejected COMMIT with SQLSTATE23514/LAST_OWNER, but Prisma5.22 resolved the
interactive transaction result while the DB rolled back. Catching a COMMIT exception
alone could not detect an error that never reached JavaScript.

TransactionsService.run now executes SET CONSTRAINTS boards_require_owner IMMEDIATE
after all work and before returning the transaction callback. It checks both named
board INSERT and membership triggers without changing other constraints or SQL policy.
The explicit validation yields PrismaClientKnownRequestError P2010 with metadata:

```json
{"code":"23514","message":"ERROR: LAST_OWNER"}
```

Only that explicit named validation and exact SQLSTATE/message pair map to409
LAST_OWNER. Exact LAST_OWNER without ERROR prefix is also accepted. Unrelated CHECK
errors and errors from transaction work propagate unchanged.

## Final verification

TypeScript build PASS; seven suites/40 unit/mock HTTP tests PASS, including two new
owner constraint regressions. Real PostgreSQL checks passed11/11:

- Both migrations finished without rollback.
- Five composite FKs reject cross-board writes and map to422 CROSS_BOARD.
- FK rejection preserves card column/predecessor/assignee.
- Ownerless board insertion returns409 and leaves no board row.
- Last-owner demotion returns409 and preserves OWNER membership.
- Failure after board/member/column creation rolls all three sets back.
- Concurrent opposite dependency writes produce one success and one cycle rejection,
  with one persisted dependency and versions1/2.

Final fixture prefix bd53ad63-b094-4504-b722-576e3368bfb3. Fixtures/data are retained;
no reset/drop/delete. Ignored cluster file be-db-regression.json contains detailed
results. Internal transaction checks do not certify unimplemented business HTTP
endpoints or all QA001~013 acceptance cases.

## Lifecycle

Initial sandbox server did not persist. Status/direct connection confirmed failure,
then the same new data was restarted outside sandbox with file-based control stdio.
PostgreSQL recovered it. Resumed work again confirmed stopped/ECONNREFUSED and started
only that retained cluster; no repeated initialization or reset.

Auth/me/boards API ran against this DB and an API-only restart reused environment keys
while the DB stayed running. FE/QA live reports are independently owned evidence.
Runtime secrets remain ignored and are not committed or printed. DB stays running
for independent QA; parent controls final pg_ctl fast shutdown with data preserved.
