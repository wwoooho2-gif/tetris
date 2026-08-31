@echo off
setlocal

set "GAME_DIR=%~dp0tetris"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Downloading the LTS installer...
  powershell -ExecutionPolicy Bypass -NoProfile -Command "Invoke-WebRequest -Uri https://nodejs.org/dist/latest-v20.x/node-v20.18.0-x64.msi -OutFile "%TEMP%\node-v20.18.0-x64.msi"; Start-Process msiexec.exe -Wait -ArgumentList '/i "%TEMP%\node-v20.18.0-x64.msi" /quiet'"
  if errorlevel 1 (
    echo Failed to install Node.js automatically.
    echo Please install Node.js manually from https://nodejs.org
    pause
    exit /b 1
  )
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not available even after the Node install attempt.
  echo Please install Node.js manually from https://nodejs.org
  pause
  exit /b 1
)

if not exist "%GAME_DIR%\package.json" (
  echo Could not find the game folder or package.json.
  echo Expected location: "%GAME_DIR%"
  echo Make sure the game files are in a folder named "tetris" beside this script.
  pause
  exit /b 1
)

cd /d "%GAME_DIR%"
echo Installing dependencies for FISH THAT STUFF - Tetris...
call npm install --no-fund --no-audit
if errorlevel 1 (
  echo Dependency install failed.
  pause
  exit /b %errorlevel%
)

echo.
echo Downloading Electron binary (this may take a moment)...
timeout /t 3 /nobreak >nul 2>&1

echo.
echo Setup complete!
echo Run run.bat to start the game.
echo.
pause
