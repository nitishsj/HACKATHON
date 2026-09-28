# CareQueue hackathon demo checklist

## Before presenting

- [ ] Confirm the hosted preview is available and `/staff` sign-in returns to the CareQueue staff page in the same tab.
- [ ] The hosted demo is already seeded. In a fresh environment, load the tagged dataset once; confirm **25 records**, including 12 active, 12 completed, and one no-show.
- [ ] Verify the board contains tokens only and the staff roster contains visible `DEMO` labels.
- [ ] Open `/` on a phone and `/display` on the room screen; set a non-English patient language.
- [ ] Confirm a countdown is ticking from the clinic's average consultation time.
- [ ] From `/staff`, print or copy the patient check-in QR; scan it to open the check-in form and verify that tracking appears after submission.
- [ ] Verify a spaced `+91` number or 10-digit Indian number is accepted. Leaving SMS unchecked must never block check-in; an opted-in valid test number receives the registration confirmation.
- [ ] Make sure mock records have no phone numbers and no SMS consent.

## Suggested live flow

1. Show the patient switching languages and checking in without leaving the room.
2. Show the live estimate and per-second countdown, then the anonymous room display.
3. From staff, call the next patient, start a consultation, and complete it. Show the waiting order/ETAs respond and the hourly/trend charts reflect clinic activity.
4. Point out per-patient Twilio states. Values prefixed `DEMO` are simulated display fixtures, **not real carrier receipts**.
5. If demonstrating a real SMS, use only a number that has explicitly opted in and that the Twilio account is permitted to message. A real send may incur provider charges. No real message is required to demonstrate the app's seeded UI.

## Reset

Use **Clear demo** in the staff panel only if you want to remove the tagged mock records. This does not remove non-demo queue tickets. Do not enter actual patient names, contact information, or medical details into a hackathon demo.
