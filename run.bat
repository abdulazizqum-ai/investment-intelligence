@echo off
title Investment Intelligence - Dev Server
cd /d "%~dp0"

echo ============================================================
echo  Investment Intelligence - Multi-Agent System
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not on PATH.
  echo Install the LTS version from https://nodejs.org then run this file again.
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo Node.js %%v detected.
echo.

if not exist "node_modules" (
  echo Installing dependencies ^(first run only, may take a minute^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. See messages above.
    pause
    exit /b 1
  )
)

echo.
echo Freeing port 5199 if an old server is still running...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5199 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>nul

echo Starting dev server... a browser tab will open at http://localhost:5199
echo Press Ctrl+C in this window to stop.
echo.

start "" http://localhost:5199
call npm run dev

pause
