#!/usr/bin/env bash
# test-upload-fix.sh — verify admin image upload works after restoring /api/admin/upload
# Tests: login -> upload PNG -> fetch URL back -> unauth rejected -> team/portfolio pages OK
BASE=http://localhost:3000
JAR=$(mktemp)
TMP=$(mktemp -d)
pass=0; fail=0
ok()  { echo "PASS: $1"; pass=$((pass+1)); }
bad() { echo "FAIL: $1"; fail=$((fail+1)); }

echo "== 1. Admin login =="
code=$(curl -s -c "$JAR" -o "$TMP/login.json" -w "%{http_code}" --max-time 15 -X POST "$BASE/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@qasadan.com","password":"QasadanAdmin2026!"}')
[ "$code" = "200" ] && ok "login 200" || { bad "login -> $code: $(head -c 200 "$TMP/login.json")"; }

echo "== 2. Build tiny valid PNG (1x1) =="
python3 - "$TMP/t.png" <<'PY'
import struct, zlib, sys
def chunk(t, d):
    c = t + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c))
ihdr = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
idat = zlib.compress(b'\x00\xff\x00\x00')
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')
open(sys.argv[1], 'wb').write(png)
PY
[ -s "$TMP/t.png" ] && ok "png created ($(stat -c%s "$TMP/t.png") bytes)" || bad "png creation"

echo "== 3. Upload as admin =="
code=$(curl -s -b "$JAR" -o "$TMP/up.json" -w "%{http_code}" --max-time 20 -X POST "$BASE/api/admin/upload" \
  -F "file=@$TMP/t.png;type=image/png")
echo "   response: $(head -c 300 "$TMP/up.json")"
[ "$code" = "201" ] && ok "upload 201" || bad "upload -> $code"

URL=$(python3 -c "import json;print(json.load(open('$TMP/up.json')).get('url',''))" 2>/dev/null)
if [ -n "$URL" ]; then
  case "$URL" in http*) FULL="$URL" ;; *) FULL="$BASE$URL" ;; esac
  echo "== 4. Fetch uploaded image back =="
  res=$(curl -s -o "$TMP/back.bin" -w "%{http_code} %{content_type}" --max-time 15 "$FULL")
  [ "${res%% *}" = "200" ] && ok "fetch $res" || bad "fetch -> $res"
fi

echo "== 5. Upload WITHOUT auth must be rejected =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 -X POST "$BASE/api/admin/upload" \
  -F "file=@$TMP/t.png;type=image/png")
[ "$code" = "401" ] && ok "unauth rejected 401" || bad "unauth -> $code (expected 401)"

echo "== 6. Non-image upload must be rejected =="
echo "not-an-image" > "$TMP/t.txt"
code=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" --max-time 15 -X POST "$BASE/api/admin/upload" \
  -F "file=@$TMP/t.txt;type=image/png")
[ "$code" = "415" ] || [ "$code" = "400" ] && ok "fake image rejected $code" || bad "fake image -> $code"

echo "== 7. Admin team & portfolio pages still fine =="
for p in team portfolio; do
  code=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" --max-time 20 "$BASE/admin/$p")
  [ "$code" = "200" ] && ok "/admin/$p 200" || bad "/admin/$p -> $code"
done

echo ""
echo "RESULT: $pass passed, $fail failed"
rm -rf "$JAR" "$TMP"
[ "$fail" = "0" ]
