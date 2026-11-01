Status: done
Blocked by: 02

# 03 — Session join + Temporary Profile API

Implement the backend endpoints and Firestore writes for a Participant joining a Café Session and creating their Temporary Profile. The frontend should display the café name after joining.

## Acceptance criteria

- `GET /cafes/{cafeId}` returns `{ cafeId, cafeName, sessionId }` where `sessionId = {cafeId}_{YYYY-MM-DD}`
- `POST /sessions/{sessionId}/join` validates the Firebase ID token, creates a Participant document in Firestore, and returns the participant profile
- Participant document fields: `userId`, `nickname`, `interests`, `intention`, `preferredFormat`, `availabilityMinutes`, `availabilityExpiresAt`, `discoverability: false`, `blockedParticipantIds: []`, `status: active`, `joinedAt`
- `availabilityExpiresAt` is computed as `now + availabilityMinutes`
- `GET /sessions/{sessionId}/participants/me` returns the calling Participant's profile
- `DELETE /sessions/{sessionId}/participants/me` sets `status: left`
- Frontend: QR/URL entry → show café name → onboarding form (nickname, interest chips, intention, availability) → submit calls `POST /sessions/{sessionId}/join`

## Notes

- Interest taxonomy is fixed — validate against the allowed list server-side
- Reject the join if the same Firebase UID already has `status: active` in this session (idempotent rejoin: update instead of error)
- `discoverability` starts as `false` — the Availability toggle (ticket 04) enables it
