# CareQueue implementation playbook

## Queue model and ETA

Store one row per queue visit and append status events in the same transaction as transitions. A safe queue lifecycle is `waiting → called → in_consultation → completed`, with `no_show → waiting` only through an explicit staff rejoin. Serialise call-next mutations with a row lock so two staff devices cannot call different next patients concurrently.

Compute recent average consultation duration from valid, completed visits, clamp outliers, and use a visible fallback until data exists. Estimate a wait from patients ahead plus remaining time in the active consultation. Return `{ etaMinutes, serverNow }`; a client countdown is `max(0, ceil(etaMinutes*60) - floor((now-serverNow)/1000))`. Refresh the estimate periodically so queue transitions and new completed-consult times change the displayed countdown.

## Safe demo dataset

Prefer one deterministic helper returning fixture rows and test it independently. A useful hackathon set has at least ten active tickets, a balanced mix of languages, completed visits spread through recent hours, a no-show, and several explicitly simulated message outcomes. Tag every fixture, set `patientPhone=null` and `smsOptIn=false`, and label sample delivery badges `DEMO · ...`. Make seeding idempotent and avoid altering real rows; make reset delete only tagged tickets and their dependent events.

## Twilio outbound delivery

Keep Account SID, API Key SID/Secret, Account Auth Token, sender, and callback URL on the server. Require an E.164 recipient plus affirmative queue-only consent. Include a `StatusCallback` URL on every message, store the returned Message SID and initial provider state, and show the eventual callback state in the staff-only view. Avoid patient names or clinical details in the message body.

Twilio callback references (checked 2026-09-28):

- Message creation and callback parameter: https://www.twilio.com/docs/messaging/api/message-resource
- Outbound status events: https://www.twilio.com/docs/messaging/guides/track-outbound-message-status
- Webhook signature verification: https://www.twilio.com/docs/usage/webhooks/webhooks-security
- Node SDK: https://www.twilio.com/docs/libraries/reference/twilio-node/

Use `twilio.validateRequest(authToken, signature, exactCallbackUrl, allFormParams)` from the official Node package. Configure a stable public HTTPS URL ending in the registered webhook path; do not reconstruct a validation URL from an untrusted Host header. A malformed/missing signature should be rejected without reading or changing a ticket. A valid callback should find the ticket by stored Message SID, lock it in a transaction, ignore unknown/demo SIDs, and reject backward transitions (e.g. `delivered → sent`). Acknowledge unknown SID callbacks so the provider does not retry forever, while returning a retryable status if the database is unavailable.

Suggested status order: `accepted/scheduled → queued → sending → sent → delivered → read`; terminal `failed`, `undelivered`, and `canceled` states may follow send states. Be tolerant of duplicate/equal callbacks.

## Secret verification order

1. Request new secrets via the project's secure secret workflow; never ask the user to paste tokens into chat.
2. Immediately run a tiny read-only API authentication test. Inspect only HTTP status; cancel/discard any response body containing account/recipient data.
3. Validate formatting (SID prefixes, E.164 sender, HTTPS callback path) without printing values.
4. Do not send a real message as an authentication test. A live delivery smoke test is billable and needs an explicitly consented test destination.

## Quality gate

Run the formatter/type checker, all Vitest tests, and production build. Test pure ETA/seed/status helpers, Twilio form fields and safe error handling, HMAC validation via the SDK, demo opt-out invariants, and status monotonicity. Verify public API responses do not include names/contact/access keys, then visually inspect the patient, staff, and token-only display at desktop and mobile sizes.
