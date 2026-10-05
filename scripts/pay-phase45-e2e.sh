#!/usr/bin/env bash
# =============================================================================
# Phase 4 + 5 E2E — Payment Verification, Success Page, Receipts, Webhooks,
# Admin Payment History + Release tool.
#
# The verified-PAID path cannot be exercised against the real WAAFI sandbox
# (dummy preview credentials are rejected), so this suite runs the dev server
# with WAAFIPAY_SANDBOX_URL pointed at scripts/pay-mock-waafi.ts — a local
# mock that speaks EXACTLY the documented /asm envelope. The suite restarts
# the dev server itself (mock env for the tests, clean env after) and
# finishes with real-sandbox + public-site regression checks.
# =============================================================================
set -u
cd /home/z/my-project

BASE="http://localhost:3000"
MOCK="http://127.0.0.1:3999"
TMP="/home/z/my-project/db/.p45tmp"
mkdir -p "$TMP"
JAR="$TMP/cookies.jar"
rm -f "$JAR"
PASS=0; FAIL=0

check() { # name expected actual
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1"; else FAIL=$((FAIL+1)); echo "FAIL  $1 (expected [$2], got [$3])"; fi
}
contains() { # name file needle
  if grep -q "$3" "$2"; then PASS=$((PASS+1)); echo "PASS  $1"; else FAIL=$((FAIL+1)); echo "FAIL  $1 (marker '$3' not found)"; fi
}
absent() { # name file needle
  if ! grep -q "$3" "$2"; then PASS=$((PASS+1)); echo "PASS  $1"; else FAIL=$((FAIL+1)); echo "FAIL  $1 (marker '$3' SHOULD NOT be present)"; fi
}
json() { # file python-expression
  python3 -c "import json;d=json.load(open('$1'));print($2)"
}

set_mode() { echo -n "$1" > db/mock-waafi-mode.txt; }

ENV_DB="$(grep '^DATABASE_URL=' .env | cut -d= -f2-)"
ENV_KEY="$(grep '^PAYMENTS_MASTER_KEY=' .env | cut -d= -f2-)"
export DATABASE_URL="$ENV_DB"

kill_server() {
  pkill -f "next dev" 2>/dev/null
  pkill -f "next-server" 2>/dev/null
  pkill -f "bun run dev" 2>/dev/null
  for _ in $(seq 1 25); do
    curl -s -o /dev/null --max-time 2 "$BASE/" || return 0
    sleep 1
  done
}

start_server() { # $1 = extra env (WAAFIPAY override) or empty
  ( ( setsid env DATABASE_URL="$ENV_DB" PAYMENTS_MASTER_KEY="$ENV_KEY" $1 bun run dev >/dev/null 2>&1 & ) & )
  for _ in $(seq 1 60); do
    if [ "$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$BASE/admin/login" 2>/dev/null)" = "200" ]; then
      return 0
    fi
    sleep 2
  done
  echo "ERROR: dev server did not come up"; return 1
}

echo "=================================================================="
echo " PHASE 4+5 E2E — restarting dev server against the local WAAFI mock"
echo "=================================================================="
set_mode "approve"
kill_server
pkill -f "pay-mock-waafi" 2>/dev/null
sleep 1
( ( setsid env DATABASE_URL="$ENV_DB" bun scripts/pay-mock-waafi.ts > "$TMP/mock.log" 2>&1 & ) & )
for _ in $(seq 1 15); do
  curl -s --max-time 2 "$MOCK/health" >/dev/null 2>&1 && break
  sleep 1
done
check "mock WAAFI up" "ok" "$(curl -s --max-time 3 "$MOCK/health")"
start_server "WAAFIPAY_SANDBOX_URL=$MOCK/asm" || { echo "ABORT"; exit 1; }
echo ""

echo "== 1. Admin login =="
check "login 200" "200" "$(curl -s -c "$JAR" -o "$TMP/login.json" -w "%{http_code}" -X POST "$BASE/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@qasadan.com","password":"QasadanAdmin2026!"}')"

