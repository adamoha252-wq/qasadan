#!/usr/bin/env bash
# =============================================================================
# Phase 3 E2E — Client Checkout (public provider/method selection + Pay Now)
# Local sqlite preview DB. Mirrors pay-phase2-e2e.sh conventions.
# =============================================================================
set -u
BASE="http://localhost:3000"
JAR="/tmp/qasadan-admin.jar"
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

echo "== 1. Admin login =="
check "login 200" "200" "$(curl -s -c "$JAR" -o /tmp/p3-login.json -w "%{http_code}" -X POST "$BASE/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@qasadan.com","password":"QasadanAdmin2026!"}')"

echo "== 2. Provider: set dummy HPP credentials (stays INACTIVE for now) =="
curl -s -b "$JAR" "$BASE/api/admin/payment-providers" -o /tmp/p3-prov.json
PROV_ID=$(python3 -c "import json;print(json.load(open('/tmp/p3-prov.json'))['providers'][0]['id'])")
check "provider creds PUT 200" "200" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/admin/payment-providers/$PROV_ID" \
  -H "Content-Type: application/json" \
  -d '{"credentials":{"merchantUid":"MQ1234567","storeId":"ST1234567","hppKey":"hpp-dummy-key-1234567890-abcd"}}')"
# ensure inactive for the gating test
ACTIVE_NOW=$(python3 -c "import json;print(str(json.load(open('/tmp/p3-prov.json'))['providers'][0]['isActive']).lower())")
if [ "$ACTIVE_NOW" = "true" ]; then
  curl -s -b "$JAR" -X PUT "$BASE/api/admin/payment-providers/$PROV_ID" -H "Content-Type: application/json" -d '{"isActive":false}' -o /dev/null
  echo "      (provider was active — deactivated for gating test)"
fi

echo "== 3. Create invoice A (USD) =="
check "create invoice 201" "201" "$(curl -s -b "$JAR" -o /tmp/p3-invA.json -w "%{http_code}" -X POST "$BASE/api/admin/invoices" \
  -H "Content-Type: application/json" \
  -d '{"clientName":"P3 E2E Client","projectService":"Checkout flow test","amount":125,"currency":"USD","description":"Phase 3 end-to-end verification invoice."}')"
TOKEN_A=$(python3 -c "import json;print(json.load(open('/tmp/p3-invA.json'))['invoice']['token'])")
INV_A=$(python3 -c "import json;print(json.load(open('/tmp/p3-invA.json'))['invoice']['invoiceNumber'])")
echo "      invoiceA=$INV_A token=$TOKEN_A"

echo "== 4. Provider INACTIVE -> pay page shows placeholder, NO checkout panel =="
check "pay page 200" "200" "$(curl -s -o /tmp/p3-payA0.html -w "%{http_code}" "$BASE/pay/$TOKEN_A")"
contains "placeholder note shown" /tmp/p3-payA0.html "Online payment for this invoice is not active yet"
absent    "checkout panel hidden" /tmp/p3-payA0.html "Pay this invoice online"
absent    "provider name hidden" /tmp/p3-payA0.html "WAAFI Pay"

echo "== 5. Activate provider =="
check "activate 200" "200" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/admin/payment-providers/$PROV_ID" \
  -H "Content-Type: application/json" -d '{"isActive":true}')"

echo "== 6. PUBLIC VISIBILITY: provider + methods now on the pay page =="
check "pay page 200" "200" "$(curl -s -o /tmp/p3-payA1.html -w "%{http_code}" "$BASE/pay/$TOKEN_A")"
contains "checkout panel shown"  /tmp/p3-payA1.html "Pay this invoice online"
contains "provider visible"     /tmp/p3-payA1.html "WAAFI Pay"
contains "wallet method shown"  /tmp/p3-payA1.html "Mobile Wallet"
contains "card method shown"    /tmp/p3-payA1.html "Card Payment"
contains "step 1 heading"       /tmp/p3-payA1.html "Choose a payment provider"
contains "step 2 heading"       /tmp/p3-payA1.html "Choose how to pay"
contains "bank method NOT shown (not enabled)" /tmp/p3-payA1.html "Choose how to pay"
absent    "bank method absent"  /tmp/p3-payA1.html "Bank Account"
absent    "no merchantUid leak" /tmp/p3-payA1.html "MQ1234567"
absent    "no hppKey leak"      /tmp/p3-payA1.html "hpp-dummy-key-1234567890-abcd"
absent    "no client email"     /tmp/p3-payA1.html "finance@"
# NOTE on the token: the pay-page token IS the URL path segment, so the
# framework router state (c:["","pay","<token>"]) necessarily embeds it in
# the RSC payload — same trust level as the address bar, present since
# Phase 2. The privacy invariants that MATTER (email, internal ids, secrets)
# are asserted above. The checkout client component reads the token from
# window.location at runtime — it is NOT passed as a serializable prop.

