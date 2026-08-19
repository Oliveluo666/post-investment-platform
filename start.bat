@echo off
cd /d "%~dp0"
echo Installing dependencies...
call npm install --no-audit --no-fund
echo Starting dev server...
call npm run dev
pause
