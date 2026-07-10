# UAT Test Plan — B2B Resort Booking Portal

User Acceptance Testing plan covering every role and every v3 flow. Architecture is in the root
`README.md`; operations in `docs/RUNBOOK.md`; integration contracts in `docs/API-CONTRACTS.md`.

## 1. Purpose & scope

Validate, from the end-user's perspective, that the portal behaves correctly across the four roles
(**Admin, Verifier, Agency, Agent**) and the external integrations (AxisRooms, CRS, Digio, Airpay,
mailer/SMS/WhatsApp) before go-live. This is **acceptance** testing — business-flow correctness — not
unit/integration coverage (which lives in `server/tests`).

**In scope:** onboarding → activation, search & booking (single + multi-room), the credit gate,
rate plans & occupancy (incl. child age bands), channel inventory, finance (GST invoices, credit
notes, partial payments, chargebacks, dunning), commit-failure/rebook, cancellations/no-show, guest
data, notifications, auth/MFA/password policy, dashboards, and reconciliation.

**Out of scope:** load/performance (separate NFR), penetration testing (`docs/SECURITY-CHECKLIST.md`),
DR (`docs/DR-BACKUP-RUNBOOK.md`).

## 2. Environment & entry criteria

- Dedicated **UAT environment** with its own database — never production data.
- All migrations applied: `npm run db:migrate:deploy --workspace server` then `npm run db:seed --workspace server`.
- External adapters in **mock mode** for the first pass (`*_PROVIDER=mock`, `AXISROOMS_*`, `PAYMENT_PROVIDER=mock`, `CRS_PROVIDER=mock`, `DIGIO_*`), then a **live smoke pass** in sandbox where the vendor provides one.
- `MFA_ENFORCED=true`, `MFA_ENFORCE_AGENCY=true`, `PASSWORD_MIN_LENGTH=10` (production-like).
- Seeded accounts available (Admin, Verifier, plus at least one activated Agency with an Agent).
- Clean audit log so trail assertions are unambiguous.

**Exit criteria:** every P1 (critical-path) case Passed; no open P1/P2 defects; each money-moving flow
reconciles (`GET /finance/reconciliation` reports `clean: true`); audit entries present for each
state change.

## 3. Roles under test

| Role | Persona | Key surfaces |
|---|---|---|
| **Admin** | Parakkat ops/finance | agencies, pricing, inventory, finance, bookings oversight, reconciliation, dunning, rebook queue |
| **Verifier** | KYC reviewer | application queue, verification checks, approve/reject |
| **Agency** | Travel-agency principal | sub-agents, search & book, bookings, invoices/credit, account security |
| **Agent** | Agency staff (scoped by permission flags) | search & book, own bookings, profile |

## 4. Severity & priority

- **P1** — critical path; blocks go-live if failing (login, booking commit, payment capture, credit gate, invoice correctness).
- **P2** — important but has a workaround.
- **P3** — cosmetic / minor.

---

## 5. Test scenarios

Each case: **Pre** (preconditions) → **Steps** → **Expected**. Tester records Pass/Fail + evidence
(screenshot + booking/invoice id + relevant audit event).

### 5.1 Authentication, MFA & password policy (§10.2)

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| A1 | P1 | Admin first login (MFA not yet set) | Redirected to MFA setup; TOTP QR shown; after confirming a valid code, lands on Admin dashboard |
| A2 | P1 | Admin login with wrong password ×N | Rejected each time; `LOGIN_FAILED` audit entries; rate limiter throttles after threshold |
| A3 | P1 | Agency first login with temporary password | Forced through MFA setup (`MFA_ENFORCE_AGENCY`); "change your password" banner shown; temporary password meets policy |
| A4 | P1 | Change password with a weak value (`abc`) | Rejected client + server with the specific unmet rules; no change persisted |
| A5 | P1 | Change password with a compliant value | Success; **other sessions revoked** (a second browser is logged out on next call); `PASSWORD_CHANGED` audit; banner clears |
| A6 | P2 | Reuse current password as "new" | Rejected ("must be different") |
| A7 | P2 | Agent created by agency | Receives temp password once; `mustChangePassword` true; forced-change banner on first login |
| A8 | P2 | Suspended user login | Blocked with "account suspended"; `LOGIN_BLOCKED_SUSPENDED` audit |
| A9 | P1 | Cross-role URL access (Agent opens `/admin/...`) | Denied (403 / redirect); no data leak |

