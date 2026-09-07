#!/bin/bash
cd "$(dirname "$0")"

# 启动后端
echo "Starting backend on :8080..."
./canvas-server &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# 启动前端
echo "Starting frontend on :3000..."
cd web
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "Canvas is running:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://127.0.0.1:8080"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
