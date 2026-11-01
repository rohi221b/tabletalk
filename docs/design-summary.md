# TableTalk — Design Summary

> Output of the `/grill-with-docs` session on 2026-11-01.
> All decisions below are settled. Hand this document to the implementation agent alongside `GLOSSARY.md` and `docs/adr/`.

---

## Settled Decisions at a Glance

| # | Decision | Choice |
|---|---|---|
| Q1 | Session model | One QR per café; session ID = `{cafeId}_{YYYY-MM-DD}` |
| Q2 | Discoverability opt-in | Explicit Availability toggle — not implicit |
| Q3 | Discovery UX | User browses ranked list; algo ranks, human chooses |
| Q4 | Rejection | Silent + bidirectional block for the session |
| Q5 | Gemini calls | 2: request blurb (pre-acceptance) + icebreaker (post-Connection) |
| Q6 | Stack | React/TS frontend · FastAPI/Python backend · Firestore · Cloud Run · Gemini |
| Q7 | Backend language | Python (FastAPI) |
| Q8 | Auth | Firebase Anonymous sign-in |
| Q9 | Request timeout | Tied to target's Discoverability — auto-expires when they go unavailable |
| Q10 | Rejection block | Bidirectional — neither sees the other again this session |
| Q11 | Timer expiry | Soft pause — Discoverability off, nudge to re-enable, no re-onboarding |
| Q12 | Gemini failure | One silent retry → rule-based fallback copy |
| Q13 | Session reset | Daily rotation via `{cafeId}_{YYYY-MM-DD}` |
| Q14 | Firestore shape | Session-scoped subcollections |
| Q15 | Matching algorithm | ≥1 shared interest to appear; ranked by count; same Intention = tie-breaker |
| Q16 | Gemini Prompt 1 input | Interests + Intentions only — no names |
| Q17 | Gemini Prompt 2 input | Names + Interests + Intentions |
| Q18 | Interest taxonomy | Fixed ~20 tags — no free text |
| Q19 | Group model | 1:1 Connection first → optional Open Table (stretch goal) |
| Q20 | Browse list privacy | Interests + Intention only — name hidden until Connection |
| Q21 | Join request acceptance | Unanimous — all current table members must accept |

---

## User Flow

```
Scan QR
  └─► Join session (anonymous auth)
        └─► Create Temporary Profile
              (nickname · 3-5 Interests · Intention · Availability Window)
                └─► Toggle Discoverability ON
                      └─► Browse ranked list
                            (sorted by shared Interest count · names hidden)
                              └─► Tap "I'd like to talk"
                                    └─► Conversation Request sent
                                          (Gemini blurb generated for recipient)
                                            ├─► Recipient declines → silent bidirectional block
                                            └─► Recipient accepts
                                                  └─► CONNECTION
                                                        (names revealed · Icebreaker generated)
                                                          └─► [Stretch] Open Table
                                                                └─► Join Request from 3rd Participant
                                                                      └─► Unanimous accept → joins
```

---

## Firestore Collection Structure

```
/cafes/{cafeId}
  - cafeName: string
  - createdAt: timestamp

/sessions/{sessionId}                       # sessionId = {cafeId}_{YYYY-MM-DD}
  - cafeId: string
  - cafeName: string
  - date: string                            # YYYY-MM-DD

  /participants/{participantId}             # participantId = Firebase UID
    - userId: string
    - nickname: string
    - interests: string[]
    - intention: enum                       # make_friends | professional_networking
                                            #   | discuss_topics | activity_partner
    - preferredFormat: enum                 # one_to_one | small_group | either
    - availabilityMinutes: 15 | 30 | 60
    - availabilityExpiresAt: timestamp
    - discoverability: boolean
    - blockedParticipantIds: string[]
    - status: "active" | "paused" | "left"
    - joinedAt: timestamp

  /conversation_requests/{requestId}
    - fromParticipantId: string
    - toParticipantId: string
    - status: "pending" | "accepted" | "declined"
    - geminiBlurb: string
    - geminiBlurbFallback: boolean
    - createdAt: timestamp

  /connections/{connectionId}
    - participantIds: string[]              # length 2 for 1:1; grows with group joins (stretch)
    - icebreaker: string
    - icebreakerFallback: boolean
    - isOpenTable: boolean                  # false by default
    - connectedAt: timestamp

  /join_requests/{requestId}               # stretch goal
    - connectionId: string
    - requestingParticipantId: string
    - acceptedByIds: string[]
    - status: "pending" | "accepted" | "declined"
    - createdAt: timestamp
```

---

## API Endpoints (FastAPI / Cloud Run)

### Cafés
| Method | Path | Description |
|---|---|---|
| `GET` | `/cafes/{cafeId}` | Get café info + resolve today's session ID |
| `POST` | `/cafes` | Create café (admin/demo seeding) |

### Session & Profile
| Method | Path | Description |
|---|---|---|
| `POST` | `/sessions/{sessionId}/join` | Create Temporary Profile; requires Firebase ID token |
| `GET` | `/sessions/{sessionId}/participants/me` | Get own profile |
| `PUT` | `/sessions/{sessionId}/participants/me` | Update profile |
| `PUT` | `/sessions/{sessionId}/participants/me/discoverability` | Toggle on/off |
| `DELETE` | `/sessions/{sessionId}/participants/me` | Leave session |

