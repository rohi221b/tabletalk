Status: done
Blocked by: 03

# 04 — Discoverability toggle + availability expiry

Implement the explicit opt-in toggle and the soft-pause behaviour when the Availability Window expires.

## Acceptance criteria

- `PUT /sessions/{sessionId}/participants/me/discoverability` accepts `{ discoverability: boolean }` and updates the Firestore document
- Frontend: after onboarding, show the Availability screen with a clear "I'm open to meeting someone" toggle; tapping it calls the endpoint
- A background task (FastAPI lifespan or Cloud Scheduler job) scans for Participants whose `availabilityExpiresAt` has passed and sets `discoverability: false` on them
- The frontend shows a nudge ("Your time is up — tap to go live again") when the calling Participant's `discoverability` is `false` and `availabilityExpiresAt` is in the past
- The nudge allows extending availability without re-doing onboarding (re-PUT with `discoverability: true` and a new `availabilityMinutes`)

## Notes

- For the hackathon demo, a simple periodic background check (every 60 seconds) is sufficient — no need for per-document Firestore TTL triggers
- The frontend Firestore listener on the own Participant document drives the nudge UI
