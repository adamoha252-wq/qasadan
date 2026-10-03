#!/usr/bin/env bash
# QASADAN post-deploy LIVE smoke test — runs against https://qasadan.vercel.app
# Covers: public routes, 404, SEO files, canonical URL, auth guards, admin E2E,
# cloud storage E2E (Vercel -> Supabase), contact form E2E + cleanup, logout.
set -u
BASE="https://qasadan.vercel.app"
SKEY="${SUPABASE_SERVICE_ROLE_KEY:-$(grep '^SUPABASE_SERVICE_ROLE_KEY=' /home/z/my-project/.env | cut -d= -f2)}"
JAR=$(mktemp)
PASS=0; FAIL=0
ok ()  { PASS=$((PASS+1)); printf "  ok   - %s\n" "$1"; }
bad () { FAIL=$((FAIL+1)); printf "  FAIL - %s (expected %s, got %s)\n" "$1" "$2" "$3"; }
code_of () { curl -s -o /dev/null -m 30 -w "%{http_code}" "$@"; }

echo "=== 1. PUBLIC ROUTES ==="
for p in / /about /who-we-are /services /portfolio /news /contact; do
  c=$(code_of "$BASE$p")
  [ "$c" = "200" ] && ok "GET $p -> 200" || bad "GET $p" "200" "$c"
done

echo "=== 2. DB-DRIVEN CONTENT ==="
HOME_HTML=$(curl -s -m 30 "$BASE/")
echo "$HOME_HTML" | grep -qi "IRRDO" && ok "homepage shows featured project (IRRDO)" || bad "homepage featured project" "IRRDO present" "missing"
echo "$HOME_HTML" | grep -qi "QASADAN" && ok "homepage branding (QASADAN)" || bad "homepage branding" "QASADAN present" "missing"
c=$(code_of "$BASE/portfolio/irrdo")
[ "$c" = "200" ] && ok "GET /portfolio/irrdo -> 200" || bad "GET /portfolio/irrdo" "200" "$c"
IRRDO_HTML=$(curl -s -m 30 "$BASE/portfolio/irrdo")
echo "$IRRDO_HTML" | grep -qi "IRRDO" && ok "IRRDO case study has content" || bad "IRRDO case study content" "present" "missing"
c=$(code_of "$BASE/portfolio/al-huda-school")
[ "$c" = "200" ] && ok "GET /portfolio/al-huda-school -> 200" || bad "GET /portfolio/al-huda-school" "200" "$c"
FIRST_ARTICLE=$(curl -s -m 30 "$BASE/news" | grep -oE 'href="/news/[a-z0-9-]+"' | head -1 | sed 's/href="//;s/"//')
if [ -n "$FIRST_ARTICLE" ]; then
  c=$(code_of "$BASE$FIRST_ARTICLE")
  [ "$c" = "200" ] && ok "GET $FIRST_ARTICLE -> 200" || bad "GET $FIRST_ARTICLE" "200" "$c"
else
  bad "news article link" "found" "none"
fi

echo "=== 3. 404 + SEO ==="
c=$(code_of "$BASE/this-page-does-not-exist")
[ "$c" = "404" ] && ok "unknown page -> 404" || bad "unknown page" "404" "$c"
ROBOTS=$(curl -s -m 30 "$BASE/robots.txt")
echo "$ROBOTS" | grep -q "Disallow: /admin" && ok "robots.txt blocks /admin" || bad "robots.txt" "Disallow: /admin" "missing"
SITEMAP=$(curl -s -m 30 "$BASE/sitemap.xml")
echo "$SITEMAP" | grep -q "https://qasadan.vercel.app" && ok "sitemap uses live canonical URL" || bad "sitemap canonical" "qasadan.vercel.app" "missing"
c=$(code_of "$BASE/og-image.png")
[ "$c" = "200" ] && ok "GET /og-image.png -> 200" || bad "GET /og-image.png" "200" "$c"

echo "=== 4. AUTH GUARDS ==="
LOC=$(curl -s -o /dev/null -m 30 -w "%{redirect_url}" "$BASE/admin")
echo "$LOC" | grep -q "/admin/login" && ok "/admin redirects to login" || bad "/admin redirect" "/admin/login" "$LOC"
c=$(code_of "$BASE/admin/login")
[ "$c" = "200" ] && ok "GET /admin/login -> 200" || bad "GET /admin/login" "200" "$c"
c=$(code_of "$BASE/api/admin/auth/me")
[ "$c" = "401" ] && ok "admin API rejected without login (401)" || bad "admin API no-auth" "401" "$c"
NOSNIFF=$(curl -s -o /dev/null -m 30 -w "%{header_json}" "$BASE/" | grep -io "nosniff" | head -1)
[ -n "$NOSNIFF" ] && ok "security header X-Content-Type-Options" || bad "security headers" "nosniff" "missing"

