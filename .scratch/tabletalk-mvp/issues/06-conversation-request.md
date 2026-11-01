Status: done
Blocked by: 05

# 06 — Conversation Request + Gemini blurb

Implement sending a Conversation Request and generating the Gemini blurb shown to the recipient. The sender sees a "waiting" state; the recipient sees a notification card.

## Acceptance criteria

- `POST /sessions/{sessionId}/requests` body: `{ toParticipantId: string }`
  - Validates that the target is Discoverable and not blocked
  - Rejects duplicate requests (same sender → same recipient in this session)
  - Calls Gemini (Prompt 1) to generate a 2-sentence blurb using sender + recipient Interests and Intentions — **no names**
  - On Gemini failure: one silent retry; then use rule-based fallback: `"You both share an interest in [shared_interests]. This could be a great conversation."`
  - Creates the `conversation_requests` document with `status: pending` and the blurb attached
  - Returns the created request document
- `GET /sessions/{sessionId}/requests/incoming` returns all pending requests where `toParticipantId == caller`
- Frontend: "I'd like to talk" button transitions to a "Waiting…" chip on the browse card
- Frontend: incoming requests appear as a notification banner or dedicated screen showing the sender's Interests, Intention, and the Gemini blurb
- Frontend uses Firestore `onSnapshot` on `conversation_requests` filtered to the current Participant to receive incoming requests in real time

## Notes

- Gemini Prompt 1 input must only contain Interests + Intentions. Never send names to this prompt.
- Validate Gemini output as non-empty string before storing. If invalid, use fallback.
- The `geminiBlurbFallback: boolean` field on the document records whether the fallback was used (for debugging; not shown to users)
