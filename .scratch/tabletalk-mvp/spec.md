Status: done

# TableTalk MVP — Spec

## Problem Statement

People visit cafés alone and would enjoy meeting someone new, but approaching strangers is socially awkward and there is no way to know whether another customer wants to interact. This creates a silent mismatch: multiple people who would enjoy a conversation sit near each other and never connect.

## Solution

TableTalk is an AI-powered café companion. Customers at the same café scan a QR code, create a temporary anonymous profile, declare their interests and social intention, and opt in to being discoverable. They then browse a ranked list of other Participants who are also open to meeting someone — names hidden — and send a Conversation Request to whoever feels interesting. Only after both parties accept is identity revealed, along with a Gemini-generated Icebreaker to start the conversation in person.

The product is social, not a dating app. It helps two strangers who are already in the same room find a meaningful reason to say hello.

## User Stories

1. As a Participant, I want to scan a QR code at a café and land immediately in a session, so that I don't need to download an app or create an account.
2. As a Participant, I want to sign in anonymously with no email or password, so that there is no friction before I can explore the product.
3. As a Participant, I want to enter a nickname (not my full name), so that I feel safe before I've chosen to connect with anyone.
4. As a Participant, I want to select 3–5 Interests from a fixed list of chips, so that I can express what I care about quickly.
5. As a Participant, I want to select a social Intention (make friends / professional networking / discuss topics / find activity partner), so that people who approach me understand what kind of interaction I'm open to.
6. As a Participant, I want to select my Availability Window (15 / 30 / 60 minutes), so that anyone who connects with me knows how much time I have.
7. As a Participant, I want to toggle Discoverability on explicitly before I appear in anyone else's browse list, so that I never appear without my consent.
8. As a Participant, I want to browse a ranked list of other Discoverable Participants sorted by how many Interests we share, so that I see the most relevant people first.
9. As a Participant browsing the list, I want to see only Interests, Intention, and a short AI-generated blurb for each person — no name — so that I can evaluate compatibility without feeling like I'm judging someone by identity.
10. As a Participant, I want to tap "I'd like to talk" on a card to send a Conversation Request, so that I can express interest without approaching anyone in person.
11. As a Participant who sent a request, I want to see a "waiting" state on that card, so that I know the request is pending and I haven't been rejected yet.
12. As a Participant who received a Conversation Request, I want to see the sender's Interests and Intention (not their name), so that I can decide whether to accept without pressure.
13. As a Participant, I want to quietly decline a Conversation Request, so that the sender is not notified and neither of us is embarrassed.
14. As a Participant, I want declining to result in a bidirectional block for this session — neither of us sees the other again — so that the experience stays comfortable.
15. As a Participant, I want a Connection to be formed only after both parties have accepted, so that I am never exposed to someone who didn't choose to connect with me.
16. As a Participant who just formed a Connection, I want to see the other person's name and a Gemini-generated Icebreaker immediately, so that I have a concrete reason to walk over and say hello.
17. As a Participant, I want the Icebreaker to be specific and personal (referencing our shared Interests), so that it doesn't feel like a generic script.
18. As a Participant, I want my Availability Window timer to silently turn off my Discoverability when it expires — without kicking me out of the session — so that I don't accidentally disappear mid-conversation.
19. As a Participant whose timer has expired, I want a visible nudge to re-enable Discoverability if I want more time, so that I can extend without re-doing onboarding.
20. As a Participant, I want to tap "Leave" at any time to remove myself from the session entirely, so that I can exit cleanly.
21. As a Participant, I want Gemini failures to fall back silently to template copy, so that the demo never breaks due to an API issue.
22. As a connected pair of Participants (stretch), I want to optionally open our table so others can request to join, so that conversations can grow organically into small groups.
23. As a third Participant (stretch), I want to see Open Tables in the browse list and send a Join Request, so that I can join a conversation already in progress.
24. As a member of an Open Table (stretch), I want to unanimously accept or decline a Join Request before the third person joins, so that the group decides together.

## Implementation Decisions

### Stack
- **Frontend**: React with TypeScript, Vite for local dev
- **Backend**: Python 3.12, FastAPI, deployed to Google Cloud Run
- **Database**: Firebase Firestore (session-scoped subcollections)
- **Auth**: Firebase Anonymous sign-in — no email, no password, zero friction
- **AI**: Google Gemini API (gemini-2.0-flash or later) via the Python SDK
- **Hosting**: Cloud Run (backend), Firebase Hosting or Vite dev server (frontend)
- **Type contract**: FastAPI exports `/openapi.json`; frontend types generated from it

### Session Model
- Session ID = `{cafeId}_{YYYY-MM-DD}`. One QR code per café encodes only the `cafeId`. The backend resolves today's session on every request.
- No session-level expiry. Participant Temporary Profiles expire via `availabilityExpiresAt` timestamp.

