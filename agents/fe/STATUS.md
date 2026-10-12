# FE STATUS

2026-10-12 BFF foundation source implemented; QA acceptance pending.

- QA AUTH-BFF-001..009 read before product coding (b49563e).
- Next /api/auth/login, register, logout; /api/me GET/PATCH; /api/boards GET/POST.
- PostgreSQL-only durable store, row-locked refresh, AES-GCM with session_hash AAD.
- Random persistent HttpOnly cookie; immutable seven-day expiry; Origin mutation guard.
- Project-local pinned install: zero npm reported vulnerabilities.
- Typecheck PASS, BFF mock 8/8 PASS, existing transport mock 5/5 PASS.
- Next production build PASS after sandbox EPERM approved local retry.
- No DB install/start/connection; no browser/live upstream acceptance; pages excluded.
- Network logout explicitly returns 502 for unconfirmed upstream revoke while local revoke clears cookie.
- Cross-service refresh commit is not atomic; README documents re-login/reuse consequences.