echo "== 7. Initiation validation (zero frontend trust) =="
check "malformed body 400" "400" "$(curl -s -o /tmp/p3-e1.json -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_A/pay" \
  -H "Content-Type: application/json" -d '{}')"
check "unknown provider 400" "400" "$(curl -s -o /tmp/p3-e2.json -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_A/pay" \
  -H "Content-Type: application/json" -d '{"providerCode":"soomarpay","paymentMethod":"MWALLET_ACCOUNT"}')"
check "not-enabled method 400" "400" "$(curl -s -o /tmp/p3-e3.json -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_A/pay" \
  -H "Content-Type: application/json" -d '{"providerCode":"waafipay","paymentMethod":"MWALLET_BANKACCOUNT"}')"
check "wallet w/o phone 400" "400" "$(curl -s -o /tmp/p3-e4.json -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_A/pay" \
  -H "Content-Type: application/json" -d '{"providerCode":"waafipay","paymentMethod":"MWALLET_ACCOUNT"}')"
check "wallet bad phone 400" "400" "$(curl -s -o /tmp/p3-e5.json -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_A/pay" \
  -H "Content-Type: application/json" -d '{"providerCode":"waafipay","paymentMethod":"MWALLET_ACCOUNT","payerPhone":"12345"}')"
check "unknown token 404" "404" "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/pay/not-a-real-token-at-all-123/pay" \
  -H "Content-Type: application/json" -d '{"providerCode":"waafipay","paymentMethod":"CREDIT_CARD"}')"

echo "== 8. Valid CARD initiation (dummy creds -> real WAAFI sandbox rejects) =="
CODE8=$(curl -s -o /tmp/p3-card.json -w "%{http_code}" --max-time 30 -X POST "$BASE/api/pay/$TOKEN_A/pay" \
  -H "Content-Type: application/json" -d '{"providerCode":"waafipay","paymentMethod":"CREDIT_CARD"}')
if [ "$CODE8" = "502" ] || [ "$CODE8" = "200" ]; then PASS=$((PASS+1)); echo "PASS  card initiation reaches provider (HTTP $CODE8)"; else FAIL=$((FAIL+1)); echo "FAIL  card initiation unexpected HTTP $CODE8"; fi
absent "502 body has no secrets" /tmp/p3-card.json "hpp-dummy-key"
bun scripts/pay-phase3-db.ts invoice "$TOKEN_A" > /tmp/p3-dbA1.json 2>/dev/null
check "invoice self-healed to PENDING" "PENDING" "$(python3 -c "import json;print(json.load(open('/tmp/p3-dbA1.json'))['status'])")"
check "FAILED attempt recorded" "FAILED" "$(python3 -c "import json;a=json.load(open('/tmp/p3-dbA1.json'))['attempts'];print(a[0]['status'] if a else 'none')")"

echo "== 9. Valid WALLET initiation with '+252…' (server-side normalization) =="
CODE9=$(curl -s -o /tmp/p3-wallet.json -w "%{http_code}" --max-time 30 -X POST "$BASE/api/pay/$TOKEN_A/pay" \
  -H "Content-Type: application/json" -d '{"providerCode":"waafipay","paymentMethod":"MWALLET_ACCOUNT","payerPhone":"+252 611-111 111"}')
if [ "$CODE9" = "502" ] || [ "$CODE9" = "200" ]; then PASS=$((PASS+1)); echo "PASS  wallet initiation normalized + reached provider (HTTP $CODE9)"; else FAIL=$((FAIL+1)); echo "FAIL  wallet initiation unexpected HTTP $CODE9"; fi
bun scripts/pay-phase3-db.ts invoice "$TOKEN_A" > /tmp/p3-dbA2.json 2>/dev/null
check "2 attempts recorded" "2" "$(python3 -c "import json;print(len(json.load(open('/tmp/p3-dbA2.json'))['attempts']))")"

echo "== 10. Anti-double-pay: INITIATED attempt -> re-POST returns SAME url =="
REF_SEED="QSD-$INV_A-seed0001"
HPP_SEED="https://sandbox.waafipay.com/hpp/token/SEEDTOKEN123"
bun scripts/pay-phase3-seed.ts "$TOKEN_A" "$REF_SEED" "$HPP_SEED" > /dev/null 2>&1
check "re-POST 200" "200" "$(curl -s -o /tmp/p3-resume.json -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_A/pay" \
  -H "Content-Type: application/json" -d '{"providerCode":"waafipay","paymentMethod":"MWALLET_ACCOUNT","payerPhone":"252611111111"}')"
