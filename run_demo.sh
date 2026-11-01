#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "=========================================================="
echo "☕ Starting TableTalk MVP Local Dev Environment"
echo "=========================================================="

# Check backend venv
if [ ! -d "$DIR/backend/.venv" ]; then
    echo "Creating Python virtualenv..."
    python3 -m venv "$DIR/backend/.venv"
    "$DIR/backend/.venv/bin/pip" install -r "$DIR/backend/requirements.txt"
fi

# Function to clean up on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT

echo "1. Starting FastAPI backend on http://localhost:8000..."
cd "$DIR/backend"
.venv/bin/uvicorn main:app --port 8000 --reload &
BACKEND_PID=$!

echo "2. Starting Vite frontend on http://localhost:5173..."
cd "$DIR/frontend"
npm run dev -- --port 5173 &
FRONTEND_PID=$!

sleep 2

echo ""
echo "=========================================================="
echo "🎉 TableTalk is LIVE!"
echo "=========================================================="
echo "Open these two URLs to test the live matching flow:"
echo ""
echo "  Participant 1 (Alice):  http://localhost:5173/join/cafe-alpha"
echo "  Participant 2 (Bob):    http://localhost:5173/join/cafe-alpha (in incognito window)"
echo ""
echo "  Backend API Docs:       http://localhost:8000/docs"
echo "=========================================================="
echo "Press Ctrl+C to stop both servers."

wait
