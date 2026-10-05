#!/bin/bash
# Phase 1 re-verification after sandbox restart:
# 1. Footer at desktop + narrow widths (compare with approved design)
# 2. Phase 1 payment providers E2E (login -> providers -> test connection -> activate)
set -x
cd /home/z/my-project
P=/home/z/my-project/download/preview
mkdir -p $P

### 1) FOOTER — desktop 1440px (the approved layout) ###
agent-browser set viewport 1440 900
agent-browser open http://127.0.0.1:3000/ --timeout 60000
agent-browser wait 3000
agent-browser scroll down 4800
agent-browser wait 800
agent-browser scroll down 4800
agent-browser wait 800
agent-browser scroll down 4800
agent-browser wait 1500
agent-browser screenshot $P/verify-01-footer-desktop.png

### 2) FOOTER — narrow 420px (what the preview panel shows: responsive stacking) ###
agent-browser set viewport 420 900
agent-browser open http://127.0.0.1:3000/ --timeout 60000
agent-browser wait 3000
agent-browser scroll down 6000
agent-browser wait 800
agent-browser scroll down 6000
agent-browser wait 800
agent-browser scroll down 6000
agent-browser wait 800
agent-browser scroll down 6000
agent-browser wait 1500
agent-browser screenshot $P/verify-02-footer-narrow.png

### 3) PHASE 1 E2E — admin login ###
agent-browser set viewport 1440 900
agent-browser open http://127.0.0.1:3000/admin/login --timeout 60000
agent-browser wait 2000
agent-browser screenshot $P/verify-03-login.png
agent-browser fill 'input[type="email"]' admin@qasadan.com
agent-browser fill 'input[type="password"]' QasadanAdmin2026!
agent-browser click 'button[type="submit"]'
agent-browser wait 3000
agent-browser screenshot $P/verify-04-after-login.png

### 4) Payment providers page ###
agent-browser open http://127.0.0.1:3000/admin/settings/payment-providers --timeout 60000
agent-browser wait 2500
agent-browser screenshot $P/verify-05-providers-page.png

### 5) Test Connection (dummy creds -> expect clean failure report) ###
agent-browser click 'text=Test Connection'
agent-browser wait 9000
agent-browser screenshot $P/verify-06-test-connection.png

### 6) Toggle Activate/Disable ###
agent-browser click 'text=Disable'
agent-browser wait 2500
agent-browser screenshot $P/verify-07-disabled.png
agent-browser click 'text=Activate'
agent-browser wait 2500
agent-browser screenshot $P/verify-08-reactivated.png

### 7) Public homepage sanity at the end ###
agent-browser open http://127.0.0.1:3000/ --timeout 60000
agent-browser wait 2500
agent-browser screenshot $P/verify-09-home-final.png

echo "VERIFICATION DONE"