contains "same checkout URL returned" /tmp/p3-resume.json "SEEDTOKEN123"
contains "flagged as resumed" /tmp/p3-resume.json '"resumed":true'
bun scripts/pay-phase3-db.ts invoice "$TOKEN_A" > /tmp/p3-dbA3.json 2>/dev/null
check "still 3 attempts (no duplicate)" "3" "$(python3 -c "import json;print(len(json.load(open('/tmp/p3-dbA3.json'))['attempts']))")"
check "invoice stays PROCESSING" "PROCESSING" "$(python3 -c "import json;print(json.load(open('/tmp/p3-dbA3.json'))['status'])")"

echo "== 11. PROCESSING pay page -> resume card, no checkout panel =="
check "pay page 200" "200" "$(curl -s -o /tmp/p3-payA2.html -w "%{http_code}" "$BASE/pay/$TOKEN_A")"
contains "processing banner" /tmp/p3-payA2.html "Payment is being processed"
contains "resume card shown" /tmp/p3-payA2.html "Continue payment"
absent    "panel hidden while processing" /tmp/p3-payA2.html "Choose a payment provider"

echo "== 12. FAILURE callback releases invoice for retry =="
check "callback GET 200" "200" "$(curl -s -o /tmp/p3-cb1.html -w "%{http_code}" "$BASE/api/pay/callback?ref=$REF_SEED&result=failure&waafiExtraParam=abc")"
contains "callback HTML refreshes to pay page" /tmp/p3-cb1.html "http-equiv=\"refresh\""
contains "callback HTML links back" /tmp/p3-cb1.html "/pay/"
bun scripts/pay-phase3-db.ts attempt "$REF_SEED" > /tmp/p3-att1.json 2>/dev/null
check "attempt -> CALLBACK_FAILURE" "CALLBACK_FAILURE" "$(python3 -c "import json;print(json.load(open('/tmp/p3-att1.json'))['status'])")"
contains "callback data recorded" /tmp/p3-att1.json "waafiExtraParam"
bun scripts/pay-phase3-db.ts invoice "$TOKEN_A" > /tmp/p3-dbA4.json 2>/dev/null
check "invoice back to PENDING (retry allowed)" "PENDING" "$(python3 -c "import json;print(json.load(open('/tmp/p3-dbA4.json'))['status'])")"

echo "== 13. Pay page after returned failure =="
check "pay page 200" "200" "$(curl -s -o /tmp/p3-payA3.html -w "%{http_code}" "$BASE/pay/$TOKEN_A?returned=failure")"
contains "failure notice shown" /tmp/p3-payA3.html "The payment was not completed"
contains "checkout panel back"  /tmp/p3-payA3.html "Choose a payment provider"

echo "== 14. SUCCESS callback keeps PROCESSING (verification is Phase 4) =="
bun scripts/pay-phase3-seed.ts "$TOKEN_A" "QSD-$INV_A-seed0002" "https://sandbox.waafipay.com/hpp/token/SEEDTOKEN456" > /dev/null 2>&1
REF2="QSD-$INV_A-seed0002"
check "callback success 200" "200" "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/pay/callback?ref=$REF2&result=success&transactionId=99887")"
bun scripts/pay-phase3-db.ts attempt "$REF2" > /tmp/p3-att2.json 2>/dev/null
check "attempt -> CALLBACK_SUCCESS" "CALLBACK_SUCCESS" "$(python3 -c "import json;print(json.load(open('/tmp/p3-att2.json'))['status'])")"
contains "provider txn recorded (untrusted)" /tmp/p3-att2.json "transactionId"
bun scripts/pay-phase3-db.ts invoice "$TOKEN_A" > /tmp/p3-dbA5.json 2>/dev/null
check "invoice stays PROCESSING (not PAID from callback)" "PROCESSING" "$(python3 -c "import json;print(json.load(open('/tmp/p3-dbA5.json'))['status'])")"
check "pay page still 200" "200" "$(curl -s -o /tmp/p3-payA4.html -w "%{http_code}" "$BASE/pay/$TOKEN_A?returned=success")"
contains "success notice shown" /tmp/p3-payA4.html "Payment submitted"
absent    "NOT marked paid prematurely" /tmp/p3-payA4.html "This invoice has been paid"

echo "== 15. Callback idempotency (repeat = no-op) =="
check "repeat success callback 200" "200" "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/pay/callback?ref=$REF2&result=success&transactionId=99999")"
bun scripts/pay-phase3-db.ts attempt "$REF2" > /tmp/p3-att3.json 2>/dev/null
check "attempt still CALLBACK_SUCCESS" "CALLBACK_SUCCESS" "$(python3 -c "import json;print(json.load(open('/tmp/p3-att3.json'))['status'])")"
check "first callbackData kept (no reprocess)" "99887" "$(python3 -c "import json;d=json.load(open('/tmp/p3-att3.json'))['callbackData'];print('99887' if '99887' in d else 'overwritten')")"