echo "== 2. Provider must be ACTIVE with complete credentials =="
curl -s -b "$JAR" "$BASE/api/admin/payment-providers" -o "$TMP/prov.json"
PROV_ID=$(json "$TMP/prov.json" "[p['id'] for p in d['providers'] if p['code']=='waafipay'][0]")
PROV_ACTIVE=$(json "$TMP/prov.json" "str([p['isActive'] for p in d['providers'] if p['code']=='waafipay'][0]).lower()")
PROV_MISSING=$(json "$TMP/prov.json" "len([p for p in d['providers'] if p['code']=='waafipay'][0]['missingFields'])")
check "provider configured (0 missing fields)" "0" "$PROV_MISSING"
if [ "$PROV_ACTIVE" != "true" ]; then
  curl -s -b "$JAR" -X PUT "$BASE/api/admin/payment-providers/$PROV_ID" \
    -H "Content-Type: application/json" -d '{"isActive":true}' -o "$TMP/activate.json"
  echo "      (provider was inactive — activated for the E2E, as in Phase 3)"
fi
check "provider active" "true" "$(curl -s -b "$JAR" "$BASE/api/admin/payment-providers" -o "$TMP/prov2.json" && json "$TMP/prov2.json" "str([p['isActive'] for p in d['providers'] if p['code']=='waafipay'][0]).lower()")"

echo "== 3. Set webhook secret for the signed-webhook tests =="
check "set webhookSecret 200" "200" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/admin/payment-providers/$PROV_ID" \
  -H "Content-Type: application/json" \
  -d '{"credentials":{"webhookSecret":"p45-e2e-webhook-secret-0123456789"}}')"
WHSEC="p45-e2e-webhook-secret-0123456789"

mk_invoice() { # $1 name-suffix  $2 amount  — prints "<invoiceNumber> <token>"
  local out
  out=$(curl -s -b "$JAR" -X POST "$BASE/api/admin/invoices" \
    -H "Content-Type: application/json" \
    -d "{\"clientName\":\"Phase45 E2E $1\",\"clientEmail\":\"private-$1@qasadan.test\",\"projectService\":\"P4P5 test $1\",\"amount\":$2,\"currency\":\"USD\",\"description\":\"Phase 4/5 end-to-end verification invoice ($1).\"}")
  printf '%s' "$out" > "$TMP/inv-$1.json"
  python3 -c "import json;d=json.load(open('$TMP/inv-$1.json'));print(d['invoice']['invoiceNumber'],d['invoice']['token'])"
}

echo "== 4. Create invoice A (USD 188.50) — happy path =="
read INV_A TOKEN_A <<< "$(mk_invoice A 188.50)"
echo "      invoiceA=$INV_A"
check "pay page (PENDING) 200" "200" "$(curl -s -o "$TMP/payA-pending.html" -w "%{http_code}" "$BASE/pay/$TOKEN_A")"
contains "checkout panel shown (public visibility intact)" "$TMP/payA-pending.html" "Pay this invoice online"
contains "provider visible" "$TMP/payA-pending.html" "WAAFI Pay"
contains "wallet method visible" "$TMP/payA-pending.html" "Mobile Wallet"

echo "== 5. Security: unknown tokens + unpaid receipt =="
check "verify unknown token 404" "404" "$(curl -s -o "$TMP/v404.json" -w "%{http_code}" -X POST "$BASE/pay/definitely-unknown-token-000/verify")"
check "receipt unknown token 404" "404" "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/pay/definitely-unknown-token-000/receipt")"
check "receipt for UNPAID invoice 404" "404" "$(curl -s -o "$TMP/r404.json" -w "%{http_code}" "$BASE/api/pay/$TOKEN_A/receipt")"
check "verify PENDING invoice (no attempt) -> CONFIRMING" "CONFIRMING" "$(curl -s -X POST "$BASE/api/pay/$TOKEN_A/verify" -o "$TMP/vp.json" -w "" && json "$TMP/vp.json" "d['state']")"

echo "== 6. Happy path: initiate -> callback -> verify -> PAID =="
check "initiate 200" "200" "$(curl -s -o "$TMP/initA.json" -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_A/pay" \
  -H "Content-Type: application/json" \
  -d '{"providerCode":"waafipay","paymentMethod":"MWALLET_ACCOUNT","payerPhone":"252612345678"}')"
