Status: done
Blocked by: 08

# 09 — Open Table (stretch goal)

Implement the group expansion feature: after forming a Connection, the pair can open their table, making it visible to others who can send a Join Request. All current members must unanimously accept before the third Participant joins.

## Acceptance criteria

- `PUT /sessions/{sessionId}/connections/{connectionId}/open-table` sets `isOpenTable: true` on the Connection
- `GET /sessions/{sessionId}/discover` includes Open Tables in the response (alongside individual Participants), clearly distinguished as "open tables" with their members' Interests shown (no names)
- `POST /sessions/{sessionId}/connections/{connectionId}/join-requests` creates a `join_requests` document with `status: pending` and `acceptedByIds: []`
- All current members see the Join Request via Firestore `onSnapshot`
- `PUT /sessions/{sessionId}/connections/{connectionId}/join-requests/{requestId}/vote` body: `{ vote: "accept" | "decline" }`
  - On accept: adds the voter's UID to `acceptedByIds`
  - When `acceptedByIds.length == participantIds.length` (unanimous): sets `status: accepted` and adds the requesting Participant to `connections/{connectionId}.participantIds`
  - On any decline: sets `status: declined` — the request is silently dismissed
- Frontend: after Connection, show an "Open our table" toggle
- Frontend: Open Tables appear in the browse list with a distinct visual treatment
- Frontend: members see incoming Join Requests with accept/decline actions

## Notes

- This ticket is deliberately last — it must not block the hackathon definition of done
- Skip if time does not permit; the product is complete without it