### Firestore Structure
```
/cafes/{cafeId}
/sessions/{sessionId}
  /participants/{participantId}      ← Firebase UID
  /conversation_requests/{requestId}
  /connections/{connectionId}
  /join_requests/{requestId}         ← stretch goal
```
Full field list in `docs/design-summary.md`.

### Matching Algorithm
- Participants must share ≥1 Interest to appear in anyone's browse list.
- Ranked by shared Interest count descending. Tie-broken by Intention match (same Intention = ranks higher).
- No LLM in the matching hot path. Deterministic set-intersection only.
- The algorithm runs server-side on `GET /sessions/{sessionId}/discover`.

### Gemini Integration — Two Calls Only
1. **Conversation Request Blurb** (fires on POST /requests): takes sender and recipient Interests + Intentions — no names. Returns a 2-sentence blurb shown to the recipient.
2. **Icebreaker** (fires on Connection formation): takes both names + Interests + Intentions. Returns one specific conversation starter.
- One silent retry per call. On second failure: rule-based fallback copy. Never surface an error to the user.
- Gemini output must be validated as a non-empty string before display.

### Privacy Rules (enforced backend-side)
- Names are never sent to the client until Connection is formed.
- Blocked Participant IDs are stored on each Participant document and filtered server-side.
- Firestore security rules scope each Participant's read access to their own session.

### Real-time Updates
- React frontend uses Firestore `onSnapshot` listeners for read-only real-time state: incoming requests, Connection formation, Discoverability changes of other Participants.
- All writes go through FastAPI (Cloud Run). The client never writes to Firestore directly.

### Availability and Discoverability
- Soft pause on timer expiry: `discoverability` is set to `false` automatically. The Participant stays in the session.
- Hard leave (DELETE /participants/me): Participant `status` set to `left`. Removed from all discover queries immediately.

### Interest Taxonomy (fixed — no free text)
`technology` · `AI` · `entrepreneurship` · `startups` · `travel` · `books` · `music` · `film` · `design` · `science` · `gaming` · `sustainability` · `finance` · `fitness` · `food` · `art` · `languages` · `photography` · `sports` · `education`

### API Surface
Full endpoint table in `docs/design-summary.md`. Key routes:
- `GET /cafes/{cafeId}` → café info + today's session ID
- `POST /sessions/{sessionId}/join` → create Temporary Profile
- `PUT /sessions/{sessionId}/participants/me/discoverability` → toggle
- `GET /sessions/{sessionId}/discover` → ranked browse list
- `POST /sessions/{sessionId}/requests` → send Conversation Request + trigger Gemini blurb
- `PUT /sessions/{sessionId}/requests/{requestId}/accept` → accept; forms Connection if mutual; triggers Icebreaker

## Testing Decisions

**What makes a good test**: test external behaviour at the API boundary, not internal implementation. A test should pass or fail based on what the endpoint returns to a client, not based on how Firestore documents are structured internally.

**Seam**: The FastAPI HTTP boundary is the single primary test seam. Integration tests hit the actual endpoints (with a Firestore emulator); unit tests cover the matching algorithm in isolation.

**Modules to test**:
- Matching algorithm (`get_discover_list`): pure function, unit-testable. Test that blocked participants are excluded, that results are ranked correctly, that participants with 0 shared interests don't appear.
- `POST /sessions/{sessionId}/requests`: assert that the Gemini blurb is attached to the request document and that a second request to the same recipient from the same sender is rejected.
- `PUT /sessions/{sessionId}/requests/{requestId}/accept`: assert that accepting both sides creates a Connection; assert that accepting only one side does not; assert that names are not present in the discover list response after Connection.
- `GET /sessions/{sessionId}/discover`: assert that participants with `discoverability: false` or `status: left` don't appear; assert ranking order.

**Gemini**: mock in tests. The real SDK is called only in manual/smoke tests.

## Out of Scope

- Dating functionality of any kind
- Public social feeds or following/follower systems
- Direct in-app messaging
- Event management
- Payment systems
- Café discovery, maps, or location tracking
- Complex AI-based compatibility scoring (no embeddings, no LLM for matching)
- Persistent profiles or cross-session friendships
- Voice or video features
- Community management or moderation tools
- Multiple simultaneous sessions per café
- Group matching as a first-class flow (Open Table is stretch only)

## Further Notes

- The demo scenario is two browser tabs representing two different Participants at "Café Alpha." The demo must complete the full journey (join → browse → request → accept → Connection → Icebreaker) without requiring real café customers.
- Seeding a demo café (`cafeId: cafe-alpha`, `cafeName: Café Alpha`) should be part of the setup script, not a manual step.
- The definition of done for the hackathon is in `docs/design-summary.md` (checklist at the bottom).
- ADRs for the three key architectural decisions live in `docs/adr/`. Implementation agents must read them before touching the areas they cover.