### 5.2 Onboarding & verification (Verifier + Admin)

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| O1 | P1 | Public applicant submits registration | Application created (DRAFT→VERIFICATION); `REGISTRATION_RECEIVED` email; resume token works |
| O2 | P1 | Verifier runs GST/PAN/bank/Aadhaar checks (mock) | Check statuses update; Aadhaar stored as **reference only**, never the raw number |
| O3 | P1 | Verifier rejects with reason | Applicant notified; lifecycle → REJECTED; reason recorded |
| O4 | P1 | Admin approves → commercial config → agreement eSign (Digio mock) | Lifecycle progresses; agreement signed; **agency activated**; AGENCY user created with temp password + activation email |
| O5 | P2 | Resubmission requested | Applicant can resume/edit and re-submit |
| O6 | P2 | Document upload | Stored via storage adapter by opaque key (never a public URL); checksum recorded |

### 5.3 Search & booking — core flow (Agent/Agency)

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| B1 | P1 | Select hotel before choosing dates | Prompted to pick check-in/out first |
| B2 | P1 | Search with dates; a hotel has no availability that date | That hotel shown unavailable; **available alternatives surfaced** |
| B3 | P1 | Available hotel → shows room types with rate-plan prices | Rooms + EP/CP/MAP/AP prices (agency price only; customer price never shown) |
| B4 | P1 | Occupancy: 2 adults + extra adult + extra bed | Price reflects extra-adult and extra-bed charges per night |
| B5 | P1 | **Child age bands (§2.2):** 2 children ages 4 and 10, room configured 0–5 free / 6–12 half | Child 4 free, child 10 half-rate; total matches the band math |
| B6 | P1 | Rate calendar window (§2.4) covering the stay | Price uses the **dated window** rate, not the base rate |
| B7 | P1 | Prepay booking → pay | Payment captured; PAID invoice with GST; booking COMMITTED with AxisRooms ref; `BOOKING_CONFIRMED` notification |
| B8 | P1 | Credit booking within limit | CONFIRMED_ON_CREDIT → COMMITTED; ISSUED credit invoice with due date; AR increases |
| B9 | P1 | Hold expiry | Unpaid prepay hold lapses to EXPIRED after TTL; cannot be paid afterwards |

### 5.4 Multi-room group booking (§4)

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| G1 | P1 | Cart with 3 rooms, one checkout | All lines share a `groupId`; **credit gate runs on the aggregate**, one decision |
| G2 | P1 | Pay a group | All awaiting-payment lines paid in one action; a single confirmation |
| G3 | P2 | Partial cancel — cancel one room of a group | Only that line cancelled + its own credit note/refund; others unaffected |

### 5.5 Credit gate & limits

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| C1 | P1 | Booking that would exceed the credit limit | Routed to **prepay** (pay-first), not confirmed on credit |
| C2 | P1 | Outstanding nets partial payments | Available credit reflects `limit − (billed − paid)` |
| C3 | P2 | Suspended agency attempts to book | Blocked ("not active") |

### 5.6 Channel inventory (§3)

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| I1 | P1 | Admin sets STOP_SELL for a date/room | That room hidden from B2B availability for those dates |
| I2 | P1 | CAP per day reached | Room unavailable once the cap is consumed; re-checked at commit |
| I3 | P2 | Allotment for an agency | The agency can book against its block |
| I4 | P1 | Policy re-check at commit | A room that passed search but is now stop-sold fails at booking with a clear error |

