#!/bin/bash
set -e

echo "=== 1. HTMLHint Validation ==="
npx htmlhint "*.html" "tools/*.html"

echo -e "\n=== 2. ESLint Code Quality ==="
npx eslint assets/js/core/*.js assets/js/tools/*.js assets/js/global.js

echo -e "\n=== 3. Stylelint CSS Validation ==="
npx stylelint "assets/css/*.css"

echo -e "\n=== 4. Unit & Property-Based Test Suite ==="
python3 tests/test_suite.py

echo -e "\n=== 5. End-to-End Headless Browser Suite ==="
python3 tests/test_e2e.py

echo -e "\n=== 6. Automated WCAG 2.2 AA Accessibility (a11y) Audit ==="
python3 tests/test_a11y.py

echo -e "\n=============================================="
echo "🎉 ALL 6 VERIFICATION SUITES PASSED CLEANLY! 🎉"
echo "=============================================="
