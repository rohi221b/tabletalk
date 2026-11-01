# User-browse discovery over algorithm-push

Participants browse a ranked list of other Discoverable Participants and initiate contact themselves, rather than receiving a single algorithm-pushed Match Suggestion. The algorithm still runs — it ranks the list by shared Interest count — but the final choice of who to approach belongs to the user.

## Considered Options

- **Algorithm-push (original design)**: the backend selects one best candidate and surfaces them as a Match Suggestion. Simpler state machine; removes user agency.
- **User-browse with ranked list** (chosen): the backend returns all Discoverable Participants in the session sorted by shared Interest count (≥ 1 shared interest to appear). The user taps whoever they want to send a Conversation Request to.

## Why this fits the product better

The original push model optimised for the algorithm's confidence. Browse optimises for the user's intuition — which is more honest for spontaneous social discovery. A person might pick someone with fewer shared interests because something else about their profile feels right. The algorithm informs; it doesn't decide.

## Consequences

The "Discover" screen becomes a browse list, not a single card. A new first-class entity — the Conversation Request — replaces the implicit Match Suggestion. The mutual-acceptance privacy rule is preserved: names are not shown on the browse list, only Interests and Intention. Name reveal still happens only after both parties accept.
