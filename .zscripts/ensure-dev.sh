#!/bin/bash
# Ensures the dev server (and its keepalive) are running.
# Usage: bash .zscripts/ensure-dev.sh [wait-seconds]
cd /home/z/my-project
WAIT="${1:-0}"

launch_all() {
  # clean leftovers
  for pid in $(pgrep -f "next dev -p 3000" 2>/dev/null); do kill "$pid" 2>/dev/null; done
  for pid in $(pgrep -x "next-server" 2>/dev/null); do kill "$pid" 2>/dev/null; done
  sleep 1
  setsid bash .zscripts/dev.sh >> .zscripts/dev-restart.log 2>&1 &
  echo $! > .zscripts/dev.lock
  setsid nohup bash .zscripts/keepalive.sh > /dev/null 2>&1 < /dev/null &
  disown -a 2>/dev/null
}

if ! curl -s -o /dev/null --max-time 4 http://localhost:3000/; then
  launch_all
fi

# wait for readiness
if [ "$WAIT" != "0" ]; then
  for i in $(seq 1 "$WAIT"); do
    if curl -s -o /dev/null --max-time 3 http://localhost:3000/; then
      echo "DEV SERVER READY (${i}s)"
      exit 0
    fi
    sleep 1
  done
  echo "TIMEOUT waiting for dev server"
  exit 1
fi
echo "OK"
