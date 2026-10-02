#!/bin/bash
# QASADAN dev-server keepalive supervisor.
# The sandbox occasionally reaps the detached dev server; this loop detects
# downtime and relaunches .zscripts/dev.sh automatically.
cd /home/z/my-project
LOCK=.zscripts/dev.lock
touch .zscripts/keepalive.log

while true; do
  if curl -s -o /dev/null --max-time 5 http://localhost:3000/; then
    # server healthy
    sleep 10
    continue
  fi

  # Server not responding. If a dev.sh instance is alive, give it time to boot.
  if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
    sleep 10
    continue
  fi

  echo "[$(date '+%F %T')] dev server down — restarting" >> .zscripts/keepalive.log

  # Clean up leftover processes (patterns cannot match this supervisor's cmdline)
  for pid in $(pgrep -f "next dev -p 3000" 2>/dev/null); do kill "$pid" 2>/dev/null; done
  sleep 1
  for pid in $(pgrep -x "next-server" 2>/dev/null); do kill "$pid" 2>/dev/null; done
  for pid in $(pgrep -f "zscripts/dev.sh" 2>/dev/null); do
    [ "$pid" != "$$" ] && kill "$pid" 2>/dev/null
  done
  sleep 2

  setsid bash .zscripts/dev.sh >> .zscripts/dev-restart.log 2>&1 &
  echo $! > "$LOCK"
  sleep 30
done
