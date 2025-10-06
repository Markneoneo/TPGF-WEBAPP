@echo off
title 🚀 TPGF Webapp One-Click Dev Launcher
setlocal enabledelayedexpansion
set PORT=3000

echo ==========================================
echo  🚀 Launching TPGF Webapp on http://localhost:%PORT%
echo ==========================================

:: --- Check Ruby ---
where ruby >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Ruby not found. Please install Ruby 3.4+ and ensure it's in PATH.
    echo    Download: https://rubyinstaller.org/
    pause
    exit /b
)

:: --- Check Node.js ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 24+ and ensure it's in PATH.
    echo    Download: https://nodejs.org/
    pause
    exit /b
)

:: --- Check Bundler ---
where bundle >nul 2>nul
if %errorlevel% neq 0 (
    echo 🔧 Installing Bundler...
    gem install bundler
)

:: --- Install Gems ---
echo 📦 Installing Ruby gems...
call bundle install

:: --- Check Yarn ---
where yarn >nul 2>nul
if %errorlevel% neq 0 (
    echo 🔧 Installing Yarn via npm...
    call npm install -g yarn
)

:: --- Install JS dependencies ---
echo 📦 Installing Node packages...
call yarn install

:: --- Start Rails server ---
echo 🚀 Starting Rails server on port %PORT%...
start "Rails Server" cmd /c "ruby bin\rails server -p %PORT%"

:: --- Start JS watcher ---
echo 🚀 Starting JS watcher...
start "JS Watcher" cmd /c "yarn esbuild app/javascript/*.* --bundle --sourcemap --format=esm --outdir=app/assets/builds --public-path=/assets --watch=forever"

:: --- Start Tailwind CSS watcher ---
echo 🚀 Starting Tailwind CSS watcher...
start "CSS Watcher" cmd /c "yarn tailwindcss -i ./app/assets/stylesheets/application.tailwind.css -o ./app/assets/builds/application.css --minify --watch"

:: --- Wait a moment for server to start ---
timeout /t 3 /nobreak >nul

:: --- Open browser ---
echo 🌐 Opening browser...
start "" "http://localhost:%PORT%"

echo.
echo ✅ All processes started successfully!
echo ==========================================
echo.
echo Press any key to stop all servers and exit...
pause >nul

:: --- Clean shutdown ---
echo 🛑 Stopping all dev servers...
taskkill /FI "WINDOWTITLE eq Rails Server" /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq JS Watcher" /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq CSS Watcher" /F >nul 2>nul
exit
