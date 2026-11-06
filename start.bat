@echo off
echo Starting Queue Management System...
start "Backend Server" cmd /k "cd /d "%~dp0backend" && npm start"
timeout /t 3 /nobreak >nul
start "Frontend Server" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 2 /nobreak >nul
start http://localhost:3000
echo Queue Management System is running!

