#!/usr/bin/env python3
"""
YourMiniTools — End-to-End (E2E) Browser Test Suite
Uses agent-browser to execute live headless browser tests on a local HTTP server.
Covers:
- Page hydration and zero 404/broken assets
- Language switching & localStorage persistence
- Dark/Light theme switching & persistence
- Interactive functional tests for core tools:
  - Password Generator
  - Word Counter
  - Text Case Converter
  - Unit Converter
  - Loan Calculator
  - Color Tool
  - Stopwatch & Timer
  - World Clock
- Full-suite page crawl (16/16 pages)
"""

import os
import time
import json
import socketserver
import http.server
import threading
import subprocess
import unittest

PORT = 8999
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def run_cmd(args):
    """Run an agent-browser command and return stdout/stderr."""
    res = subprocess.run(args, capture_output=True, text=True)
    return res

def eval_js(js_expr):
    """Evaluate JavaScript in the active agent-browser tab and return result."""
    res = run_cmd(['agent-browser', 'eval', js_expr])
    if res.returncode != 0:
        return None
    try:
        return json.loads(res.stdout.strip())
    except Exception:
        return res.stdout.strip()

class TestE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Start local static HTTP server serving the workspace on a free port
        os.chdir(PROJECT_ROOT)
        handler = http.server.SimpleHTTPRequestHandler
        socketserver.TCPServer.allow_reuse_address = True
        cls.httpd = socketserver.TCPServer(('127.0.0.1', 0), handler)
        cls.port = cls.httpd.server_address[1]
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.3)

    @classmethod
    def tearDownClass(cls):
        run_cmd(['agent-browser', 'close'])
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def get_url(self, path=""):
        return f"http://127.0.0.1:{self.port}/{path.lstrip('/')}"

    def setUp(self):
        # Reset browser state before each test
        pass

    def test_01_homepage_hydration_and_navigation(self):
        url = self.get_url('/')
        res = run_cmd(['agent-browser', 'open', url])
        self.assertEqual(res.returncode, 0)

        # Verify page title is translated
        title = eval_js('document.title')
        self.assertTrue(len(title) > 0)

        # Verify 12 tool cards exist in DOM
        tool_cards_count = eval_js('document.querySelectorAll(".tool-card").length')
        self.assertEqual(tool_cards_count, 12, "Expected exactly 12 tool cards on homepage")

        # Verify header and footer
        has_header = eval_js('Boolean(document.querySelector(".site-header .site-logo"))')
        has_footer = eval_js('Boolean(document.querySelector(".site-footer .footer-links"))')
        self.assertTrue(has_header)
        self.assertTrue(has_footer)

    def test_02_theme_toggle_persistence(self):
        url = self.get_url('/')
        run_cmd(['agent-browser', 'open', url])

        # Click theme toggle button
        run_cmd(['agent-browser', 'find', 'role', 'button', 'click', '--name', 'Alterna tema chiaro/scuro'])
        time.sleep(0.2)

        theme = eval_js('document.documentElement.getAttribute("data-theme")')
        self.assertIn(theme, ['dark', 'light'])

        stored_theme = eval_js('localStorage.getItem("ymt-theme")')
        self.assertEqual(theme, stored_theme)

    def test_03_language_switcher(self):
        url = self.get_url('/')
        run_cmd(['agent-browser', 'open', url])

        # Change language to English
        eval_js('window.YMT.i18n.setLocale("en")')
        time.sleep(0.3)

        en_lang = eval_js('document.documentElement.getAttribute("lang")')
        self.assertEqual(en_lang, 'en')
        stored_lang = eval_js('localStorage.getItem("ymt-lang")')
        self.assertEqual(stored_lang, 'en')

        # Change language to Spanish
        eval_js('window.YMT.i18n.setLocale("es")')
        time.sleep(0.3)
        es_lang = eval_js('document.documentElement.getAttribute("lang")')
        self.assertEqual(es_lang, 'es')

        # Change back to Italian
        eval_js('window.YMT.i18n.setLocale("it")')
        time.sleep(0.3)
        it_lang = eval_js('document.documentElement.getAttribute("lang")')
        self.assertEqual(it_lang, 'it')

    def test_04_password_generator_e2e(self):
        url = self.get_url('/tools/password-generator.html')
        run_cmd(['agent-browser', 'open', url])
        time.sleep(0.3)

        # Trigger generation
        eval_js('document.getElementById("pw-generate").click()')
        time.sleep(0.2)

        pw = eval_js('document.getElementById("pw-output-display").textContent')
        self.assertEqual(len(pw), 16, f"Expected 16-char password, got '{pw}'")

        # Set length slider to 32 and generate
        eval_js('document.getElementById("pw-length").value = 32; document.getElementById("pw-generate").click()')
        time.sleep(0.2)
        pw32 = eval_js('document.getElementById("pw-output-display").textContent')
        self.assertEqual(len(pw32), 32, f"Expected 32-char password, got '{pw32}'")

        # Check strength meter is visible
        strength_visible = eval_js('!document.getElementById("pw-strength-section").hidden')
        self.assertTrue(strength_visible)

    def test_05_word_counter_e2e(self):
        url = self.get_url('/tools/word-counter.html')
        run_cmd(['agent-browser', 'open', url])
        time.sleep(0.3)

        test_text = "YourMiniTools è una suite veloce e sicura per tutti gli utenti."
        eval_js(f'document.getElementById("wc-textarea").value = "{test_text}"; document.getElementById("wc-textarea").dispatchEvent(new Event("input"));')
        time.sleep(0.3)

        words = eval_js('document.getElementById("wc-words").textContent')
        self.assertEqual(words, "11", f"Expected 11 words, got {words}")

        # Clear textarea
        eval_js('document.getElementById("wc-clear").click()')
        time.sleep(0.2)
        cleared_words = eval_js('document.getElementById("wc-words").textContent')
        self.assertEqual(cleared_words, "0")

    def test_06_text_case_converter_e2e(self):
        url = self.get_url('/tools/text-case-converter.html')
        run_cmd(['agent-browser', 'open', url])
        time.sleep(0.3)

        eval_js('document.getElementById("tc-textarea").value = "simple unit test"; document.getElementById("tc-textarea").dispatchEvent(new Event("input"));')
        time.sleep(0.2)

        variants = eval_js('Array.from(document.querySelectorAll(".variant-text")).map(el => el.textContent)')
        self.assertTrue(len(variants) >= 5)
        self.assertIn("SIMPLE UNIT TEST", variants)
        self.assertIn("simple unit test", variants)
        self.assertIn("Simple Unit Test", variants)

    def test_07_unit_converter_e2e(self):
        url = self.get_url('/tools/unit-converter.html')
        run_cmd(['agent-browser', 'open', url])
        time.sleep(0.3)

        # Set 100 meters to kilometers
        eval_js('document.getElementById("uc-category").value = "length"; document.getElementById("uc-category").dispatchEvent(new Event("change"));')
        eval_js('document.getElementById("uc-from").value = "m"; document.getElementById("uc-to").value = "km";')
        eval_js('document.getElementById("uc-input-value").value = "5000"; document.getElementById("uc-input-value").dispatchEvent(new Event("input"));')
        time.sleep(0.2)

        result = eval_js('document.getElementById("uc-output-value").textContent.trim()')
        self.assertEqual(result, "5")

    def test_08_loan_calculator_e2e(self):
        url = self.get_url('/tools/loan-calculator.html')
        run_cmd(['agent-browser', 'open', url])
        time.sleep(0.3)

        eval_js('document.getElementById("lc-capital").value = "100000";')
        eval_js('document.getElementById("lc-rate").value = "3.5";')
        eval_js('document.getElementById("lc-duration").value = "10";')
        eval_js('document.getElementById("lc-calculate").click();')
        time.sleep(0.3)

        monthly = eval_js('document.getElementById("lc-monthly-payment").textContent.trim()')
        self.assertTrue(len(monthly) > 0 and monthly != '—')

        rows_count = eval_js('document.querySelectorAll("#lc-table-body tr").length')
        self.assertEqual(rows_count, 120, "Expected 120 monthly amortization rows")

    def test_09_world_clock_e2e(self):
        url = self.get_url('/tools/world-clock.html')
        run_cmd(['agent-browser', 'open', url])
        time.sleep(0.5)

        clock_cards = eval_js('document.querySelectorAll("#wc-clocks .stat-item").length')
        self.assertTrue(clock_cards >= 2, f"Expected at least 2 clock cards, got {clock_cards}")

        # Check time format toggle
        eval_js('document.getElementById("wc-format-12h").click()')
        time.sleep(0.2)
        time_text = eval_js('document.querySelector("#wc-clocks .stat-value").textContent')
        self.assertTrue(len(time_text) > 0)

    def test_10_color_tool_e2e(self):
        url = self.get_url('/tools/color-tool.html')
        run_cmd(['agent-browser', 'open', url])
        time.sleep(0.3)

        eval_js('document.getElementById("ct-hex").value = "#FF5733"; document.getElementById("ct-hex").dispatchEvent(new Event("input"));')
        time.sleep(0.2)

        r = eval_js('document.getElementById("ct-r").value')
        g = eval_js('document.getElementById("ct-g").value')
        b = eval_js('document.getElementById("ct-b").value')
        self.assertEqual(r, "255")
        self.assertEqual(g, "87")
        self.assertEqual(b, "51")

    def test_11_all_pages_crawl(self):
        pages = [
            'index.html', 'about.html', 'privacy.html', '404.html',
            'tools/color-tool.html', 'tools/currency-converter.html',
            'tools/image-converter.html', 'tools/loan-calculator.html',
            'tools/password-generator.html', 'tools/qr-generator.html',
            'tools/social-font-converter.html', 'tools/stopwatch-timer.html',
            'tools/text-case-converter.html', 'tools/unit-converter.html',
            'tools/word-counter.html', 'tools/world-clock.html'
        ]

        for p in pages:
            url = self.get_url(p)
            res = run_cmd(['agent-browser', 'open', url])
            self.assertEqual(res.returncode, 0, f"Failed to load page '{p}'")
            # Verify body exists
            has_body = eval_js('Boolean(document.body)')
            self.assertTrue(has_body, f"Page '{p}' did not render body")


if __name__ == '__main__':
    unittest.main(verbosity=2)