REDIRECT_A=$(json "$TMP/initA.json" "d.get('redirectUrl','')")
contains "mock hosted checkout URL issued" "$TMP/initA.json" "mock.waafipay.test"
REF_A=$(bun scripts/pay-phase45-db.ts state "$INV_A" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['attempts'][0]['referenceId'])")
STATE_A="$TMP/stateA.json"
bun scripts/pay-phase45-db.ts state "$INV_A" > "$STATE_A"
check "invoice PROCESSING after initiation" "PROCESSING" "$(json "$STATE_A" "d['status']")"
check "attempt INITIATED" "INITIATED" "$(json "$STATE_A" "d['attempts'][0]['status']")"

# provider success callback — browser-style GET (must NOT mark PAID: zero trust)
check "callback GET 200" "200" "$(curl -s -o "$TMP/cbA.html" -w "%{http_code}" "$BASE/api/pay/callback?ref=$REF_A&result=success")"
contains "callback forwards to the pay page" "$TMP/cbA.html" "/pay/$TOKEN_A"
bun scripts/pay-phase45-db.ts state "$INV_A" > "$STATE_A"
check "after callback: attempt CALLBACK_SUCCESS" "CALLBACK_SUCCESS" "$(json "$STATE_A" "d['attempts'][0]['status']")"
check "after callback: invoice STILL PROCESSING (zero trust)" "PROCESSING" "$(json "$STATE_A" "d['status']")"

# pay page while PROCESSING: resume card + status panel
check "pay page (PROCESSING) 200" "200" "$(curl -s -o "$TMP/payA-processing.html" -w "%{http_code}" "$BASE/pay/$TOKEN_A?returned=success")"
contains "resume card shown" "$TMP/payA-processing.html" "Your payment is already in progress"
contains "status-check panel shown" "$TMP/payA-processing.html" "Confirm your payment"
contains "check-status button" "$TMP/payA-processing.html" "Check payment status"

# verification — the PAID transition
check "verify 200" "200" "$(curl -s -o "$TMP/vA.json" -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_A/verify")"
check "verify state PAID" "PAID" "$(json "$TMP/vA.json" "d['state']")"
check "verify returns provider name" "WAAFI Pay" "$(json "$TMP/vA.json" "d['payment']['providerName']")"
contains "verify returns mock transaction id" "$TMP/vA.json" "MOCKTXN-"
bun scripts/pay-phase45-db.ts state "$INV_A" > "$STATE_A"
check "invoice PAID" "PAID" "$(json "$STATE_A" "d['status']")"
check "paidAt recorded" "True" "$(json "$STATE_A" "d['paidAt'] is not None and str(d['paidAt'] is not None)")"
check "attempt SUCCEEDED" "SUCCEEDED" "$(json "$STATE_A" "d['attempts'][0]['status']")"
check "providerTxnId stored" "True" "$(json "$STATE_A" "d['attempts'][0]['providerTxnId'] is not None and str(d['attempts'][0]['providerTxnId'] is not None)")"
check "payerAccount stored" "252700999999" "$(json "$STATE_A" "d['attempts'][0]['payerAccount']")"
check "verificationData snapshot stored" "True" "$(json "$STATE_A" "d['attempts'][0]['hasVerificationData'] and str(d['attempts'][0]['hasVerificationData'])")"

echo "== 7. Success page (spec §7) =="
check "pay page (PAID) 200" "200" "$(curl -s -o "$TMP/payA-paid.html" -w "%{http_code}" "$BASE/pay/$TOKEN_A")"
contains "success headline" "$TMP/payA-paid.html" "Payment Successful"
contains "receipt download button" "$TMP/payA-paid.html" "Download Receipt"
contains "view invoice button" "$TMP/payA-paid.html" "View Invoice"
contains "provider + method shown" "$TMP/payA-paid.html" "Mobile Wallet"
contains "transaction id shown" "$TMP/payA-paid.html" "MOCKTXN-"
contains "amount shown" "$TMP/payA-paid.html" "188.50"
absent "checkout panel hidden when PAID" "$TMP/payA-paid.html" "Pay this invoice online"
absent "amount-due label replaced" "$TMP/payA-paid.html" "Amount due"
absent "no client email leak" "$TMP/payA-paid.html" "private-A@qasadan.test"

