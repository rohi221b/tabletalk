# ☕ TableTalk MVP

An AI-powered café companion that connects solo café customers who share common interests, using deterministic matching and Google Gemini for personalized conversation blurbs and icebreakers.

---

## 🚀 Quick Start (One Command)

To start both the FastAPI backend and React frontend concurrently:

```bash
./run_demo.sh
```

Or start them individually:

### Backend (FastAPI)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```
Interactive API docs available at: `http://localhost:8000/docs`

### Frontend (React + Vite + TypeScript)
```bash
cd frontend
npm install
npm run dev
```
Web app available at: `http://localhost:5173`

---

## 👥 Two-Tab Demo Scenario

To test the complete user journey locally without needing two physical phones:

1. **Tab 1 (Alice)**:
   - Open [http://localhost:5173/join/cafe-alpha](http://localhost:5173/join/cafe-alpha) in your regular browser.
   - Enter nickname **Alice**, select 3 interests (e.g., `AI`, `technology`, `startups`), set format to `1-on-1`, and join.
   - Toggle **Discoverability ON** in the header.

2. **Tab 2 (Bob)**:
   - Open [http://localhost:5173/join/cafe-alpha](http://localhost:5173/join/cafe-alpha) in an **Incognito / Private Window**.
   - Enter nickname **Bob**, select shared interests (e.g., `technology`, `startups`, `travel`), and join.
   - Toggle **Discoverability ON** in the header.

3. **Discovery & Connection**:
   - In Alice's tab, Bob appears in the **Discover** list ranked with **★ 2 shared interests** (his name is kept hidden for privacy).
   - Alice clicks **💬 I'd like to talk**.
   - Gemini generates a personalized match blurb shown to Bob.
   - In Bob's tab, a modal pops up showing the blurb and shared interests.
   - Bob clicks **☕ Accept & Connect**.
   - **Connection formed!** Names are revealed (**Meet Bob** / **Meet Alice**) and a tailored **Gemini Icebreaker** appears to start their conversation!
   - (Optional): Tap **Open Table** to open the table for a 3rd guest.

---

## 🧪 Testing

Run all unit and end-to-end integration tests:

```bash
backend/.venv/bin/pytest backend/test_matching.py backend/test_api.py -v
```

All 9 tests pass covering:
- Pure deterministic matching algorithm & ranking
- Bidirectional blocking
- Privacy: names hidden until mutual connection
- Soft pause on availability expiry
- Conversation request & acceptance lifecycle
- Silent decline & blocking

---

## 🔑 Environment Variables (Optional)

In `backend/.env`:
```env
PORT=8000
GEMINI_API_KEY=your_gemini_api_key
DEV_MODE=true
```
*(If no Gemini API key is provided, TableTalk falls back seamlessly to rule-based fallback blurbs and icebreakers so the demo never breaks.)*
