@echo off
echo ========================================
echo   MediRemind - Starting Application (WEB MODE)
echo ========================================
echo.

:: Setup backend
echo [1/4] Checking Python virtual environment...
cd /d "%~dp0backend"
if not exist venv (
    python -m venv venv
)

echo [2/4] Verifying dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet

echo [3/4] Starting backend server on port 8001...
start "MediRemind Backend" cmd.exe /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo [4/4] Starting frontend...
cd /d "%~dp0frontend"
start "MediRemind Frontend" cmd.exe /k "cd /d "%~dp0frontend" && npx expo start --web --clear"

echo.
echo ========================================
echo   Both servers are starting!
echo   Backend:  http://localhost:8001
echo   Frontend: Opening in your web browser
echo ========================================
pause