echo "== 8. Receipt PDF =="
curl -s -D "$TMP/receiptA.headers" -o "$TMP/receiptA.pdf" "$BASE/api/pay/$TOKEN_A/receipt"
check "receipt 200" "200" "$(awk 'NR==1{print $2}' "$TMP/receiptA.headers" | tr -d '\r')"
contains "receipt content-type PDF" "$TMP/receiptA.headers" "application/pdf"
contains "receipt is an attachment" "$TMP/receiptA.headers" "attachment"
contains "receipt filename has invoice number" "$TMP/receiptA.headers" "QASADAN-Receipt-$INV_A.pdf"
check "PDF magic bytes" "%PDF" "$(head -c 4 "$TMP/receiptA.pdf")"
check "receipt PDF non-trivial size" "True" "$([ "$(stat -c%s "$TMP/receiptA.pdf")" -gt 2000 ] && echo True || echo False)"

echo "== 9. Idempotency: re-verify is a no-op; paying again blocked =="
check "re-verify 200" "200" "$(curl -s -o "$TMP/vA2.json" -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_A/verify")"
check "re-verify still PAID" "PAID" "$(json "$TMP/vA2.json" "d['state']")"
check "exactly one SUCCEEDED payment" "1" "$(bun scripts/pay-phase45-db.ts count-succeeded "$INV_A" | python3 -c "import json,sys;print(json.load(sys.stdin)['succeeded'])")"
check "pay after PAID 409" "409" "$(curl -s -o "$TMP/payA-409.json" -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_A/pay" \
  -H "Content-Type: application/json" -d '{"providerCode":"waafipay","paymentMethod":"CREDIT_CARD"}')"
contains "already-paid message" "$TMP/payA-409.json" "already been paid"

echo "== 10. Signed webhooks (spec §5) =="
read INV_B TOKEN_B <<< "$(mk_invoice B 95.00)"
echo "      invoiceB=$INV_B"
check "initiate B 200" "200" "$(curl -s -o "$TMP/initB.json" -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_B/pay" \
  -H "Content-Type: application/json" \
  -d '{"providerCode":"waafipay","paymentMethod":"CREDIT_CARD"}')"
REF_B=$(bun scripts/pay-phase45-db.ts state "$INV_B" | python3 -c "import json,sys;print(json.load(sys.stdin)['attempts'][0]['referenceId'])")

# 10a. unsigned test ping → 200, no state change
check "webhook test ping 200" "200" "$(curl -s -o "$TMP/wh-ping.json" -w "%{http_code}" -X POST "$BASE/api/pay/webhook/waafipay" \
  -H "Content-Type: application/json" -d '{"event":"webhook.test","message":"WaafiPay webhook validation ping","merchant_uid":"MQ1234567"}')"
bun scripts/pay-phase45-db.ts attempt "$REF_B" > "$TMP/wh1.json"
check "ping: attempt unchanged" "INITIATED" "$(json "$TMP/wh1.json" "d['status']")"

# 10b. BAD signature → 200 (no leak) but no state change (zero trust)
BODY_B="{\"event\":\"authorization\",\"customer_identity\":\"252612345678\",\"payment\":{\"reference_id\":\"$REF_B\",\"status\":\"APPROVED\",\"amount\":95.0,\"currency\":\"USD\",\"transaction_id\":\"WH-B-1\"}}"
TS=$(date +%s); EID="evt-badsig-$TS"
BAD_SIG="deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
check "webhook BAD signature 200 (no leak)" "200" "$(curl -s -o "$TMP/wh-bad.json" -w "%{http_code}" -X POST "$BASE/api/pay/webhook/waafipay" \
  -H "Content-Type: application/json" -H "X-Webhook-Timestamp: $TS" -H "X-Webhook-Event-Id: $EID" -H "X-Webhook-Signature: $BAD_SIG" \
  --data-raw "$BODY_B")"
bun scripts/pay-phase45-db.ts attempt "$REF_B" > "$TMP/wh2.json"
check "bad signature: attempt unchanged" "INITIATED" "$(json "$TMP/wh2.json" "d['status']")"
bun scripts/pay-phase45-db.ts state "$INV_B" > "$TMP/stateB.json"
check "bad signature: invoice unchanged" "PROCESSING" "$(json "$TMP/stateB.json" "d['status']")"

