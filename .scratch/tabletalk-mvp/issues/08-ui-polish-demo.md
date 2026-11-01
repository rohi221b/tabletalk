Status: done
Blocked by: 07

# 08 — UI polish + demo setup

Polish the full user journey for a demo-ready experience. Ensure the two-browser-tab demo scenario works end-to-end without manual steps. Write the setup + demo runbook.

## Acceptance criteria

- All screens have consistent styling: warm café aesthetic, mobile-first layout, clear typography
- Interest chips are visually distinct: shared interests highlighted in a warm accent colour on browse cards
- Loading states on every async action (joining, sending a request, waiting for Connection)
- Empty state on the Discover screen when no compatible Participants are present
- Connection screen feels like a celebration moment — names revealed with a clear visual transition
- Demo seed script: creates `cafe-alpha` café if absent; documented in README
- `README.md` includes a step-by-step demo runbook:
  1. Start backend + frontend
  2. Open Browser A → scan/navigate to `/join/cafe-alpha`
  3. Create Profile A (technology, startups, travel · discuss topics · 30 min)
  4. Toggle Discoverability ON
  5. Open Browser B → same URL
  6. Create Profile B (AI, entrepreneurship, technology · professional networking · 30 min)
  7. Toggle Discoverability ON
  8. Browser A: see Browser B in list — tap "I'd like to talk"
  9. Browser B: receive request notification — accept
  10. Browser A: accept (or already accepted) → Connection screen appears in both
  11. Both see names + Icebreaker
- All demo steps completable without touching the database manually

## Notes

- No group/Open Table UI in this ticket — that is ticket 09 (stretch)
- Gemini failures during the demo must be invisible to the audience — verify fallback copy reads naturally
