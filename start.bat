@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set DEMO=0
if not exist ".env" (
  if exist ".env.example" copy ".env.example" ".env" >/dev/null
  set DEMO=1
) else (
  findstr /C:"your-cloudbase-env-id" ".env" >/dev/null
  if not errorlevel 1 set DEMO=1
)

if "!DEMO!"=="1" (
  set VITE_DEMO_MODE=true
  echo.
  echo ============================================================
  echo  DEMO MODE ENABLED - NO ACCOUNT OR PASSWORD REQUIRED.
  echo  On the login page, click the demo entry button.
  echo ============================================================
  echo.
)

echo Installing dependencies...
call npm install --no-audit --no-fund

echo.
echo Starting dev server...
call npm run dev
pause
