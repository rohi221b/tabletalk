Status: done
Blocked by: 04

# 05 — Discover browse list

Implement the ranked browse list. This is the core matching step: the server returns Discoverable Participants filtered and sorted by shared Interest count. The frontend renders each as a card with interests highlighted and names hidden.

## Acceptance criteria

- `GET /sessions/{sessionId}/discover` returns a list of Participant summaries for the calling user
- Each summary contains: `participantId`, `interests`, `intention`, `preferredFormat`, `sharedInterests` (subset of the caller's interests that overlap), `sharedInterestCount`
- Filtering rules (all enforced server-side):
  - `discoverability: true`
  - `status: active`
  - `availabilityExpiresAt` in the future
  - Not the calling Participant
  - Not in `blockedParticipantIds` of either party
  - `sharedInterestCount >= 1`
- Sorted by `sharedInterestCount` descending; tie-broken by Intention match (same as caller = higher)
- **No names, no nicknames in this response** — name reveal happens only post-Connection
- Frontend: render each card with interest chips (shared ones highlighted), intention badge, and an "I'd like to talk" button
- Frontend uses Firestore `onSnapshot` on `/sessions/{sessionId}/participants` to update the list in real-time when someone's Discoverability changes

## Notes

- Unit-test the ranking logic in isolation (pure function, no Firestore)
- The card also shows a Gemini blurb — but that blurb is generated on Conversation Request (ticket 06), not here. The browse card shows a rule-based summary until a request is sent.
