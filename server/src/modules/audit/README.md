# Audit module

`recordAuditLog()` / `recordAuditLogSafe()` in `audit.service.ts` are the only
way an `AuditLog` row is ever created. There is no `update` or `delete`
exported from this module, and no route exposes either — the table is
append-only by construction.

**Every state-changing service function elsewhere in the codebase must call
`recordAuditLog`/`recordAuditLogSafe` before returning.** For critical paths
(MFA enable/disable, token-reuse revocation, status changes), wrap the
mutation and the audit write in the same `prisma.$transaction` so a failed
audit write rolls back the mutation too. For high-volume/low-stakes events
(e.g. `LOGIN_SUCCESS`), use `recordAuditLogSafe`, which swallows failures so
an audit-log hiccup never breaks the user-facing operation.

When reviewing a PR that adds or changes a mutation, check for the matching
`recordAuditLog` call at the same call site — that's the actual enforcement
mechanism here, backed up by `tests/integration/audit.flow.test.ts` asserting
the trail exists for each key event.