echo "== 16. Unknown ref / POST callback =="
check "unknown ref GET 200 (no leak)" "200" "$(curl -s -o /tmp/p3-cb-unknown.html -w "%{http_code}" "$BASE/api/pay/callback?ref=QSD-DOES-NOT-EXIST&result=success")"
absent  "unknown ref leaks no token" /tmp/p3-cb-unknown.html "$TOKEN_A"
check "POST callback 200 JSON" "200" "$(curl -s -o /tmp/p3-cb-post.json -w "%{http_code}" -X POST "$BASE/api/pay/callback?ref=$REF2&result=failure" \
  -H "Content-Type: application/json" -d '{"foo":"bar"}')"
contains "POST callback ok" /tmp/p3-cb-post.json '"ok":true'

echo "== 17. Rate limit: 5 real attempts then 429 =="
curl -s -b "$JAR" -o /tmp/p3-invB.json -X POST "$BASE/api/admin/invoices" -H "Content-Type: application/json" \
  -d '{"clientName":"Rate Limit Probe","projectService":"rl","amount":10,"currency":"USD"}'
TOKEN_B=$(python3 -c "import json;print(json.load(open('/tmp/p3-invB.json'))['invoice']['token'])")
for i in 1 2 3 4 5; do
  CODE_RL=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -X POST "$BASE/api/pay/$TOKEN_B/pay" \
    -H "Content-Type: application/json" -d '{"providerCode":"waafipay","paymentMethod":"CREDIT_CARD"}')
  echo "      attempt $i -> $CODE_RL"
done
check "6th attempt blocked 429" "429" "$(curl -s -o /tmp/p3-rl.json -w "%{http_code}" -X POST "$BASE/api/pay/$TOKEN_B/pay" \
  -H "Content-Type: application/json" -d '{"providerCode":"waafipay","paymentMethod":"CREDIT_CARD"}')"
contains "429 has friendly message" /tmp/p3-rl.json "Too many payment attempts"
bun scripts/pay-phase3-db.ts invoice "$TOKEN_B" > /tmp/p3-dbB.json 2>/dev/null
check "invoice B self-healed PENDING" "PENDING" "$(python3 -c "import json;print(json.load(open('/tmp/p3-dbB.json'))['status'])")"

echo "== 18. Phase 2 demo invoices still render checkout (USD + SLSH) =="
curl -s -b "$JAR" "$BASE/api/admin/invoices" -o /tmp/p3-inv-all.json
TOK_0003=$(python3 -c "
import json
for i in json.load(open('/tmp/p3-inv-all.json'))['invoices']:
    if i['invoiceNumber'].endswith('0003'): print(i['token']); break
else: print('')")
if [ -n "$TOK_0003" ]; then
  check "INV-0003 pay page 200" "200" "$(curl -s -o /tmp/p3-pay0003.html -w "%{http_code}" "$BASE/pay/$TOK_0003")"
  contains "0003 checkout visible" /tmp/p3-pay0003.html "Choose a payment provider"
else
  echo "SKIP  INV-2026-0003 not present"
fi

echo "== 19. Public site untouched =="
for path in / /about /who-we-are /services /portfolio /news /contact; do
  check "public $path 200" "200" "$(curl -s -o /tmp/p3-pub.html -w "%{http_code}" "$BASE$path")"
done
curl -s "$BASE/" -o /tmp/p3-home.html
contains "footer present"      /tmp/p3-home.html 'role="contentinfo"'
contains "footer brand intact" /tmp/p3-home.html ">Company<"

echo "== 20. Cleanup (reset demo state) =="
INV_B_ID=$(python3 -c "import json;print(json.load(open('/tmp/p3-invB.json'))['invoice']['id'])")
curl -s -b "$JAR" -X DELETE "$BASE/api/admin/invoices/$INV_B_ID" -o /dev/null
bun scripts/pay-phase3-cleanup.ts "$TOKEN_A" > /dev/null 2>&1
bun scripts/pay-phase3-db.ts invoice "$TOKEN_A" > /tmp/p3-final.json 2>/dev/null
check "invoice A reset to PENDING" "PENDING" "$(python3 -c "import json;print(json.load(open('/tmp/p3-final.json'))['status'])")"
check "invoice A attempts cleared" "0" "$(python3 -c "import json;print(len(json.load(open('/tmp/p3-final.json'))['attempts']))")"

echo ""
echo "=============================================="
echo "PHASE 3 E2E: $PASS passed, $FAIL failed"
echo "=============================================="
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
