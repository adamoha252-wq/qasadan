#!/usr/bin/env bash
# Phase 2 E2E — Invoices & secure payment links (local sqlite preview)
set -u
BASE="http://localhost:3000"
JAR="/tmp/qasadan-admin.jar"
rm -f "$JAR"
PASS=0; FAIL=0

check() { # name expected actual
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1"; else FAIL=$((FAIL+1)); echo "FAIL  $1 (expected $2, got $3)"; fi
}

echo "== 1. Admin login =="
LOGIN=$(curl -s -c "$JAR" -o /tmp/login.json -w "%{http_code}" -X POST "$BASE/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@qasadan.com","password":"QasadanAdmin2026!"}')
check "login 200" "200" "$LOGIN"

echo "== 2. Unauthenticated invoices API must 401 =="
check "no-cookie 401" "401" "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/invoices")"

echo "== 3. Empty list =="
check "empty list 200" "200" "$(curl -s -b "$JAR" -o /tmp/list0.json -w "%{http_code}" "$BASE/api/admin/invoices")"
check "list is []" "0" "$(python3 -c "import json;print(len(json.load(open('/tmp/list0.json'))['invoices']))")"

echo "== 4. Create invoice =="
check "create 201" "201" "$(curl -s -b "$JAR" -o /tmp/inv.json -w "%{http_code}" -X POST "$BASE/api/admin/invoices" \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Al-Huda School","clientEmail":"finance@alhuda.so","projectService":"School website redesign — phase 1","description":"Deposit for design + development.\n50% upfront, 50% on delivery.","amount":450,"currency":"USD","dueDate":"2026-10-20"}')"
INV_ID=$(python3 -c "import json;print(json.load(open('/tmp/inv.json'))['invoice']['id'])")
INV_NUM=$(python3 -c "import json;print(json.load(open('/tmp/inv.json'))['invoice']['invoiceNumber'])")
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/inv.json'))['invoice']['token'])")
LINK=$(python3 -c "import json;print(json.load(open('/tmp/inv.json'))['invoice']['paymentLink'])")
echo "      invoice=$INV_NUM token=$TOKEN"
check "number format INV-YYYY-NNNN" "INV-$(date +%Y)-0001" "$INV_NUM"
check "token is 32 chars" "32" "${#TOKEN}"

echo "== 5. Second invoice numbers sequentially =="
check "create2 201" "201" "$(curl -s -b "$JAR" -o /tmp/inv2.json -w "%{http_code}" -X POST "$BASE/api/admin/invoices" \
  -H "Content-Type: application/json" \
  -d '{"clientName":"IRRDO","projectService":"NGO portal maintenance","amount":1200,"currency":"SLSH"}')"
check "number seq 0002" "INV-$(date +%Y)-0002" "$(python3 -c "import json;print(json.load(open('/tmp/inv2.json'))['invoice']['invoiceNumber'])")"

echo "== 6. Validation failures =="
check "bad currency 400" "400" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/invoices" \
  -H "Content-Type: application/json" -d '{"clientName":"X","projectService":"Y","amount":10,"currency":"EUR"}')"
check "zero amount 400" "400" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/invoices" \
  -H "Content-Type: application/json" -d '{"clientName":"X","projectService":"Y","amount":0,"currency":"USD"}')"
check "bad email 400" "400" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/invoices" \
  -H "Content-Type: application/json" -d '{"clientName":"X","projectService":"Y","amount":10,"currency":"USD","clientEmail":"not-an-email"}')"

echo "== 7. Public pay page =="
check "pay page 200" "200" "$(curl -s -o /tmp/pay.html -w "%{http_code}" "$BASE/pay/$TOKEN")"
grep -q "Al-Huda School" /tmp/pay.html && check "pay shows client" "yes" "yes" || check "pay shows client" "yes" "no"
grep -q "450.00" /tmp/pay.html && check "pay shows amount" "yes" "yes" || check "pay shows amount" "yes" "no"
grep -q "finance@alhuda.so" /tmp/pay.html && check "pay HIDES client email" "no" "yes" || check "pay HIDES client email" "no" "no"
check "bad token 404" "404" "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/pay/definitely-not-a-real-token-xyz")"

echo "== 8. Search & filter =="
check "search hit 200" "200" "$(curl -s -b "$JAR" -o /tmp/s.json -w "%{http_code}" "$BASE/api/admin/invoices?q=al-huda")"
check "search finds 1" "1" "$(python3 -c "import json;print(len(json.load(open('/tmp/s.json'))['invoices']))")"
check "status filter 200" "200" "$(curl -s -b "$JAR" -o /tmp/s2.json -w "%{http_code}" "$BASE/api/admin/invoices?status=PENDING")"
check "pending finds 2" "2" "$(python3 -c "import json;print(len(json.load(open('/tmp/s2.json'))['invoices']))")"

echo "== 9. Edit while PENDING =="
check "edit 200" "200" "$(curl -s -b "$JAR" -o /tmp/edit.json -w "%{http_code}" -X PUT "$BASE/api/admin/invoices/$INV_ID" \
  -H "Content-Type: application/json" -d '{"amount":475,"projectService":"School website redesign — phase 1 (updated)"}')"
check "amount updated" "475.00" "$(python3 -c "import json;print(json.load(open('/tmp/edit.json'))['invoice']['amount'])")"

echo "== 10. Cancel then immutability =="
check "cancel 200" "200" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/invoices/$INV_ID/cancel")"
check "edit after cancel 409" "409" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/admin/invoices/$INV_ID" \
  -H "Content-Type: application/json" -d '{"amount":500}')"
check "cancel again 409" "409" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/invoices/$INV_ID/cancel")"
check "pay page shows cancelled" "yes" "$(curl -s "$BASE/pay/$TOKEN" | grep -q 'cancelled' && echo yes || echo no)"

echo "== 11. Delete =="
check "delete cancelled 200" "200" "$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/admin/invoices/$INV_ID")"
check "pay link now 404" "404" "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/pay/$TOKEN")"

echo "== 12. Public site untouched =="
for p in / /services /portfolio /news /about /who-we-are /contact /admin/login; do
  check "$p 200" "200" "$(curl -s -o /dev/null -w "%{http_code}" "$BASE$p" --max-time 30)"
done

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ]
