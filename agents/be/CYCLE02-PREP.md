# Cycle02 board reads readiness

Initial baseline430bfd1. Investigation preceded implementation and server startup.
Scope: GET board detail, columns and card page with existing session guard and
membership boundary. No new creation, movement or modification route.

Confirmed by OpenAPI/feature-spec: Board response + version ETag; columns{items}
ordered by position without cards; CardPage position ordering, default limit20/max100,
columnId/assigneeId UUID and tag string filters. blocked is computed from an existing
predecessor whose column.is_done is false. No stored blocked/warnings field.

The following gaps were reported before implementation and resolved by the user's
full proposal approval, recorded in contract commit1cc619f:

- Equal column/card position tie; whole-board cards have independent column positions.
- Card cursor boundary fields, filter binding and behavior after anchor deletion.
- Tag matching exact versus case-insensitive; missing/foreign valid filter resource.
- Missing board404 versus membership403; malformed UUID and read error declarations.
- warnings for all blocked cards versus only blocked cards already in a done column.

Existing Prisma supports membership, columns, predecessor.column and cardTags.tag
relations. Implement reads with an explicit public projection after authorization;
do not expose creator/private session data or relations. Acceptance cases must precede
implementation. Same retained isolated cluster/unique fixtures can be used later,
without reset. Parent coordinates runtime lifecycle and final independent QA.

Resolved: position ASC/id ASC, position/id cursor bound to board and exact filters,
deleted-anchor continuation without snapshot promise, AND/exact tag matching,
foreign/unknown valid filter IDs return empty, missing board/nonmember403, warnings
only blocked+current-done. Final evidence: CYCLE02-RESULT.md.
