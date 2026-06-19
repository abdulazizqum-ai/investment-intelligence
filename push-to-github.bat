@echo off
title Push Investment Intelligence to GitHub
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed. Get it from https://git-scm.com/download/win
  pause
  exit /b 1
)

echo ============================================================
echo  Pushing Investment Intelligence to GitHub
echo  (your .env with the API key is ignored and NOT uploaded)
echo ============================================================
echo.

if not exist ".git" git init
git config user.email "abdulaziz.qum@gmail.com"
git config user.name "Abdulaziz Qumosani"
git add .
git commit -m "Investment Intelligence MVP (secure proxy + auto-deploy)"
git branch -M main

git remote remove origin >nul 2>nul
git remote add origin https://github.com/abdulazizqum-ai/investment-intelligence.git

echo.
echo Pushing to GitHub... a browser window may open to sign in. Approve it.
echo.
git push -u origin main

echo.
echo ============================================================
echo  If you see "Branch 'main' set up to track..." it worked.
echo  Next: connect this repo in Netlify (see chat).
echo ============================================================
pause