### Discover
| Method | Path | Description |
|---|---|---|
| `GET` | `/sessions/{sessionId}/discover` | Ranked list of Discoverable Participants |

### Conversation Requests
| Method | Path | Description |
|---|---|---|
| `POST` | `/sessions/{sessionId}/requests` | Send request; triggers Gemini blurb |
| `GET` | `/sessions/{sessionId}/requests/incoming` | Incoming pending requests |
| `PUT` | `/sessions/{sessionId}/requests/{requestId}/accept` | Accept; creates Connection if mutual |
| `PUT` | `/sessions/{sessionId}/requests/{requestId}/decline` | Decline; adds bidirectional block |

### Connections
| Method | Path | Description |
|---|---|---|
| `GET` | `/sessions/{sessionId}/connections` | My active Connections |
| `PUT` | `/sessions/{sessionId}/connections/{connectionId}/open-table` | *(stretch)* Open table |

### Join Requests *(stretch)*
| Method | Path | Description |
|---|---|---|
| `POST` | `/sessions/{sessionId}/connections/{connectionId}/join-requests` | Send Join Request |
| `PUT` | `/sessions/{sessionId}/connections/{connectionId}/join-requests/{requestId}/vote` | Vote accept/decline |

---

## Gemini Integration

### Prompt 1 — Conversation Request Blurb
Fires when a Conversation Request is sent. Shown to the recipient.

**Input:**
```json
{
  "sender_interests": ["technology", "startups", "travel"],
  "recipient_interests": ["AI", "entrepreneurship", "technology"],
  "shared_interests": ["technology"],
  "sender_intention": "discuss_topics",
  "recipient_intention": "professional_networking"
}
```
**Output:** `{ "blurb": "string (max 2 sentences)" }`
**Fallback:** `"You both share an interest in [shared_interests]. This could be a great conversation."`

### Prompt 2 — Icebreaker
Fires once on Connection formation.

**Input:**
```json
{
  "participant_a_name": "Rohit",
  "participant_a_interests": ["technology", "startups", "travel"],
  "participant_a_intention": "discuss_topics",
  "participant_b_name": "Alex",
  "participant_b_interests": ["AI", "entrepreneurship", "technology"],
  "participant_b_intention": "professional_networking",
  "shared_interests": ["technology"]
}
```
**Output:** `{ "icebreaker": "string (one sentence)" }`
**Fallback:** `"Ask [name] what they think about [shared_interest] — you both chose it."`

**Error policy for both:** one silent retry → fallback. Never surface an error to the user.

---

## Interest Taxonomy (fixed)

`technology` · `AI` · `entrepreneurship` · `startups` · `travel` · `books` · `music` · `film` · `design` · `science` · `gaming` · `sustainability` · `finance` · `fitness` · `food` · `art` · `languages` · `photography` · `sports` · `education`

---

## Matching Algorithm

```python
def get_discover_list(session_id, requesting_participant):
    candidates = get_discoverable_participants(session_id)
    candidates = [p for p in candidates if p.id != requesting_participant.id]
    candidates = [p for p in candidates if p.id not in requesting_participant.blockedParticipantIds]
    candidates = [p for p in candidates if shared_interests(p, requesting_participant)]

    def rank_key(p):
        shared = len(shared_interests(p, requesting_participant))
        intention_match = 1 if p.intention == requesting_participant.intention else 0
        return (shared, intention_match)

    return sorted(candidates, key=rank_key, reverse=True)
```

---

## Real-time Updates

React frontend subscribes via Firestore SDK (`onSnapshot`) for:
- Incoming Conversation Requests
- Connection state changes
- Participant discoverability changes (removes them from browse list live)
- Open Table state (stretch)

All **writes** route through FastAPI (Cloud Run). Clients never write Firestore directly.

---

## Security Rules Shape

```
/sessions/{sessionId}/participants/{participantId}
  read:  requester is an active participant in this session
  write: backend service account only

/sessions/{sessionId}/conversation_requests/{requestId}
  read:  requester is sender or recipient
  write: backend service account only

/sessions/{sessionId}/connections/{connectionId}
  read:  requester is a member of participantIds
  write: backend service account only
```

---

## Hackathon Definition of Done

- [ ] Two users join the same café session (different browsers)
- [ ] Both create Temporary Profiles with Interests + Intention
- [ ] Both toggle Discoverability on
- [ ] Each sees the other in the ranked browse list (names hidden)
- [ ] User A sends a Conversation Request; User B receives it with Gemini blurb
- [ ] One-sided acceptance reveals nothing to the other party
- [ ] User B accepts; Connection forms; both see names + Icebreaker
- [ ] Gemini failure falls back to template copy without breaking the demo
- [ ] User can toggle Discoverability off or leave at any time

### Stretch (time permitting)
- [ ] Connected pair opens their table
- [ ] Third user sees Open Table and sends a Join Request
- [ ] Both members accept; third user joins the conversation

---

## Document Index

| File | Purpose |
|---|---|
| `GLOSSARY.md` | Canonical domain vocabulary |
| `docs/adr/0001-python-fastapi-backend.md` | Why Python over Node.js |
| `docs/adr/0002-deterministic-matching.md` | Why no LLM in the matching hot path |
| `docs/adr/0003-user-browse-discovery.md` | Why browse-over-push |