### 5.7 Finance — GST, credit notes, partial payments, chargebacks (§6, §5.3)

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| F1 | P1 | Invoice for an intra-state stay | CGST+SGST split; SAC 996311; correct slab; place-of-supply set |
| F2 | P1 | Invoice for inter-state stay | IGST only |
| F3 | P1 | GST exemption threshold (≤ ₹1,000/night) | 0% GST applied |
| F4 | P1 | Cancellation with policy charge | Refund + **GST credit note** for the reduced portion; AR adjusted |
| F5 | P1 | **Partial payment** of a credit invoice | Invoice → PARTIALLY_PAID; `amountPaid` increments; remaining shown; AR nets it |
| F6 | P1 | Pay remaining balance | Invoice → PAID; `PAYMENT_RECEIVED` notification |
| F7 | P1 | **Chargeback** (admin) on a settled payment | OUTBOUND CHARGEBACK payment booked; **AR re-opens** (PAID→ISSUED/PARTIALLY_PAID); agency notified; reconciliation shows the open chargeback |
| F8 | P2 | Chargeback the same payment twice | Second attempt rejected (idempotent) |

### 5.8 Dunning & overdue enforcement (§6.3)

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| D1 | P1 | Run dunning with overdue credit invoices | Reminders sent; counts returned |
| D2 | P1 | Invoice past the suspend threshold | Agency **auto-suspended**; can no longer transact; notified |
| D3 | P2 | Credit utilisation above alert % | Utilisation alert sent |

### 5.9 Commit-failure / rebook queue (§5.2)

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| R1 | P1 | AxisRooms rejects the reservation **after** payment capture (force adapter failure) | Payment **not lost**; booking → COMMIT_FAILED; RebookTask queued; agent sees "confirming…" + pending-confirmation notice |
| R2 | P1 | Admin runs the rebook queue when AxisRooms is healthy again | Booking commits; credit obligation recorded (if credit); `BOOKING_CONFIRMED` sent; task RESOLVED |
| R3 | P1 | Retries exhaust the ceiling | Task → ABANDONED; agency notified confirmation failed |
| R4 | P1 | Cancel a COMMIT_FAILED booking | **Full refund** of held funds (0% charge); task closed |

### 5.10 Cancellations, no-show, resort-cancel (§7)

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| X1 | P1 | Agent cancels within a policy band | Correct charge %/refund; credit note; AxisRooms reservation reversed |
| X2 | P1 | Admin records a **no-show** (past check-in) | 100% policy charge; `NO_SHOW_RECORDED` notification |
| X3 | P1 | Admin **resort-cancel** with reason | **Full refund** (0%); mandatory reason recorded; agency notified |

### 5.11 Guest data & DPDP (§8)

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| P1 | P1 | Book with lead guest + government ID number | Only **type + last 4 digits** persisted; full number never stored |
| P2 | P1 | View booking detail (agent/agency/admin) | Guest ID shown masked as `Aadhaar ••••1234`; special requests visible |
| P3 | P2 | Rooming list per room | Occupant names retained per room |

### 5.12 Notifications (§9)

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| N1 | P1 | Booking confirmed / cancelled / no-show / payment received | Correct email + SMS/WhatsApp copy for each event |
| N2 | P2 | Overdue / due reminder / credit alert | Correct dunning notifications |
| N3 | P2 | Pending-confirmation / confirmation-failed (rebook) | Correct copy on queue and abandonment |

### 5.13 Dashboards & reconciliation

| # | Pri | Scenario | Expected |
|---|----|----------|----------|
| M1 | P1 | Admin dashboard under normal load | Loads without exhausting DB connections; totals match the underlying data |
| M2 | P1 | Reconciliation after a full day of activity | `clean: true`; no committed-without-ref/invoice, no unmatched payments, no ledger mismatches |
| M3 | P2 | Agency/Agent dashboards | Scoped to own agency only; no cross-tenant data |

### 5.14 Tenant isolation (cross-cutting, P1)

- An Agency/Agent can never see or act on another agency's bookings, invoices, agents, or balances — verify via both UI and direct API calls with a valid token from the wrong tenant. Expect 404/403, never data.

---

## 6. Execution & sign-off

1. **Pass 1 — mock adapters:** run every case; log defects with severity.
2. **Pass 2 — sandbox live adapters:** re-run integration-touching cases (O2/O4 Digio, B7/F* Airpay, all AxisRooms) against vendor sandboxes.
3. **Regression:** re-run all P1 after each defect fix batch.
4. **Sign-off:** Product owner + Parakkat finance + a pilot agency confirm exit criteria met.

**Defect log columns:** id · case · severity · steps · expected · actual · evidence · status · owner.

**Traceability:** each row maps to a v3 section (shown in the headings) so coverage against the spec
is auditable.
