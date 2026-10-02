#!/usr/bin/env bash
# E2E test: CMS upload → Supabase Storage → public URL → delete.
set -u
BASE="http://localhost:3000"
SKEY="${SUPABASE_SERVICE_ROLE_KEY:-$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d= -f2)}"
JAR=$(mktemp)
PASS=0; FAIL=0
check () { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ok  - $1"; else FAIL=$((FAIL+1)); echo "  FAIL - $1 (expected $2, got $3)"; fi }

# 1x1 transparent PNG (valid magic bytes)
PNG=/tmp/test-upload.png
python3 -c "
import base64
open('/tmp/test-upload.png','wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='))"

echo "== login =="
code=$(curl -s -o /dev/null -w "%{http_code}" -c "$JAR" -H 'Content-Type: application/json' \
  -H 'x-forwarded-for: 203.0.113.90' \
  -d '{"email":"admin@qasadan.com","password":"QasadanAdmin2026!"}' \
  "$BASE/api/admin/auth/login")
check "admin login" "200" "$code"

echo "== upload to cloud =="
RESP=$(curl -s -b "$JAR" -H 'x-forwarded-for: 203.0.113.90' \
  -F "file=@$PNG;type=image/png" "$BASE/api/admin/upload")
echo "  response: $RESP"
URL=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null)
case "$URL" in
  https://yrnmyrthjwvstmzxkzwf.supabase.co/storage/v1/object/public/uploads/*)
    check "returned Supabase public URL" "yes" "yes" ;;
  *) check "returned Supabase public URL" "yes" "NO ($URL)" ;;
esac

echo "== fetch uploaded image anonymously =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$URL")
check "public URL serves image" "200" "$code"
ctype=$(curl -s -o /dev/null -w "%{content_type}" --max-time 20 "$URL")
check "content-type is image/png" "image/png" "$ctype"

echo "== delete via admin API =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X DELETE \
  -H 'Content-Type: application/json' -H 'x-forwarded-for: 203.0.113.90' \
  -d "{\"url\":\"$URL\"}" "$BASE/api/admin/upload")
check "delete returns 200" "200" "$code"
# Note: the public CDN URL may still serve a cached copy briefly after delete —
# that is expected edge-cache behavior. The authoritative check is the origin
# bucket listing below.
OBJPATH=$(echo "$URL" | sed 's|.*/object/public/uploads/||')
REMAINING=$(curl -s --max-time 20 -H "apikey: $SKEY" -H "Authorization: Bearer $SKEY" \
  -X POST -H "Content-Type: application/json" \
  -d "{\"prefix\":\"$(dirname "$OBJPATH")/\",\"limit\":100}" \
  "https://yrnmyrthjwvstmzxkzwf.supabase.co/storage/v1/object/list/uploads")
case "$REMAINING" in
  "[]") check "object removed from storage origin" "yes" "yes" ;;
  *) check "object removed from storage origin" "yes" "NO ($REMAINING)" ;;
esac

echo
echo "RESULT: $PASS passed, $FAIL failed"
rm -f "$JAR" "$PNG"
[ "$FAIL" -eq 0 ]
