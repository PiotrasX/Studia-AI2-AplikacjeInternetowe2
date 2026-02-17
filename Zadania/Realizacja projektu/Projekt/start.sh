#!/bin/bash
cd "$(dirname "$0")"
cd backend
if [ ! -d "node_modules" ]; then
  npm install
fi
gnome-terminal -- bash -c "node app.js; exec bash" 2>/dev/null || \
osascript -e 'tell application "Terminal" to do script "cd \"'"$(pwd)"'\" && node app.js"'
cd ..
cd frontend
if [ ! -d "node_modules" ]; then
  npm install
fi
gnome-terminal -- bash -c "npm run dev; exec bash" 2>/dev/null || \
osascript -e 'tell application "Terminal" to do script "cd \"'"$(pwd)"'\" && npm run dev"'