# 10c. STALE timestamp → rejected silently
TS_OLD=$(( $(date +%s) - 3600 )); EID2="evt-stale-$TS_OLD"
GOOD_SIG_OLD=$(printf '%s' "${TS_OLD}.${EID2}.${BODY_B}" | openssl dgst -sha256 -hmac "$WHSEC" | awk '{print $NF}')
check "webhook stale timestamp 200 (no leak)" "200" "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/pay/webhook/waafipay" \
  -H "Content-Type: application/json" -H "X-Webhook-Timestamp: $TS_OLD" -H "X-Webhook-Event-Id: $EID2" -H "X-Webhook-Signature: $GOOD_SIG_OLD" \
  --data-raw "$BODY_B")"
bun scripts/pay-phase45-db.ts state "$INV_B" > "$TMP/stateB.json"
check "stale: invoice unchanged" "PROCESSING" "$(json "$TMP/stateB.json" "d['status']")"

# 10d. VALID signature → verification triggered → PAID (through the provider API)
TS3=$(date +%s); EID3="evt-good-$TS3"
GOOD_SIG=$(printf '%s' "${TS3}.${EID3}.${BODY_B}" | openssl dgst -sha256 -hmac "$WHSEC" | awk '{print $NF}')
check "webhook valid signature 200" "200" "$(curl -s -o "$TMP/wh-good.json" -w "%{http_code}" -X POST "$BASE/api/pay/webhook/waafipay" \
  -H "Content-Type: application/json" -H "X-Webhook-Timestamp: $TS3" -H "X-Webhook-Event-Id: $EID3" -H "X-Webhook-Signature: $GOOD_SIG" \
  --data-raw "$BODY_B")"
bun scripts/pay-phase45-db.ts state "$INV_B" > "$TMP/stateB.json"
check "webhook: invoice PAID (verified via provider API)" "PAID" "$(json "$TMP/stateB.json" "d['status']")"
check "webhook: attempt SUCCEEDED" "SUCCEEDED" "$(json "$TMP/stateB.json" "d['attempts'][0]['status']")"

# 10e. replayed event id → deduped, still one SUCCEEDED payment
check "webhook replay 200" "200" "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/pay/webhook/waafipay" \
  -H "Content-Type: application/json" -H "X-Webhook-Timestamp: $TS3" -H "X-Webhook-Event-Id: $EID3" -H "X-Webhook-Signature: $GOOD_SIG" \
  --data-raw "$BODY_B")"
check "replay: still one SUCCEEDED payment" "1" "$(bun scripts/pay-phase45-db.ts count-succeeded "$INV_B" | python3 -c "import json,sys;print(json.load(sys.stdin)['succeeded'])")"

# 10f. webhook for unknown provider → 200, no leak
check "webhook unknown provider 200" "200" "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/pay/webhook/doesnotexist" \
  -H "Content-Type: application/json" -d '{"event":"authorization","payment":{"reference_id":"x","status":"APPROVED"}}')"

echo "== 11. DECLINED path: provider says declined -> retry allowed =="
read INV_C TOKEN_C <<< "$(mk_invoice C 60.00)"
echo "      invoiceC=$INV_C"
curl -s -o "$TMP/initC.json" -X POST "$BASE/api/pay/$TOKEN_C/pay" -H "Content-Type: application/json" \
  -d '{"providerCode":"waafipay","paymentMethod":"MWALLET_ACCOUNT","payerPhone":"252612345678"}' 
set_mode "decline"
check "verify declined 200" "200" "$(curl -s -o "$TMP/vC.json" -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_C/verify")"
check "verify state DECLINED" "DECLINED" "$(json "$TMP/vC.json" "d['state']")"
bun scripts/pay-phase45-db.ts state "$INV_C" > "$TMP/stateC.json"
check "declined: attempt FAILED" "FAILED" "$(json "$TMP/stateC.json" "d['attempts'][0]['status']")"
check "declined: invoice released to PENDING" "PENDING" "$(json "$TMP/stateC.json" "d['status']")"
contains "declined: failure reason recorded" "$TMP/stateC.json" "Provider reported"
check "pay page after decline 200" "200" "$(curl -s -o "$TMP/payC.html" -w "%{http_code}" "$BASE/pay/$TOKEN_C")"
contains "checkout offered again after decline" "$TMP/payC.html" "Pay this invoice online"

