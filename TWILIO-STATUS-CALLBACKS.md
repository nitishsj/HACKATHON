# Twilio delivery-status callbacks

Verified against Twilio's official documentation on 2026-09-28:

- [Message resource](https://www.twilio.com/docs/messaging/api/message-resource) — send each outbound SMS with a `StatusCallback` URL.
- [Track outbound message status](https://www.twilio.com/docs/messaging/guides/track-outbound-message-status) — callbacks include the Message SID and status, with `ErrorCode` for relevant failures; callbacks can be out of order.
- [Webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security) — verify `X-Twilio-Signature` against the exact external URL, all form parameters, and Account Auth Token.
- [Twilio Node helper library](https://www.twilio.com/docs/libraries/reference/twilio-node/) — the project uses the official `twilio.validateRequest` helper rather than a custom production HMAC implementation.

CareQueue stores the outbound Message SID, initial status, callback state, update time, and safe numeric error code on the ticket. The HTTPS callback is registered at `/api/twilio/status`; it locks the matching non-demo ticket row, rejects backward status transitions, ignores unknown/demo SIDs, and never returns or logs patient/account data. Keep `TWILIO_AUTH_TOKEN` and all other Twilio credentials server-only. The demo dataset opts no one into SMS.
