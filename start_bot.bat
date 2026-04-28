@echo off
echo ==========================================
echo   NexaBank Virtual Assistant - Starting
echo ==========================================
echo.

cd /d "%~dp0"

REM Activate virtual environment
call .\venv\Scripts\activate

REM Start Rasa server in background
echo [1/2] Starting Rasa server...
start "Rasa Server" cmd /k ".\venv\Scripts\activate && rasa run --enable-api --cors \"*\" --debug"

REM Wait for Rasa to start
echo Waiting for Rasa to start (30 seconds)...
timeout /t 30 /nobreak > nul

REM Start Flask web server
echo [2/2] Starting Web UI...
echo.
echo ==========================================
echo   NexaBank is ready!
echo   User Portal : http://localhost:5000
echo   Admin Panel : http://localhost:5000/admin
echo ------------------------------------------
echo   User login  : user / user123
echo   Admin login : admin / admin123
echo ==========================================
echo.
python app.py