echo "== 12. MISMATCH path: amount mismatch -> blocked + flagged for admin =="
set_mode "mismatch"
read INV_D TOKEN_D <<< "$(mk_invoice D 77.25)"
echo "      invoiceD=$INV_D"
curl -s -o "$TMP/initD.json" -X POST "$BASE/api/pay/$TOKEN_D/pay" -H "Content-Type: application/json" \
  -d '{"providerCode":"waafipay","paymentMethod":"CREDIT_CARD"}'
curl -s -o "$TMP/vD.json" -X POST "$BASE/api/pay/$TOKEN_D/verify"
check "mismatch: verify stays CONFIRMING (no auto-PAID)" "CONFIRMING" "$(json "$TMP/vD.json" "d['state']")"
contains "mismatch: flagged message" "$TMP/vD.json" "could not match it automatically"
bun scripts/pay-phase45-db.ts state "$INV_D" > "$TMP/stateD.json"
check "mismatch: invoice STAYS PROCESSING" "PROCESSING" "$(json "$TMP/stateD.json" "d['status']")"
check "mismatch: attempt stays open (blocks retries)" "INITIATED" "$(json "$TMP/stateD.json" "d['attempts'][0]['status']")"
contains "mismatch: discrepancy recorded" "$TMP/stateD.json" "Verification mismatch"
# retry initiation must RESUME (blocked), not create a second transaction
curl -s -o "$TMP/initD2.json" -X POST "$BASE/api/pay/$TOKEN_D/pay" -H "Content-Type: application/json" \
  -d '{"providerCode":"waafipay","paymentMethod":"CREDIT_CARD"}'
check "mismatch: re-initiation resumes (no 2nd transaction)" "True" "$(json "$TMP/initD2.json" "d.get('resumed')==True and str(d.get('resumed')==True)")"
STATE_D2="$TMP/stateD2.json"; bun scripts/pay-phase45-db.ts state "$INV_D" > "$STATE_D2"
check "mismatch: still exactly one attempt" "1" "$(json "$STATE_D2" "len(d['attempts'])")"

echo "== 13. Admin release tool (stuck PROCESSING) =="
# fetch invoice id via admin list (the public db helper doesn't expose it)
curl -s -b "$JAR" "$BASE/api/admin/invoices?q=$INV_D" -o "$TMP/invD-list.json"
INV_D_DBID=$(json "$TMP/invD-list.json" "[i['id'] for i in d['invoices'] if i['invoiceNumber']=='$INV_D'][0]")
check "release stuck invoice 200" "200" "$(curl -s -b "$JAR" -o "$TMP/release.json" -w "%{http_code}" -X POST "$BASE/api/admin/invoices/$INV_D_DBID/release")"
bun scripts/pay-phase45-db.ts state "$INV_D" > "$STATE_D2"
check "released: invoice PENDING" "PENDING" "$(json "$STATE_D2" "d['status']")"
check "released: attempt FAILED with audit reason" "True" "$(json "$STATE_D2" "('Released by an administrator' in (d['attempts'][0]['failureReason'] or '')) and str('Released by an administrator' in (d['attempts'][0]['failureReason'] or ''))")"
check "release non-processing invoice 409" "409" "$(curl -s -b "$JAR" -o "$TMP/release2.json" -w "%{http_code}" -X POST "$BASE/api/admin/invoices/$INV_D_DBID/release")"
# release on a PAID invoice must be refused
curl -s -b "$JAR" "$BASE/api/admin/invoices?q=$INV_A" -o "$TMP/invA-list.json"
INV_A_DBID=$(json "$TMP/invA-list.json" "[i['id'] for i in d['invoices'] if i['invoiceNumber']=='$INV_A'][0]")
check "release PAID invoice 409" "409" "$(curl -s -b "$JAR" -o "$TMP/release3.json" -w "%{http_code}" -X POST "$BASE/api/admin/invoices/$INV_A_DBID/release")"
set_mode "approve"

