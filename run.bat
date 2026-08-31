@echo off
setlocal enabledelayedexpansion

set "GAME_DIR=%~dp0tetris"
set "SETUP=%~dp0setup.bat"

REM Check if node_modules exists
if not exist "%GAME_DIR%\node_modules" (
  echo Installing dependencies...
  call "%SETUP%"
  if errorlevel 1 (
    echo Setup failed. Please run setup.bat manually.
    pause
    exit /b 1
  )
)

REM Launch the game using the Electron executable directly
if exist "%GAME_DIR%\node_modules\electron\dist\electron.exe" (
  start "" "%GAME_DIR%\node_modules\electron\dist\electron.exe" --no-sandbox "%GAME_DIR%"
  exit /b 0
)

REM Fallback: use npx
cd /d "%GAME_DIR%"
start "" npx electron . --no-sandbox
exit /b 0
