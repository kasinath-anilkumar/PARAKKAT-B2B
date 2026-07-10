# External API Contracts

The portal integrates four external systems. Each sits behind a **swappable adapter**
(`mock` for dev/test, `live` skeleton for production) selected by an env var. This document
records the adapter interface the portal depends on, so a live implementation is a drop-in.
No external contract is re-implemented in the portal; it orchestrates and records outcomes only.

Full request/response schemas are also published at runtime via Swagger: **`GET /api/docs`**
(JSON at `/api/docs.json`).

---

## 1. AxisRooms — reservation system (Phase 6)

Source of truth for resorts, room types, availability, inventory (read-only) and reservations
(written on commit, reversed on cancel). Selected by `AXISROOMS_PROVIDER=mock|live`.

Adapter: `server/src/lib/axisrooms/axisrooms.types.ts` → `AxisRoomsClient`

| Method | Purpose | Notes |
|---|---|---|
| `healthCheck()` | Probe before every commit | Down ⇒ **block, don't queue** (503) |
| `listResorts()` | Resort catalog | Read-only; short-TTL cached |
| `searchAvailability(query)` | Room types + `baseRatePerNight` for dates/occupancy | Cached (`AVAILABILITY_CACHE_TTL_SECONDS`) |
| `getRoomType(resortId, roomTypeId)` | Fresh single read | Used for **refresh-before-book** (bypasses cache) |
| `createReservation(input)` | Write reservation on commit | **Idempotent** on `correlationId` |
| `cancelReservation(axisRoomsRef)` | Reverse on cancellation | |

Decision **D6**: confirm reservation *write* (push) is supported before enabling the live client.
Config: `AXISROOMS_BASE_URL`, `AXISROOMS_API_KEY`, `AXISROOMS_FORCE_DOWN` (dev downtime test).

---

## 2. Digio — KYB/eKYC + eSign (Phase 3–4)

Executes GST, PAN, Aadhaar eKYC, bank, document verification and Aadhaar eSign. The portal
initiates checks and receives results via **signature-validated, idempotent webhooks**.
Selected by `DIGIO_PROVIDER=mock|live`.

Adapter: `server/src/lib/digio/` → `DigioClient` (`initiateCheck`, `initiateESign`).

**Inbound webhook** — `POST /api/webhooks/digio`
- Header `x-digio-signature`: hex HMAC-SHA256 of the raw body using `DIGIO_WEBHOOK_SECRET`.
- Body: `{ providerRef, status: passed|failed|manual_review, checkType?, data? }`.
- Unverified/malformed → rejected, **no state change**, audited `WEBHOOK_SIGNATURE_REJECTED`.
- Retried callback for an already-terminal check → ignored (`outcome: "duplicate"`).
- eSign results (`checkType=ESIGN`) route to activation instead of KYB auto-progression.

Config: `DIGIO_BASE_URL`, `DIGIO_CLIENT_ID`, `DIGIO_CLIENT_SECRET`, `DIGIO_WEBHOOK_SECRET`.

---

## 3. CRS — financial ledger of record (Phase 7)

Receives every financial event; the portal never keeps a second ledger. Delivery is via a
**transactional outbox** (`CrsOutboxEvent`) written in the same transaction as the financial
change, then flushed inline; failed events are retryable via `POST /api/finance/crs/flush`. Selected by `CRS_PROVIDER=mock|live`.

Adapter: `server/src/lib/crs/index.ts` → `CrsClient.postEvent({ eventType, correlationId, payload })`

Event types: `BOOKING_OBLIGATION`, `PAYMENT`, `REFUND`, `CANCELLATION_CHARGE`.
Idempotent at the CRS boundary on `(correlationId, eventType)`. Base + markup can be posted
separately for margin reporting (Decision D5). Config: `CRS_BASE_URL`, `CRS_API_KEY`,
`CRS_FLUSH_INLINE`.

---

## 4. Airpay — payment gateway (Phase 7, Decision D2-a)

The portal collects payment and posts the event to the CRS. Selected by
`PAYMENT_PROVIDER=mock|airpay`.

Adapter: `server/src/lib/payments/index.ts` → `PaymentGateway` (`capture`, `refund`).
Mock captures synchronously; a live gateway typically returns `PENDING` and confirms via webhook.

**Inbound webhook** — `POST /api/webhooks/payment`
- Header `x-payment-signature`: hex HMAC-SHA256 of the raw body using `PAYMENT_WEBHOOK_SECRET`.
- Body: `{ gatewayRef, status: SUCCEEDED|FAILED }`.
- Unverified → rejected + audited; already-terminal payment → `duplicate` (idempotent).

Config: `AIRPAY_MERCHANT_ID`, `AIRPAY_SECRET`, `PAYMENT_WEBHOOK_SECRET`.

---

## Cross-cutting mechanics
- **Correlation ID** on every booking, carried into AxisRooms and the CRS.
- **Idempotent** external writes keyed off the correlation id.
- **Outbox + retry** for CRS postings; **reconciliation** job (`GET /api/finance/reconciliation`)
  flags drift across portal ↔ AxisRooms ↔ CRS.
