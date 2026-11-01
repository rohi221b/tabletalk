Status: done
Blocked by: 06

# 07 — Mutual acceptance + Connection formation + Icebreaker

Implement accepting/declining a Conversation Request and the Connection formation logic. On mutual acceptance, generate the Icebreaker via Gemini and reveal names to both parties.

## Acceptance criteria

- `PUT /sessions/{sessionId}/requests/{requestId}/accept`
  - Sets `status: accepted` on the request
  - Checks whether a reciprocal accepted request already exists (i.e. the other party already accepted)
  - If yes: creates a `connections` document with `participantIds: [a, b]`, calls Gemini (Prompt 2) to generate the Icebreaker, stores it on the Connection
  - Returns `{ connectionFormed: boolean, connectionId?: string }`
- `PUT /sessions/{sessionId}/requests/{requestId}/decline`
  - Sets `status: declined` on the request
  - Adds `toParticipantId` to `fromParticipantId.blockedParticipantIds` AND vice versa (bidirectional block)
- `GET /sessions/{sessionId}/connections` returns the calling Participant's Connections, including the other Participant's **full** nickname and the Icebreaker
- Gemini Prompt 2: takes both names + Interests + Intentions. One silent retry on failure; fallback: `"Ask [other_name] what they think about [shared_interest] — you both chose it."`
- Frontend:
  - Accepting a request transitions to a "Waiting for them to accept" state
  - When a Connection is formed (detected via Firestore `onSnapshot` on connections), show the Connection screen: both names revealed, shared interests, Icebreaker, and a "Go say hi!" prompt
  - Declining should feel low-friction — a quiet dismissal, no confirmation dialog

## Notes

- The Connection creation must be idempotent — if both parties accept at the same moment, only one Connection document should be created (use a Firestore transaction)
- Names are NEVER included in any response until a Connection document exists containing the caller's UID in `participantIds`
- Test: accept from A only → no Connection; accept from B → Connection formed; both see the Connection screen
