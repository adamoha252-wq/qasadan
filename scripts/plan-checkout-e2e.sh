#!/usr/bin/env bash
#
# E2E — Public Plan Checkout (pricing "Choose Plan" → mobile payment)
#
# Covers:
#  1. Homepage pricing card button → /checkout/<planId> href
#  2. Plan checkout page: summary, payment-methods strip (public visibility),
#     details form; bogus plan id → 404
#  3. POST /api/checkout/plan: validation 400s, bogus plan 404, garbage body
#  4. Valid orders → 201 token; invoice created PENDING with server-side
#     parsed amount/currency ("$150" → 150.00 USD), projectService "<Plan> Plan"
#  5. /pay/<token> shows the checkout panel: provider + MOBILE WALLET method
#  6. Zero-trust: request body never carries money values (implicit — schema)
#  7. Privacy: no email / credentials / plan-id leak in /pay HTML
#  8. Rate limit: 6th order from same IP → 429
#  9. Public site untouched: all 7 pages 200 + footer markers
#
set -u
BASE="http://localhost:3000"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  PASS: $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL: $1"; }
check() { # check <desc> <expected> <actual>
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected $2, got $3)"; fi
}
contains() { # contains <desc> <file> <needle> <min-count>
  local n; n=$(grep -o -F "$3" "$2" 2>/dev/null | wc -l)
  if [ "$n" -ge "$4" ]; then ok "$1"; else bad "$1 (found $n, need ≥$4)"; fi
}
absent() {
  if grep -q -F "$3" "$2" 2>/dev/null; then bad "$1 (found forbidden: $3)"; else ok "$1"; fi
}

echo "== 1. Homepage pricing button =="
TMP=$(mktemp)
curl -s "$BASE/" -o "$TMP" --max-time 60
PLAN_HREF=$(grep -o 'href="/checkout/[^"]*"' "$TMP" | head -1 | cut -d'"' -f2)
[ -n "$PLAN_HREF" ] && ok "pricing card links to plan checkout ($PLAN_HREF)" || bad "no /checkout/ link on homepage"
PLAN_ID="${PLAN_HREF#/checkout/}"

echo "== 2. Plan checkout page =="
CO=$(mktemp)
code=$(curl -s -o "$CO" -w '%{http_code}' "$BASE$PLAN_HREF" --max-time 60)
check "GET $PLAN_HREF" 200 "$code"
contains "order summary heading" "$CO" "Your order" 1
contains "plan total block" "$CO" "Total today" 1
contains "payment methods strip (public visibility)" "$CO" "Payment methods" 1
contains "mobile wallet listed publicly" "$CO" "Mobile Wallet" 1
contains "wallet description (EVC Plus)" "$CO" "EVC Plus" 1
contains "details form present" "$CO" "Your details" 1
contains "continue button" "$CO" "Continue to payment" 1
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/checkout/bogusplan123" --max-time 30)
check "bogus plan id → 404" 404 "$code"

echo "== 3. Order API validation =="
r=$(curl -s -X POST "$BASE/api/checkout/plan" -H 'Content-Type: application/json' -d "{\"planId\":\"$PLAN_ID\",\"name\":\"\"}" -w '|%{http_code}' --max-time 30)
check "missing name → 400" "400" "${r##*|}"
r=$(curl -s -X POST "$BASE/api/checkout/plan" -H 'Content-Type: application/json' -d "{\"planId\":\"$PLAN_ID\",\"name\":\"X\",\"email\":\"bad@@mail\"}" -w '|%{http_code}' --max-time 30)
check "bad email → 400" "400" "${r##*|}"
r=$(curl -s -X POST "$BASE/api/checkout/plan" -H 'Content-Type: application/json' -d '{"planId":"nope","name":"X"}' -w '|%{http_code}' --max-time 30)
check "bogus plan → 404" "404" "${r##*|}"
r=$(curl -s -X POST "$BASE/api/checkout/plan" -H 'Content-Type: application/json' -d 'garbage' -w '|%{http_code}' --max-time 30)
check "garbage body → 400" "400" "${r##*|}"

echo "== 4. Valid order → invoice =="
r=$(curl -s -X POST "$BASE/api/checkout/plan" -H 'Content-Type: application/json' \
  -d "{\"planId\":\"$PLAN_ID\",\"name\":\"Amina Hassan\",\"email\":\"amina@example.com\"}" -w '|%{http_code}' --max-time 30)
code="${r##*|}"; body="${r%|*}"
check "valid order → 201" "201" "$code"
TOKEN=$(echo "$body" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("token",""))' 2>/dev/null)
[ -n "$TOKEN" ] && ok "token returned (${#TOKEN} chars)" || bad "no token in response"
echo "$TOKEN" > /tmp/plan-order-token

echo "== 5. /pay page shows provider + mobile payment =="
PAY=$(mktemp)
code=$(curl -s -o "$PAY" -w '%{http_code}' "$BASE/pay/$TOKEN" --max-time 60)
check "GET /pay/<token>" 200 "$code"
contains "provider selection (step 1)" "$PAY" "Choose a payment provider" 1
contains "method selection (step 2)" "$PAY" "Choose how to pay" 1
contains "WAAFI Pay provider card" "$PAY" "WAAFI Pay" 1
contains "Mobile Wallet method selectable" "$PAY" "Mobile Wallet" 1
contains "order invoice name (Starter Plan)" "$PAY" "Starter Plan" 1
contains "client name (Billed to)" "$PAY" "Amina Hassan" 1
contains "amount \$150.00" "$PAY" "150.00" 1

echo "== 6. Privacy on /pay HTML =="
absent "client email not leaked" "$PAY" "amina@example.com"
absent "plan id not leaked" "$PAY" "$PLAN_ID"
absent "merchantUid secret not leaked" "$PAY" "MQ1234567"

echo "== 7. Rate limit (5 real orders max / 10 min / IP) =="
# 1 real order already placed in step 4 → 4 more, then the 6th must 429
for i in 2 3 4 5; do
  curl -s -o /dev/null -X POST "$BASE/api/checkout/plan" -H 'Content-Type: application/json' \
    -d "{\"planId\":\"$PLAN_ID\",\"name\":\"Rate Check $i\"}" --max-time 30
done
r=$(curl -s -X POST "$BASE/api/checkout/plan" -H 'Content-Type: application/json' \
  -d "{\"planId\":\"$PLAN_ID\",\"name\":\"Rate Check 6\"}" -w '|%{http_code}' --max-time 30)
check "6th order → 429" "429" "${r##*|}"

echo "== 8. Public site untouched =="
for p in / /about /who-we-are /services /portfolio /news /contact; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p" --max-time 60)
  check "GET $p" 200 "$code"
done
HOME=$(mktemp); curl -s "$BASE/" -o "$HOME" --max-time 60
contains "footer marker intact" "$HOME" "QASADAN Web Development Agency" 1
contains "pricing section heading intact" "$HOME" "Choose the plan that fits your business" 1

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN ✅" || echo "FAILURES PRESENT ❌"
exit $FAIL
