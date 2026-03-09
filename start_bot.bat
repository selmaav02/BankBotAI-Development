@echo off
echo Starting Rasa Action Server and Rasa Shell...
echo.

REM Start action server in background
start "Rasa Action Server" cmd /k "cd /d %~dp0 && .\venv\Scripts\activate && python -m rasa_sdk --actions actions"

REM Wait for action server to start
timeout /t 5 /nobreak > nul

REM Start rasa shell in this window
call .\venv\Scripts\activate
rasa shell