echo "== 14. Initiation idempotency (resume same checkout URL) =="
read INV_E TOKEN_E <<< "$(mk_invoice E 42.00)"
echo "      invoiceE=$INV_E"
curl -s -o "$TMP/initE1.json" -X POST "$BASE/api/pay/$TOKEN_E/pay" -H "Content-Type: application/json" \
  -d '{"providerCode":"waafipay","paymentMethod":"CREDIT_CARD"}'
curl -s -o "$TMP/initE2.json" -X POST "$BASE/api/pay/$TOKEN_E/pay" -H "Content-Type: application/json" \
  -d '{"providerCode":"waafipay","paymentMethod":"CREDIT_CARD"}'
check "second initiation resumed=true" "True" "$(json "$TMP/initE2.json" "d.get('resumed')==True and str(d.get('resumed')==True)")"
check "same checkout URL both times" "True" "$(python3 -c "
import json
a=json.load(open('$TMP/initE1.json'));b=json.load(open('$TMP/initE2.json'))
print(a['redirectUrl']==b['redirectUrl'])")"
bun scripts/pay-phase45-db.ts state "$INV_E" > "$TMP/stateE.json"
check "exactly one attempt for E" "1" "$(json "$TMP/stateE.json" "len(d['attempts'])")"

echo "== 15. Verification rate limit =="
read INV_F TOKEN_F <<< "$(mk_invoice F 12.00)"
LAST_CODE="200"
for i in $(seq 1 13); do
  LAST_CODE=$(curl -s -o "$TMP/vF.json" -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_F/verify")
done
check "13th verify blocked 429" "429" "$LAST_CODE"

echo "== 16. Admin payments history (spec §8) =="
check "payments API unauthenticated 401" "401" "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/payments")"
check "payments API 200" "200" "$(curl -s -b "$JAR" -o "$TMP/pays.json" -w "%{http_code}" "$BASE/api/admin/payments")"
contains "history lists invoice A attempt" "$TMP/pays.json" "$INV_A"
contains "history lists reference A" "$TMP/pays.json" "QSD-$INV_A"
check "history has SUCCEEDED rows" "True" "$(json "$TMP/pays.json" "len([p for p in d['payments'] if p['status']=='SUCCEEDED'])>0 and str(len([p for p in d['payments'] if p['status']=='SUCCEEDED'])>0)")"
check "succeeded rows expose receiptUrl" "True" "$(json "$TMP/pays.json" "all(p['receiptUrl'] and p['receiptUrl'].startswith('/api/pay/') for p in d['payments'] if p['status']=='SUCCEEDED') and str(all(p['receiptUrl'] and p['receiptUrl'].startswith('/api/pay/') for p in d['payments'] if p['status']=='SUCCEEDED'))")"
check "every row exposes payment page url" "True" "$(json "$TMP/pays.json" "all(p['paymentPageUrl'].startswith('/pay/') for p in d['payments']) and str(all(p['paymentPageUrl'].startswith('/pay/') for p in d['payments']))")"
absent "no credential leak in history" "$TMP/pays.json" "p45-e2e-webhook-secret"
# status filter
check "filter status=SUCCEEDED 200" "200" "$(curl -s -b "$JAR" -o "$TMP/pays-succ.json" -w "%{http_code}" "$BASE/api/admin/payments?status=SUCCEEDED")"
check "filter returns only SUCCEEDED" "True" "$(json "$TMP/pays-succ.json" "len(d['payments'])>0 and all(p['status']=='SUCCEEDED' for p in d['payments']) and str(len(d['payments'])>0 and all(p['status']=='SUCCEEDED' for p in d['payments']))")"
# provider filter
check "filter provider=waafipay 200" "200" "$(curl -s -b "$JAR" -o "$TMP/pays-waafi.json" -w "%{http_code}" "$BASE/api/admin/payments?provider=waafipay")"
check "provider filter rows all waafipay" "True" "$(json "$TMP/pays-waafi.json" "all(p['providerCode']=='waafipay' for p in d['payments']) and str(all(p['providerCode']=='waafipay' for p in d['payments']))")"
# search by reference + client
REF_E=$(bun scripts/pay-phase45-db.ts state "$INV_E" | python3 -c "import json,sys;print(json.load(sys.stdin)['attempts'][0]['referenceId'])")
curl -s -b "$JAR" -o "$TMP/pays-search.json" "$BASE/api/admin/payments?q=$REF_E"
check "search by referenceId finds it" "True" "$(json "$TMP/pays-search.json" "len(d['payments'])>=1 and str(len(d['payments'])>=1)")"
curl -s -b "$JAR" -o "$TMP/pays-search2.json" "$BASE/api/admin/payments?q=Phase45%20E2E%20B"
check "search by client name finds invoice B payments" "True" "$(json "$TMP/pays-search2.json" "len(d['payments'])>=1 and str(len(d['payments'])>=1)")"
curl -s -b "$JAR" -o "$TMP/pays-none.json" "$BASE/api/admin/payments?q=zzz-no-such-thing-xyz"
check "search with no match is empty" "0" "$(json "$TMP/pays-none.json" "len(d['payments'])")"

