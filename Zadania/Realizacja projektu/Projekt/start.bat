@echo off
cd /d "%~dp0"
cd backend
if not exist node_modules (
    call npm install
)
start "BACKEND" cmd /k "cd /d %cd% && node app.js"
cd ..
cd frontend
if not exist node_modules (
    call npm install
)
start "FRONTEND" cmd /k "cd /d %cd% && npm run dev"
pause
