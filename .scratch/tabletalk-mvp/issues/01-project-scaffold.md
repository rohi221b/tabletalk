Status: done
Blocked by: (none)

# 01 — Project scaffold

Set up the monorepo structure with a `/frontend` (React + TypeScript + Vite) and `/backend` (Python FastAPI) directory. Configure environment variable handling for both. No business logic yet — just a working "hello world" from each service, with the frontend able to reach the backend.

## Acceptance criteria

- `cd frontend && npm run dev` serves a React app on localhost
- `cd backend && uvicorn main:app --reload` serves FastAPI with a `/health` endpoint returning `{"status": "ok"}`
- Frontend can call `GET /health` and display the response
- `.env.example` files exist for both services documenting required variables
- `README.md` at repo root explains how to run both services locally

## Notes

- Frontend: `npm create vite@latest frontend -- --template react-ts`
- Backend: `pip install fastapi uvicorn google-cloud-firestore firebase-admin google-generativeai python-dotenv`
- Do NOT configure Firebase or Gemini yet — that's ticket 02
