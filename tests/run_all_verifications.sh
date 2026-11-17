#!/bin/bash
set -e

if ! command -v agent-browser >/dev/null 2>&1; then
  NPX_AGENT_BIN=$(find "${HOME}/.npm/_npx" -maxdepth 5 -path "*/.bin/agent-browser" 2>/dev/null | head -n 1)
  if [ -n "$NPX_AGENT_BIN" ]; then
    export PATH="$(dirname "$NPX_AGENT_BIN"):$PATH"
  fi
fi

echo "=== 1. HTMLHint Validation ==="
npx --yes htmlhint "*.html" "tools/*.html"

echo -e "\n=== 2. ESLint Code Quality ==="
npx --yes eslint assets/js/core/*.js assets/js/tools/*.js assets/js/global.js scripts/*.mjs

echo -e "\n=== 3. Stylelint CSS Validation ==="
npx --yes stylelint "assets/css/*.css"

echo -e "\n=== 4. Unit & Property-Based Test Suite ==="
python3 tests/test_suite.py

echo -e "\n=== 5. End-to-End Headless Browser Suite ==="
python3 tests/test_e2e.py

echo -e "\n=== 6. Automated WCAG 2.2 AA Accessibility (a11y) Audit ==="
python3 tests/test_a11y.py

echo -e "\n=============================================="
echo "🎉 ALL 6 VERIFICATION SUITES PASSED CLEANLY! 🎉"
echo "=============================================="
