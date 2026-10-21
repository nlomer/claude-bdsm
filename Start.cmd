@echo off
rem Launcher: open this clone's local panel; paths with spaces are supported.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is missing. Install Node.js 22.x, then open this again.
  pause
  exit /b 1
)
node scripts\start.mjs
if errorlevel 1 pause
