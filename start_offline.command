#!/bin/bash
# Starts ED Doc on localhost only (127.0.0.1:8080) with the security headers applied.
cd "$(dirname "$0")" || exit 1
PORT=8080
python3 scripts/serve_offline.py --port "$PORT" &
SERVER_PID=$!
sleep 1
open "http://localhost:$PORT/index.html"

echo "Press Ctrl+C to stop the server."
trap "kill $SERVER_PID 2>/dev/null" EXIT
wait $SERVER_PID
