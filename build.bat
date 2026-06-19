@echo off
title Investment Intelligence - Production Build
cd /d "%~dp0"

echo ============================================================
echo  Building Investment Intelligence for deployment (Netlify)
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install from https://nodejs.org then retry.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies first...
  call npm install
)

echo Building production site into the "dist" folder...
echo (full output is also saved to build-log.txt)
call npx vite build > build-log.txt 2>&1
if errorlevel 1 (
  echo.
  echo [ERROR] Build failed. Opening build-log.txt ...
  type build-log.txt
  start "" notepad "%~dp0build-log.txt"
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  Build complete.
echo  1) The "dist" folder window will open.
echo  2) The Netlify Drop page will open in your browser.
echo  3) Drag the ENTIRE "dist" folder onto the drop area.
echo ============================================================
echo.

start "" "%~dp0dist"
start "" https://app.netlify.com/drop
pause
