# Deterministic matching; Gemini for copy only

The matching engine uses a simple set-intersection rule (≥ 2 shared interests from a fixed taxonomy, tie-broken by intention match) rather than an LLM or embedding-based similarity model. Gemini is invoked only to generate the match card blurb and the post-connection icebreaker — never to decide whether two Participants are compatible.

## Considered Options

- **LLM-based matching**: pass profiles to Gemini and ask it to score compatibility. Flexible, but adds latency to every match cycle, makes the scoring opaque and non-reproducible, and introduces a hard dependency on API availability in the matching hot path.
- **Embedding similarity**: embed interest tags and compute cosine distance. More nuanced than set intersection but requires a vector index and an embedding call per Participant join — significant setup cost for a hackathon.
- **Deterministic set intersection** (chosen): O(n) per candidate, zero API calls, fully explainable ("you both chose technology and startups"), and reliable under demo conditions.

## Consequences

The match logic is simple enough to whiteboard in 30 seconds, which is an asset during a live demo. If interest coverage grows beyond ~20 tags, revisit embedding similarity. Gemini's role is deliberately scoped to language generation, not decision-making.