echo "== 17. Admin pages render =="
check "admin payments page 200" "200" "$(curl -s -b "$JAR" -o "$TMP/admin-payments.html" -w "%{http_code}" "$BASE/admin/payments")"
contains "payments page title" "$TMP/admin-payments.html" "Payments"
contains "attempts chip" "$TMP/admin-payments.html" "Attempts"
contains "succeeded chip" "$TMP/admin-payments.html" "Succeeded"
check "admin invoices page 200" "200" "$(curl -s -b "$JAR" -o "$TMP/admin-invoices.html" -w "%{http_code}" "$BASE/admin/invoices")"
contains "payments nav entry present" "$TMP/admin-invoices.html" "/admin/payments"
check "admin providers page 200" "200" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" "$BASE/admin/settings/payment-providers")"
check "admin general settings 200" "200" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" "$BASE/admin/settings")"

echo "== 18. Remove the webhook secret (restore provider config) =="
check "remove webhookSecret 200" "200" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/admin/payment-providers/$PROV_ID" \
  -H "Content-Type: application/json" -d '{"credentials":{"webhookSecret":""}}')"

echo "== 19. Cleanup E2E fixtures =="
CLEANED=$(bun scripts/pay-phase45-db.ts cleanup | python3 -c "import json,sys;print(json.load(sys.stdin)['deletedInvoices'])")
check "6 E2E invoices removed" "6" "$CLEANED"

echo "=================================================================="
echo " Restarting the dev server CLEAN (no mock) + real-world regression"
echo "=================================================================="
kill_server
pkill -f "pay-mock-waafi" 2>/dev/null
rm -f db/mock-waafi-mode.txt
start_server "" || { echo "ABORT: clean server did not come up"; exit 1; }

echo "== 20. Test Connection hits the REAL WAAFI sandbox (dummy creds -> clean FAIL) =="
check "test connection 200" "200" "$(curl -s -b "$JAR" -o "$TMP/test-conn.json" -w "%{http_code}" -X POST "$BASE/api/admin/payment-providers/$PROV_ID/test")"
check "real sandbox rejects dummy credentials (expected FAIL)" "FAIL" "$(json "$TMP/test-conn.json" "d['outcome']")"

echo "== 21. Public site regression (untouched) =="
for page in "" "services" "portfolio" "news" "contact" "about" "who-we-are"; do
  check "/$page 200" "200" "$(curl -s -o "$TMP/page.html" -w "%{http_code}" "$BASE/$page")"
done
curl -s -o "$TMP/home.html" "$BASE/"
contains "footer renders (untouched)" "$TMP/home.html" "QASADAN Web Development Agency"
contains "hero renders (untouched, static feature card)" "$TMP/home.html" "24/7 Support"
DEMO_TOKEN=$(bun scripts/pay-phase45-db.ts state INV-2026-0003 | python3 -c "import json,sys;print(json.load(sys.stdin)['token'])")
check "Phase-2 demo invoice still payable page 200" "200" "$(curl -s -o "$TMP/demo.html" -w "%{http_code}" "$BASE/pay/$DEMO_TOKEN")"
contains "demo invoice shows checkout (public visibility)" "$TMP/demo.html" "Pay this invoice online"

echo ""
echo "=================================================================="
echo " RESULT: $PASS passed, $FAIL failed"
echo "=================================================================="
[ "$FAIL" = "0" ] || exit 1
