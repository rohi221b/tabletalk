Status: done
Blocked by: 01

# 02 — Firebase + Gemini configuration

Wire up Firebase (Firestore + Anonymous Auth) and the Gemini SDK in the backend. Seed a demo café document. Verify that the backend can read from and write to Firestore, and that a test call to Gemini returns a response.

## Acceptance criteria

- Firebase Admin SDK initialised in the backend using a service account key (from env var)
- Firebase client SDK initialised in the frontend with Anonymous sign-in working
- `POST /cafes` (admin-only) creates a café document in Firestore
- A seed script creates `cafeId: cafe-alpha`, `cafeName: Café Alpha` if it doesn't exist
- Gemini SDK initialised; a smoke-test endpoint `GET /gemini-health` calls the API and returns `{"status": "ok"}` (not exposed in production)
- All secrets sourced from environment variables — nothing hardcoded

## Notes

- Backend Firebase init: `firebase_admin.initialize_app(credentials.Certificate(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]))`
- Frontend Firebase init: use `VITE_FIREBASE_*` env vars
- Gemini model: `gemini-2.0-flash` or latest available
