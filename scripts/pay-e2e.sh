#!/bin/bash
# Phase 1 Payment Provider Management — E2E re-test in current sandbox
set -x
cd /home/z/my-project
P=/home/z/my-project/download/preview

# 1) Login fresh
agent-browser set viewport 1440 900
agent-browser open http://127.0.0.1:3000/admin/login --timeout 60000
agent-browser wait 2000
agent-browser fill 'input[type="email"]' admin@qasadan.com
agent-browser fill 'input[type="password"]' QasadanAdmin2026!
agent-browser click 'button[type="submit"]'
agent-browser wait --url "**/admin**" || true
agent-browser wait 2500

# 2) Providers page
agent-browser open http://127.0.0.1:3000/admin/settings/payment-providers --timeout 60000
agent-browser wait --text "WAAFI Pay" || true
agent-browser wait 1500
agent-browser screenshot $P/pay-e2e-01-providers.png

# 3) Test Connection via aria-label (button has aria-label)
agent-browser click '[aria-label="Test connection for WAAFI Pay"]'
agent-browser wait 12000
agent-browser screenshot $P/pay-e2e-02-test-result.png

# 4) Snapshot to get refs for other buttons
agent-browser snapshot -i --json > /tmp/pay-snap.json 2>/dev/null || agent-browser snapshot > /tmp/pay-snap.txt
cat /tmp/pay-snap.txt 2>/dev/null | head -60 || head -c 3000 /tmp/pay-snap.json

echo "PHASE1-E2E-PART1-DONE"
