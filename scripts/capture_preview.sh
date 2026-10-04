#!/bin/bash
# Start local production server + capture all preview screenshots in one session.
set -x
cd /home/z/my-project

# Start standalone production server
DATABASE_URL="postgresql://postgres.yrnmyrthjwvstmzxkzwf:21OLu97TWJBJm1GL@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js > /tmp/next-server.log 2>&1 &
SERVER_PID=$!

# Wait for readiness
for i in $(seq 1 30); do
  if curl -s -o /dev/null --max-time 3 http://127.0.0.1:3000/; then
    echo "SERVER READY after ${i}s"
    break
  fi
  sleep 1
done

P=/home/z/my-project/download/preview
mkdir -p $P

# Homepage sections
agent-browser set viewport 1440 900
agent-browser open http://127.0.0.1:3000/ --timeout 60000
agent-browser wait 4500
agent-browser screenshot $P/01-hero.png

agent-browser scroll down 900
agent-browser wait 1200
agent-browser screenshot $P/02-mission-values.png

agent-browser scroll down 900
agent-browser wait 1200
agent-browser screenshot $P/03-portfolio.png

agent-browser scroll down 1000
agent-browser wait 1200
agent-browser screenshot $P/04-services-dark.png

agent-browser scroll down 1000
agent-browser wait 1200
agent-browser screenshot $P/05-team.png

agent-browser scroll down 1000
agent-browser wait 1200
agent-browser screenshot $P/06-testimonials-pricing.png

agent-browser scroll down 1100
agent-browser wait 1200
agent-browser screenshot $P/07-pricing-plans.png

agent-browser scroll down 1100
agent-browser wait 1200
agent-browser screenshot $P/08-partners-contact.png

agent-browser scroll down 1200
agent-browser wait 1500
agent-browser screenshot $P/09-footer.png

# Inner pages
agent-browser open http://127.0.0.1:3000/services --timeout 60000
agent-browser wait 2500
agent-browser screenshot $P/10-services-page.png

agent-browser open http://127.0.0.1:3000/portfolio --timeout 60000
agent-browser wait 2500
agent-browser screenshot $P/11-portfolio-page.png

agent-browser open http://127.0.0.1:3000/contact --timeout 60000
agent-browser wait 2500
agent-browser screenshot $P/12-contact-page.png

# Admin login (just to show it's intact)
agent-browser open http://127.0.0.1:3000/admin/login --timeout 60000
agent-browser wait 2500
agent-browser screenshot $P/13-admin-login.png

kill $SERVER_PID 2>/dev/null
echo "ALL SCREENSHOTS DONE"
ls -la $P/
