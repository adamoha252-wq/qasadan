#!/bin/bash
# QASADAN Phase 8 — Full regression runner.
# Runs every phase test suite in order and reports a combined summary.
set -u
cd /home/z/my-project

echo "================================================================"
echo "QASADAN COMPLETE QA REGRESSION — $(date '+%F %T')"
echo "================================================================"

declare -a SUITES=(
  "verify-db.ts:Database (Phase 2)"
  "test-auth.ts:Authentication (Phase 3)"
  "test-public.ts:Public website (Phase 4)"
  "test-cms.ts:Admin CMS (Phase 5)"
  "test-storage.ts:Storage (Phase 6)"
  "test-seo.ts:SEO/Perf (Phase 7)"
  "test-security.ts:Security (Phase 8)"
)

TOTAL_PASS=0
declare -a RESULTS=()

for entry in "${SUITES[@]}"; do
  script="${entry%%:*}"
  label="${entry#*:}"
  echo ""
  echo "▶▶ $label — bun scripts/$script"
  echo "------------------------------------------------"
  # Ensure the dev server is up before each suite
  bash .zscripts/ensure-dev.sh 30 > /dev/null 2>&1
  OUTPUT=$(bun 'scripts/'"$script" 2>&1)
  EXIT=$?
  echo "$OUTPUT" | grep -E "RESULT|FAIL" | tail -5
  if [ $EXIT -eq 0 ]; then
    COUNT=$(echo "$OUTPUT" | grep -oE "RESULT: [0-9]+ passed" | grep -oE "[0-9]+" | head -1)
    TOTAL_PASS=$((TOTAL_PASS + ${COUNT:-0}))
    RESULTS+=("✅ $label: $COUNT passed")
  else
    RESULTS+=("❌ $label: FAILED")
    echo "$OUTPUT" | tail -20
  fi
done

echo ""
echo "================================================================"
echo "COMBINED RESULTS:"
for r in "${RESULTS[@]}"; do echo "  $r"; done
echo "  TOTAL: $TOTAL_PASS checks passed"
echo "================================================================"
