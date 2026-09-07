@echo off
cd /d "%~dp0"

echo Starting backend on :8080...
start "canvas-backend" canvas-server.exe

echo Starting frontend on :3000...
cd web
start "canvas-frontend" npm run dev

echo.
echo Canvas is running:
echo   Frontend: http://localhost:3000
echo   Backend:  http://127.0.0.1:8080
echo.
pause
