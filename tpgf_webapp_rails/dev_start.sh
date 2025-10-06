#!/bin/bash
# ==========================================================
# 🚀 TPGF Webapp One -Click Dev Launcher 
# ==========================================================

PORT=3000

echo "=========================================="
echo "🚀 Launching TPGF Webapp on http://localhost:$PORT"
echo "=========================================="

# --- Check Ruby ---
if ! command -v ruby >/dev/null 2>&1; then
  echo "❌ Ruby not found. Please install Ruby 3.4+ first."
  exit 1
fi

# --- Install Bundler if missing ---
if ! command -v bundle >/dev/null 2>&1; then
  echo "🔧 Installing Bundler..."
  gem install bundler
fi

# --- Install Gems ---
echo "📦 Installing Ruby gems..."
bundle install

# --- Check Yarn ---
if ! command -v yarn >/dev/null 2>&1; then
  echo "🔧 Yarn not found. Installing via npm..."
  npm install -g yarn
fi

# --- Install JS dependencies ---
echo "📦 Installing Node packages..."
yarn install

# --- Start processes manually ---
echo "🚀 Starting Rails server..."
bin/rails server -p $PORT &
RAILS_PID=$!

echo "🚀 Starting JS watcher..."
yarn esbuild app/javascript/*.* --bundle --sourcemap --format=esm --outdir=app/assets/builds --public-path=/assets --watch=forever &
JS_PID=$!

echo "🚀 Starting Tailwind CSS watcher..."
yarn tailwindcss -i ./app/assets/stylesheets/application.tailwind.css -o ./app/assets/builds/application.css --minify --watch &
CSS_PID=$!

# --- Open browser ---
echo "🌐 Opening browser..."
if command -v xdg-open >/dev/null; then
  xdg-open "http://localhost:$PORT"
elif command -v open >/dev/null; then
  open "http://localhost:$PORT"
elif command -v start >/dev/null; then
  start "http://localhost:$PORT"
else
  echo "Please open http://localhost:$PORT manually."
fi

# --- Trap Ctrl+C to terminate children ---
trap "echo '🛑 Stopping dev servers...'; kill $RAILS_PID $JS_PID $CSS_PID; exit 0" SIGINT SIGTERM

# --- Wait for all processes ---
wait $RAILS_PID $JS_PID $CSS_PID