echo "=== 5. ADMIN CMS E2E (production) ==="
c=$(code_of -c "$JAR" -H 'Content-Type: application/json' \
  -d '{"email":"admin@qasadan.com","password":"QasadanAdmin2026!"}' \
  "$BASE/api/admin/auth/login")
[ "$c" = "200" ] && ok "admin login -> 200" || bad "admin login" "200" "$c"
c=$(code_of -b "$JAR" "$BASE/admin")
[ "$c" = "200" ] && ok "admin dashboard renders with session" || bad "admin dashboard" "200" "$c"
c=$(code_of -b "$JAR" "$BASE/api/admin/stats")
[ "$c" = "200" ] && ok "admin stats API works" || bad "admin stats API" "200" "$c"

echo "=== 6. CLOUD STORAGE E2E (Vercel -> Supabase) ==="
PNG=$(mktemp --suffix=.png)
python3 -c "
import base64
open('$PNG','wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='))"
RESP=$(curl -s -m 60 -b "$JAR" -F "file=@$PNG;type=image/png" "$BASE/api/admin/upload")
URL=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null)
case "$URL" in
  https://yrnmyrthjwvstmzxkzwf.supabase.co/storage/v1/object/public/uploads/*)
    ok "upload returned Supabase public URL" ;;
  *) bad "upload URL" "supabase public URL" "${URL:-no url: $RESP}" ;;
esac
if [ -n "$URL" ]; then
  c=$(code_of "$URL")
  [ "$c" = "200" ] && ok "uploaded image publicly fetchable" || bad "fetch uploaded image" "200" "$c"
  c=$(code_of -b "$JAR" -X DELETE -H 'Content-Type: application/json' -d "{\"url\":\"$URL\"}" "$BASE/api/admin/upload")
  [ "$c" = "200" ] && ok "admin delete of uploaded image" || bad "delete upload" "200" "$c"
  OBJPATH=$(echo "$URL" | sed 's|.*/object/public/uploads/||')
  REMAINING=$(curl -s -m 30 -H "apikey: $SKEY" -H "Authorization: Bearer $SKEY" \
    -X POST -H "Content-Type: application/json" \
    -d "{\"prefix\":\"$(dirname "$OBJPATH")/\",\"limit\":100}" \
    "https://yrnmyrthjwvstmzxkzwf.supabase.co/storage/v1/object/list/uploads")
  [ "$REMAINING" = "[]" ] && ok "object removed from Supabase origin" || bad "storage origin cleanup" "[]" "$REMAINING"
fi
rm -f "$PNG"

echo "=== 7. CONTACT FORM E2E + CMS CLEANUP ==="
c=$(code_of -H 'Content-Type: application/json' \
  -d '{"name":"Live Smoke Test","email":"smoketest@qasadan.com","subject":"Post-deploy check","message":"Automated live smoke test message - please ignore. This verifies the production contact form works end to end."}' \
  "$BASE/api/contact")
[ "$c" = "201" ] && ok "contact form submission -> 201" || bad "contact form" "201" "$c"
INQ=$(curl -s -m 30 -b "$JAR" "$BASE/api/admin/inquiries")
TEST_ID=$(echo "$INQ" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('inquiries') or data.get('items') or []
for i in items:
    if i.get('email') == 'smoketest@qasadan.com':
        print(i.get('id')); break
" 2>/dev/null)
if [ -n "$TEST_ID" ]; then
  ok "test inquiry visible in admin CMS"
  c=$(code_of -b "$JAR" -X DELETE "$BASE/api/admin/inquiries/$TEST_ID")
  [ "$c" = "200" ] && ok "test inquiry deleted (CMS management works)" || bad "delete test inquiry" "200" "$c"
else
  bad "test inquiry in CMS" "found in list" "not found"
fi

echo "=== 8. LOGOUT ==="
c=$(code_of -b "$JAR" -X POST "$BASE/api/admin/auth/logout")
[ "$c" = "200" ] && ok "logout -> 200" || bad "logout" "200" "$c"
c=$(code_of -b "$JAR" "$BASE/api/admin/auth/me")
[ "$c" = "401" ] && ok "session invalid after logout" || bad "session after logout" "401" "$c"

echo
echo "RESULT: $PASS passed, $FAIL failed"
rm -f "$JAR"
[ "$FAIL" -eq 0 ]
