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
        time.sleep(0.2)

        # Verify accessible button name matches current localized label before clicking
        initial_info = eval_js('''(() => {
            var btn = document.getElementById("theme-toggle");
            return {
                btnText: btn.innerText.trim(),
                expectedDark: YMT.i18n.t("common.switchToDark"),
                expectedLight: YMT.i18n.t("common.switchToLight")
            };
        })()''')
        self.assertEqual(initial_info['btnText'], initial_info['expectedDark'])

        # Click theme toggle button (switches from OS default light -> explicit dark)
        run_cmd(['agent-browser', 'find', 'role', 'button', 'click', '--name', initial_info['expectedDark']])
        time.sleep(0.2)

        theme = eval_js('document.documentElement.getAttribute("data-theme")')
        self.assertEqual(theme, 'dark')

        stored_theme = eval_js('localStorage.getItem("ymt-theme")')
        self.assertEqual(stored_theme, 'dark')

        meta_cs = eval_js('document.querySelector(\'meta[name="color-scheme"]\').getAttribute("content")')
        self.assertEqual(meta_cs, 'dark')

        # Reload with ymt-theme="dark" already stored to verify synchronous anti-FOUC init
        run_cmd(['agent-browser', 'open', url])
        time.sleep(0.2)
        reloaded = eval_js('''(() => ({
            theme: document.documentElement.getAttribute("data-theme"),
            meta: document.querySelector('meta[name="color-scheme"]').getAttribute("content"),
            btnText: document.getElementById("theme-toggle").innerText.trim()
        }))()''')
        self.assertEqual(reloaded['theme'], 'dark')
        self.assertEqual(reloaded['meta'], 'dark')
        self.assertEqual(reloaded['btnText'], initial_info['expectedLight'])

        # Cross-tab storage event sync
        eval_js('window.dispatchEvent(new StorageEvent("storage", { key: "ymt-theme", newValue: "light" }))')
        synced_theme = eval_js('document.documentElement.getAttribute("data-theme")')
        self.assertEqual(synced_theme, 'light')

        # Restore dark via toggle test (light -> dark when clicking dark label, or reset back via click)
        eval_js('localStorage.setItem("ymt-theme", "dark"); window.dispatchEvent(new StorageEvent("storage", { key: "ymt-theme", newValue: "dark" }))')

        # Second click reverts back to OS default (removes explicit override)
        run_cmd(['agent-browser', 'find', 'role', 'button', 'click', '--name', initial_info['expectedLight']])
        time.sleep(0.2)

        theme_reset = eval_js('document.documentElement.getAttribute("data-theme")')
        stored_reset = eval_js('localStorage.getItem("ymt-theme")')
        meta_reset = eval_js('document.querySelector(\'meta[name="color-scheme"]\').getAttribute("content")')
        self.assertIsNone(theme_reset)
        self.assertIsNone(stored_reset)
        self.assertEqual(meta_reset, 'light dark')

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
            # Verify body exists and zero uncaught JS errors occurred
            has_body = eval_js('Boolean(document.body)')
            self.assertTrue(has_body, f"Page '{p}' did not render body")
            errs = run_cmd(['agent-browser', 'errors'])
            self.assertEqual(errs.stdout.strip(), '', f"Uncaught JS errors on '{p}': {errs.stdout}")

    def test_12_css_typography_and_touch_targets(self):
        url = self.get_url('/')
        run_cmd(['agent-browser', 'open', url])
        time.sleep(0.3)

        info = eval_js('''(() => {
            var doc = document.documentElement;
            var langRect = document.querySelector('.lang-select').getBoundingClientRect();
            var region = document.querySelector('.notification-container');
            return {
                overflow: doc.scrollWidth > doc.clientWidth,
                scrollbarColor: getComputedStyle(doc).scrollbarColor,
                langW: langRect.width,
                langH: langRect.height,
                regionRole: region ? region.getAttribute('role') : null,
                regionLabel: region ? region.getAttribute('aria-label') : ''
            };
        })()''')
        self.assertFalse(info['overflow'], "Homepage should not horizontally overflow")
        self.assertTrue(info['scrollbarColor'] and info['scrollbarColor'] != 'auto',
                        f"Expected custom scrollbar-color, got {info['scrollbarColor']}")
        self.assertGreaterEqual(info['langW'], 44)
        self.assertGreaterEqual(info['langH'], 44)
        self.assertEqual(info['regionRole'], 'region')
        self.assertTrue(len(info['regionLabel']) > 0)

        # Password generator: .form-check touch target & no user-select: none
        run_cmd(['agent-browser', 'open', self.get_url('/tools/password-generator.html')])
        time.sleep(0.3)
        check_info = eval_js('''(() => {
            var fc = document.querySelector('.form-check');
            var r = fc.getBoundingClientRect();
            return { h: r.height, userSelect: getComputedStyle(fc).userSelect };
        })()''')
        self.assertGreaterEqual(check_info['h'], 44)
        self.assertNotEqual(check_info['userSelect'], 'none')

        # Color tool: .color-swatch >= 44px
        run_cmd(['agent-browser', 'open', self.get_url('/tools/color-tool.html')])
        time.sleep(0.3)
        ct_info = eval_js('''(() => {
            var sec = document.getElementById('ct-palette-section');
            sec.hidden = false;
            var sw = document.createElement('button');
            sw.type = 'button';
            sw.className = 'color-swatch';
            document.getElementById('ct-palette').appendChild(sw);
            var r = sw.getBoundingClientRect();
            return { swW: r.width, swH: r.height };
        })()''')
        self.assertGreaterEqual(ct_info['swW'], 44)
        self.assertGreaterEqual(ct_info['swH'], 44)

        # World clock: rendered .btn-sm >= 44px
        run_cmd(['agent-browser', 'open', self.get_url('/tools/world-clock.html')])
        time.sleep(0.4)
        btn_info = eval_js('''(() => {
            var btn = document.querySelector('.btn-sm').getBoundingClientRect();
            return { btnW: btn.width, btnH: btn.height };
        })()''')
        self.assertGreaterEqual(btn_info['btnW'], 44)
        self.assertGreaterEqual(btn_info['btnH'], 44)

        # QR generator: autocomplete attributes on Tel, Email, vCard
        run_cmd(['agent-browser', 'open', self.get_url('/tools/qr-generator.html')])
        time.sleep(0.3)
        qr_ac = eval_js('''(() => ({
            tel: document.getElementById('qr-input-tel').getAttribute('autocomplete'),
            email: document.getElementById('qr-input-email').getAttribute('autocomplete'),
            vName: document.getElementById('qr-vcard-name').getAttribute('autocomplete'),
            vTel: document.getElementById('qr-vcard-tel').getAttribute('autocomplete'),
            vEmail: document.getElementById('qr-vcard-email').getAttribute('autocomplete'),
            vOrg: document.getElementById('qr-vcard-org').getAttribute('autocomplete')
        }))()''')
        self.assertEqual(qr_ac, {
            'tel': 'tel', 'email': 'email', 'vName': 'name',
            'vTel': 'tel', 'vEmail': 'email', 'vOrg': 'organization'
        })

    def test_13_validation_and_numeric_normalization(self):
        # validation.js: preserve .form-hint on multiple errors & use aria-live="polite"
        run_cmd(['agent-browser', 'open', self.get_url('/tools/loan-calculator.html')])
        time.sleep(0.3)
        val_res = eval_js('''(() => {
            var el = document.getElementById('lc-capital');
            el.setAttribute('aria-describedby', 'lc-capital-hint');
            YMT.showFieldError(el, 'Err 1');
            var errSpan = el.closest('.form-group').querySelector('.form-error');
            var after1 = el.getAttribute('aria-describedby');
            var live = errSpan.getAttribute('aria-live');
            var role = errSpan.getAttribute('role');
            YMT.showFieldError(el, 'Err 2');
            var after2 = el.getAttribute('aria-describedby');
            YMT.clearFieldError(el);
            var afterClear = el.getAttribute('aria-describedby');
            return { after1: after1, after2: after2, afterClear: afterClear, live: live, role: role };
        })()''')
        self.assertEqual(val_res['live'], 'polite')
        self.assertIsNone(val_res['role'])
        self.assertEqual(val_res['after1'], 'lc-capital-hint err-lc-capital')
        self.assertEqual(val_res['after2'], 'lc-capital-hint err-lc-capital')
        self.assertEqual(val_res['afterClear'], 'lc-capital-hint')

        # Color tool numeric normalization (empty, comma, dot/clamp)
        run_cmd(['agent-browser', 'open', self.get_url('/tools/color-tool.html')])
        time.sleep(0.3)
        ct_res = eval_js('''(() => {
            var r = document.getElementById('ct-r');
            r.value = '';
            r.dispatchEvent(new Event('input'));
            var midEmpty = r.value;
            r.dispatchEvent(new Event('blur'));
            var afterEmpty = r.value;

            r.value = '41,6';
            r.dispatchEvent(new Event('input'));
            r.dispatchEvent(new Event('blur'));
            var afterComma = r.value;

            r.value = '300.4';
            r.dispatchEvent(new Event('input'));
            r.dispatchEvent(new Event('blur'));
            var afterClamp = r.value;
            return { type: r.type, mode: r.getAttribute('inputmode'), midEmpty: midEmpty, afterEmpty: afterEmpty, afterComma: afterComma, afterClamp: afterClamp };
        })()''')
        self.assertEqual(ct_res['type'], 'text')
        self.assertEqual(ct_res['mode'], 'numeric')
        self.assertEqual(ct_res['midEmpty'], '')
        self.assertEqual(ct_res['afterEmpty'], '0')
        self.assertEqual(ct_res['afterComma'], '42')
        self.assertEqual(ct_res['afterClamp'], '255')

        # Stopwatch timer numeric normalization
        run_cmd(['agent-browser', 'open', self.get_url('/tools/stopwatch-timer.html')])
        time.sleep(0.3)
        tm_res = eval_js('''(() => {
            var m = document.getElementById('tm-minutes');
            m.value = '1,5';
            m.dispatchEvent(new Event('input'));
            var liveDisp = document.getElementById('tm-display').textContent;
            m.dispatchEvent(new Event('blur'));
            var normComma = m.value;
            m.value = '';
            m.dispatchEvent(new Event('blur'));
            return { type: m.type, mode: m.getAttribute('inputmode'), liveDisp: liveDisp, normComma: normComma, normEmpty: m.value };
        })()''')
        self.assertEqual(tm_res['type'], 'text')
        self.assertEqual(tm_res['mode'], 'numeric')
        self.assertEqual(tm_res['liveDisp'], '02:00')
        self.assertEqual(tm_res['normComma'], '2')
        self.assertEqual(tm_res['normEmpty'], '0')

    def test_14_popover_toast_lifecycle(self):
        run_cmd(['agent-browser', 'open', self.get_url('/tools/word-counter.html')])
        time.sleep(0.3)

        init_info = eval_js('''(() => {
            var trigger = document.getElementById('wc-textarea');
            trigger.focus();
            window._t1 = YMT.showNotification('First toast message', 'info', 250);
            window._t = YMT.showNotification('Saved successfully', 'success', 250);
            var btn = window._t.querySelector('.notification-close');
            var rect = btn.getBoundingClientRect();
            var r1 = window._t1.getBoundingClientRect();
            var r2 = window._t.getBoundingClientRect();
            btn.focus();
            return {
                popover: window._t.getAttribute('popover'),
                open: window._t.matches(':popover-open'),
                stackedBelow: r2.top > r1.bottom,
                closeW: rect.width,
                closeH: rect.height,
                focusRestoredEarly: document.activeElement === btn
            };
        })()''')
        self.assertEqual(init_info['popover'], 'manual')
        self.assertTrue(init_info['open'])
        self.assertTrue(init_info['stackedBelow'])
        self.assertGreaterEqual(init_info['closeW'], 44)
        self.assertGreaterEqual(init_info['closeH'], 44)
        self.assertTrue(init_info['focusRestoredEarly'])

        # Wait past 250ms timeout; toast must stay open while focus is inside
        time.sleep(0.4)
        still_open = eval_js('window._t.matches(":popover-open")')
        self.assertTrue(still_open, "Toast timer should remain paused while focus is inside")

        # Click close button and confirm toast closes & restores focus to prior element
        eval_js('window._t.querySelector(".notification-close").click()')
        time.sleep(0.5)
        after_close = eval_js('''(() => ({
            connected: window._t.isConnected,
            activeId: document.activeElement ? document.activeElement.id : null
        }))()''')
        self.assertFalse(after_close['connected'])
        self.assertEqual(after_close['activeId'], 'wc-textarea')

    def test_15_mpa_view_transitions_and_speculation_rules(self):
        run_cmd(['agent-browser', 'open', self.get_url('/index.html')])
        time.sleep(0.3)

        info = eval_js('''(() => {
            var rulesEl = document.querySelector('script[type="speculationrules"]');
            var parsed = rulesEl ? JSON.parse(rulesEl.textContent) : null;
            var cards = document.querySelectorAll('a.tool-card[href^="/tools/"]').length;
            var sheet = Array.from(document.styleSheets).find(s => s.href && s.href.includes('global.css'));
            var cssText = sheet ? Array.from(sheet.cssRules).map(r => r.cssText).join('\\n') : '';
            return {
                supportsVT: 'onpagereveal' in window,
                supportsSpeculation: HTMLScriptElement.supports ? HTMLScriptElement.supports('speculationrules') : null,
                hasViewTransitionRule: cssText.includes('@view-transition') && cssText.includes('navigation: auto'),
                hasSpecRules: Boolean(parsed),
                prefetchEagerness: parsed && parsed.prefetch && parsed.prefetch[0] ? parsed.prefetch[0].eagerness : null,
                toolCards: cards
            };
        })()''')
        self.assertTrue(info['supportsVT'])
        self.assertTrue(info['supportsSpeculation'])
        self.assertTrue(info['hasViewTransitionRule'])
        self.assertTrue(info['hasSpecRules'])
        self.assertEqual(info['prefetchEagerness'], 'moderate')
        self.assertEqual(info['toolCards'], 12)

    def test_16_back_to_top_scroll_state_and_fallback(self):
        run_cmd(['agent-browser', 'open', self.get_url('/index.html')])
        time.sleep(0.3)

        # Native CSS @container scroll-state(scrollable: top) path
        native_info = eval_js('''(async () => {
            document.body.style.minHeight = '2500px';
            window.scrollTo({ top: 0, behavior: 'instant' });
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            var btn = document.querySelector('.back-to-top');
            var before = {
                containerType: getComputedStyle(document.documentElement).containerType,
                dataVisible: btn.getAttribute('data-visible'),
                visibility: getComputedStyle(btn).visibility,
                opacity: getComputedStyle(btn).opacity
            };
            window.scrollTo({ top: 400, behavior: 'instant' });
            var showDeadline = performance.now() + 1000;
            while (performance.now() < showDeadline) {
                await new Promise(r => requestAnimationFrame(r));
                if (getComputedStyle(btn).opacity === '1' && getComputedStyle(btn).visibility === 'visible') break;
            }
            var after = {
                scrollY: window.scrollY,
                dataVisible: btn.getAttribute('data-visible'),
                visibility: getComputedStyle(btn).visibility,
                opacity: getComputedStyle(btn).opacity
            };
            return {
                supportsScrollState: CSS.supports('container-type', 'scroll-state'),
                before: before,
                after: after
            };
        })()''')
        self.assertTrue(native_info['supportsScrollState'])
        self.assertEqual(native_info['before']['containerType'], 'scroll-state')
        self.assertIsNone(native_info['before']['dataVisible'])
        self.assertEqual(native_info['before']['visibility'], 'hidden')
        self.assertEqual(native_info['before']['opacity'], '0')
        self.assertGreaterEqual(native_info['after']['scrollY'], 350)
        self.assertIsNone(native_info['after']['dataVisible'])
        self.assertEqual(native_info['after']['visibility'], 'visible')
        self.assertEqual(native_info['after']['opacity'], '1')

        # Click back-to-top and verify scroll resets to 0 and button hides
        eval_js('document.querySelector(".back-to-top").click()')
        after_click = eval_js('''(async () => {
            var btn = document.querySelector('.back-to-top');
            var deadline = performance.now() + 2000;
            while (performance.now() < deadline) {
                await new Promise(r => requestAnimationFrame(r));
                if (window.scrollY === 0 && getComputedStyle(btn).visibility === 'hidden' && getComputedStyle(btn).opacity === '0') {
                    break;
                }
            }
            return {
                scrollY: window.scrollY,
                visibility: getComputedStyle(btn).visibility,
                opacity: getComputedStyle(btn).opacity
            };
        })()''')
        self.assertEqual(after_click['scrollY'], 0)
        self.assertEqual(after_click['visibility'], 'hidden')
        self.assertEqual(after_click['opacity'], '0')

        # Simulate unsupported browser (CSS.supports('container-type', 'scroll-state') === false) -> JS fallback
        fallback_info = eval_js('''(async () => {
            var oldBtn = document.querySelector('.back-to-top');
            if (oldBtn) oldBtn.remove();
            var origSupports = CSS.supports.bind(CSS);
            CSS.supports = function (prop, val) {
                if (prop === 'container-type' && val === 'scroll-state') return false;
                return origSupports(prop, val);
            };
            await new Promise((resolve, reject) => {
                var s = document.createElement('script');
                s.src = '/assets/js/global.js?fallback_test=' + Date.now();
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
            document.dispatchEvent(new Event('DOMContentLoaded'));
            var btn = document.querySelector('.back-to-top');
            var atTop = btn.getAttribute('data-visible');
            window.scrollTo({ top: 100, behavior: 'instant' });
            window.dispatchEvent(new Event('scroll'));
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            var belowThreshold = btn.getAttribute('data-visible');
            window.scrollTo({ top: 450, behavior: 'instant' });
            window.dispatchEvent(new Event('scroll'));
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            var aboveThreshold = btn.getAttribute('data-visible');
            CSS.supports = origSupports;
            return { atTop: atTop, belowThreshold: belowThreshold, aboveThreshold: aboveThreshold };
        })()''')
        self.assertEqual(fallback_info['atTop'], 'false')
        self.assertEqual(fallback_info['belowThreshold'], 'false')
        self.assertEqual(fallback_info['aboveThreshold'], 'true')

    def test_17_stopwatch_timer_tabs_and_keyboard_e2e(self):
        run_cmd(['agent-browser', 'open', self.get_url('/tools/stopwatch-timer.html')])
        time.sleep(0.3)

        # Verify initial roving tabindex and native hidden state on inactive panels
        init_tabs = eval_js('''(() => ({
            swSel: document.getElementById('tab-stopwatch').getAttribute('aria-selected'),
            swTabIndex: document.getElementById('tab-stopwatch').getAttribute('tabindex'),
            tmSel: document.getElementById('tab-timer').getAttribute('aria-selected'),
            tmTabIndex: document.getElementById('tab-timer').getAttribute('tabindex'),
            swHidden: document.getElementById('panel-stopwatch').hidden,
            tmHidden: document.getElementById('panel-timer').hidden,
            pmHidden: document.getElementById('panel-pomodoro').hidden
        }))()''')
        self.assertEqual(init_tabs, {
            'swSel': 'true', 'swTabIndex': '0',
            'tmSel': 'false', 'tmTabIndex': '-1',
            'swHidden': False, 'tmHidden': True, 'pmHidden': True,
        })

        # Keyboard navigation: ArrowRight -> Timer, End -> Pomodoro, Home -> Stopwatch
        eval_js('document.getElementById("tab-stopwatch").focus()')
        run_cmd(['agent-browser', 'press', 'ArrowRight'])
        after_right = eval_js('''(() => ({
            activeId: document.activeElement.id,
            tmSel: document.getElementById('tab-timer').getAttribute('aria-selected'),
            tmTabIndex: document.getElementById('tab-timer').getAttribute('tabindex'),
            tmHidden: document.getElementById('panel-timer').hidden,
            swHidden: document.getElementById('panel-stopwatch').hidden
        }))()''')
        self.assertEqual(after_right, {
            'activeId': 'tab-timer',
            'tmSel': 'true', 'tmTabIndex': '0',
            'tmHidden': False, 'swHidden': True,
        })

        run_cmd(['agent-browser', 'press', 'End'])
        after_end = eval_js('''(() => ({
            activeId: document.activeElement.id,
            pmSel: document.getElementById('tab-pomodoro').getAttribute('aria-selected'),
            pmHidden: document.getElementById('panel-pomodoro').hidden
        }))()''')
        self.assertEqual(after_end, {'activeId': 'tab-pomodoro', 'pmSel': 'true', 'pmHidden': False})

        run_cmd(['agent-browser', 'press', 'Home'])
        self.assertEqual(eval_js('document.activeElement.id'), 'tab-stopwatch')
        self.assertFalse(eval_js('document.getElementById("panel-stopwatch").hidden'))

        # Stopwatch Start -> Lap -> Reset lifecycle
        eval_js('document.getElementById("sw-start").click()')
        time.sleep(0.15)
        eval_js('document.getElementById("sw-lap").click()')
        eval_js('document.getElementById("sw-start").click()')
        sw_running = eval_js('''(() => ({
            lapsHidden: document.getElementById('sw-laps-section').hidden,
            lapCount: document.querySelectorAll('#sw-laps > *').length,
            display: document.getElementById('sw-display').textContent.trim(),
            resetDisabled: document.getElementById('sw-reset').disabled
        }))()''')
        self.assertFalse(sw_running['lapsHidden'])
        self.assertEqual(sw_running['lapCount'], 1)
        self.assertFalse(sw_running['resetDisabled'])
        self.assertNotEqual(sw_running['display'], '00:00:00.000')

        eval_js('document.getElementById("sw-reset").click()')
        self.assertEqual(eval_js('document.getElementById("sw-display").textContent.trim()'), '00:00:00.000')

    def test_18_remaining_tools_e2e(self):
        # 1. QR Generator: type switch + debounced canvas QR render
        run_cmd(['agent-browser', 'open', self.get_url('/tools/qr-generator.html')])
        time.sleep(0.25)
        eval_js('''(() => {
            var typeEl = document.getElementById('qr-type');
            typeEl.value = 'wifi';
            typeEl.dispatchEvent(new Event('change'));
            var ssidEl = document.getElementById('qr-wifi-ssid');
            ssidEl.value = 'MyStudioWiFi';
            ssidEl.dispatchEvent(new Event('input'));
        })()''')
        time.sleep(0.45)
        qr_info = eval_js('''(() => ({
            urlHidden: document.getElementById('qr-field-url').hidden,
            wifiHidden: document.getElementById('qr-field-wifi').hidden,
            hasGraphic: Boolean(document.querySelector('#qr-output canvas, #qr-output img')),
            dlHidden: document.getElementById('qr-download-section').hidden
        }))()''')
        self.assertTrue(qr_info['urlHidden'])
        self.assertFalse(qr_info['wifiHidden'])
        self.assertTrue(qr_info['hasGraphic'])
        self.assertFalse(qr_info['dlHidden'])

        # 2. Social Font Converter: Unicode styled variants + clear
        run_cmd(['agent-browser', 'open', self.get_url('/tools/social-font-converter.html')])
        time.sleep(0.25)
        eval_js('''(() => {
            var ta = document.getElementById('sf-textarea');
            ta.value = 'Hello';
            ta.dispatchEvent(new Event('input'));
        })()''')
        time.sleep(0.2)
        sf_info = eval_js('''(() => ({
            hidden: document.getElementById('sf-variants-container').hidden,
            variants: document.querySelectorAll('#sf-variants .variant-text').length
        }))()''')
        self.assertFalse(sf_info['hidden'])
        self.assertGreaterEqual(sf_info['variants'], 6)
        eval_js('document.getElementById("sf-clear").click()')
        self.assertTrue(eval_js('document.getElementById("sf-variants-container").hidden'))

        # 3. Currency Converter: cached rates conversion + swap + cleanup
        run_cmd(['agent-browser', 'open', self.get_url('/tools/currency-converter.html')])
        time.sleep(0.25)
        eval_js('''localStorage.setItem('ymt-currency-rates', JSON.stringify({
            timestamp: Date.now(),
            data: { base: 'EUR', date: '2026-11-12', rates: { USD: 1.1, GBP: 0.85 } }
        }))''')
        run_cmd(['agent-browser', 'open', self.get_url('/tools/currency-converter.html')])
        time.sleep(0.3)
        eval_js('''(() => {
            var amt = document.getElementById('cc-amount');
            amt.value = '100';
            amt.dispatchEvent(new Event('input'));
        })()''')
        time.sleep(0.25)
        cc_info = eval_js('''(() => ({
            from: document.getElementById('cc-from').value,
            to: document.getElementById('cc-to').value,
            detail: document.getElementById('cc-rate-detail').textContent,
            copyHidden: document.getElementById('cc-copy').hidden
        }))()''')
        self.assertEqual(cc_info['from'], 'EUR')
        self.assertEqual(cc_info['to'], 'USD')
        self.assertIn('1 EUR = 1.100000 USD', cc_info['detail'])
        self.assertFalse(cc_info['copyHidden'])
        eval_js('document.getElementById("cc-swap").click()')
        self.assertEqual(eval_js('document.getElementById("cc-from").value'), 'USD')
        self.assertEqual(eval_js('document.getElementById("cc-to").value'), 'EUR')
        eval_js('localStorage.removeItem("ymt-currency-rates")')

        # 4. Image Converter: native <label class="file-drop"> + format/quality toggle
        run_cmd(['agent-browser', 'open', self.get_url('/tools/image-converter.html')])
        time.sleep(0.25)
        ic_info = eval_js('''(() => {
            var dz = document.getElementById('ic-drop-zone');
            var inp = document.getElementById('ic-file-input');
            var fmt = document.getElementById('ic-format');
            var grp = document.getElementById('ic-quality-group');
            var slider = document.getElementById('ic-quality');
            fmt.value = 'image/png';
            fmt.dispatchEvent(new Event('change'));
            var pngDisabled = grp.getAttribute('data-disabled') === 'true' && slider.disabled;
            fmt.value = 'image/jpeg';
            fmt.dispatchEvent(new Event('change'));
            var jpgEnabled = !grp.hasAttribute('data-disabled') && !slider.disabled;
            return {
                tag: dz.tagName,
                forAttr: dz.getAttribute('for'),
                containsInput: dz.contains(inp),
                pngDisabled: pngDisabled,
                jpgEnabled: jpgEnabled
            };
        })()''')
        self.assertEqual(ic_info['tag'], 'LABEL')
        self.assertEqual(ic_info['forAttr'], 'ic-file-input')
        self.assertTrue(ic_info['containsInput'])
        self.assertTrue(ic_info['pngDisabled'])
        self.assertTrue(ic_info['jpgEnabled'])

    def test_19_i18n_header_focus_404_and_about_labels(self):
        # 1. Header language change must preserve focus on #ymt-lang-select
        run_cmd(['agent-browser', 'open', self.get_url('/index.html')])
        time.sleep(0.25)
        focus_info = eval_js('''(async () => {
            var sel = document.getElementById('ymt-lang-select');
            sel.focus();
            var before = document.activeElement ? document.activeElement.id : null;
            sel.value = 'es';
            sel.dispatchEvent(new Event('change'));
            await new Promise(r => setTimeout(r, 300));
            return {
                before: before,
                after: document.activeElement ? document.activeElement.id : null,
                lang: document.documentElement.getAttribute('lang'),
                escapedParam: YMT.i18n.t('tool.imageConverter.fileLoaded', { name: 'a$$1$&_b' })
            };
        })()''')
        self.assertEqual(focus_info['before'], 'ymt-lang-select')
        self.assertEqual(focus_info['after'], 'ymt-lang-select')
        self.assertEqual(focus_info['lang'], 'es')
        self.assertNotIn('a$1', focus_info['escapedParam'])

        # 2. About page philosophy labels translate when locale changes to Italian
        run_cmd(['agent-browser', 'open', self.get_url('/about.html')])
        time.sleep(0.25)
        about_it = eval_js('''(async () => {
            await YMT.i18n.setLocale('it');
            return Array.from(document.querySelectorAll('.page-content ul li strong')).map(e => e.textContent.trim());
        })()''')
        self.assertEqual(about_it, ['Gratuito', 'Privacy-first', 'Veloce', 'Accessibile', 'Trasparente'])

        # 3. 404 page detects data-page-name="404" even when served at arbitrary non-/404 URL
        run_cmd(['agent-browser', 'open', self.get_url('/404.html')])
        time.sleep(0.25)
        title_404 = eval_js('''(async () => {
            history.replaceState(null, '', '/missing-route-xyz');
            await YMT.i18n.setLocale('en');
            await YMT.i18n.setLocale('it');
            return document.title;
        })()''')
        self.assertIn('Pagina Non Trovata', title_404)

    def test_20_tools_language_persistence_and_edge_cases(self):
        # 1. Password Generator: generated password must survive language switch & strength updates
        run_cmd(['agent-browser', 'open', self.get_url('/tools/password-generator.html')])
        time.sleep(0.25)
        pw_res = eval_js('''(async () => {
            await YMT.i18n.setLocale('it');
            document.getElementById('pw-generate').click();
            var before = document.getElementById('pw-output-display').textContent;
            await YMT.i18n.setLocale('en');
            var after = document.getElementById('pw-output-display').textContent;
            var strengthAfter = document.getElementById('pw-strength-label').textContent;
            return { before: before, after: after, strengthAfter: strengthAfter };
        })()''')
        self.assertEqual(pw_res['after'], pw_res['before'])
        self.assertIn('crack estimate', pw_res['strengthAfter'])

        # 2. Stopwatch & Timer: running button keeps Pause label across language switch; timer inputs lock while running
        run_cmd(['agent-browser', 'open', self.get_url('/tools/stopwatch-timer.html')])
        time.sleep(0.25)
        sw_res = eval_js('''(async () => {
            await YMT.i18n.setLocale('en');
            document.getElementById('sw-start').click();
            var runningEn = document.getElementById('sw-start').textContent;
            await YMT.i18n.setLocale('it');
            var runningIt = document.getElementById('sw-start').textContent;
            document.getElementById('sw-reset').click();

            document.getElementById('tab-timer').click();
            document.getElementById('tm-minutes').value = '1';
            document.getElementById('tm-start').click();
            var locked = document.getElementById('tm-minutes').disabled;
            document.getElementById('tm-reset').click();
            var unlocked = !document.getElementById('tm-minutes').disabled;

            document.getElementById('tm-minutes').value = 'abc';
            document.getElementById('tm-start').click();
            var tmInvalid = document.getElementById('tm-minutes').getAttribute('aria-invalid');
            return { runningEn: runningEn, runningIt: runningIt, locked: locked, unlocked: unlocked, tmInvalid: tmInvalid };
        })()''')
        self.assertEqual(sw_res['runningEn'], 'Pause')
        self.assertEqual(sw_res['runningIt'], 'Pausa')
        self.assertTrue(sw_res['locked'])
        self.assertTrue(sw_res['unlocked'])
        self.assertEqual(sw_res['tmInvalid'], 'true')

        # 3. Loan Calculator: rate mode stat1 label survives language switch; malformed inputs are rejected
        run_cmd(['agent-browser', 'open', self.get_url('/tools/loan-calculator.html')])
        time.sleep(0.25)
        lc_res = eval_js('''(async () => {
            await YMT.i18n.setLocale('it');
            document.getElementById('lc-capital').value = '1.500,50';
            document.getElementById('lc-rate').value = '3.5';
            document.getElementById('lc-duration').value = '10abc';
            document.getElementById('lc-calculate').click();
            var capInvalid = document.getElementById('lc-capital').getAttribute('aria-invalid');
            var durInvalid = document.getElementById('lc-duration').getAttribute('aria-invalid');

            document.getElementById('lc-mode').value = 'rate';
            document.getElementById('lc-mode').dispatchEvent(new Event('change'));
            document.getElementById('lc-capital').value = '100000';
            document.getElementById('lc-payment').value = '1000';
            document.getElementById('lc-duration').value = '10';
            document.getElementById('lc-calculate').click();
            await YMT.i18n.setLocale('en');
            var stat1 = document.getElementById('lc-stat1-label').textContent;
            return { capInvalid: capInvalid, durInvalid: durInvalid, stat1: stat1 };
        })()''')
        self.assertEqual(lc_res['capInvalid'], 'true')
        self.assertEqual(lc_res['durInvalid'], 'true')
        self.assertEqual(lc_res['stat1'], 'Annual interest rate')

        # 4. Word Counter: 26955 words renders "2 h 0 min" instead of "1 h 60 min"
        run_cmd(['agent-browser', 'open', self.get_url('/tools/word-counter.html')])
        time.sleep(0.25)
        wc_time = eval_js('''(async () => {
            await YMT.i18n.setLocale('en');
            var ta = document.getElementById('wc-textarea');
            ta.value = Array(26955).fill('w').join(' ');
            ta.dispatchEvent(new Event('input'));
            await new Promise(r => setTimeout(r, 220));
            return document.getElementById('wc-read-time').textContent;
        })()''')
        self.assertEqual(wc_time, '2 h 0 min')

        # 5. Text Case Converter: accented Unicode Sentence case & Capitalize Each Word
        run_cmd(['agent-browser', 'open', self.get_url('/tools/text-case-converter.html')])
        time.sleep(0.25)
        tc_variants = eval_js('''(() => {
            var ta = document.getElementById('tc-textarea');
            ta.value = 'è un test. àncora!';
            ta.dispatchEvent(new Event('input'));
            return Array.from(document.querySelectorAll('.variant-text')).map(el => el.textContent);
        })()''')
        self.assertIn('È un test. Àncora!', tc_variants)
        self.assertIn('È Un Test. Àncora!', tc_variants)

        # 6. Unit Converter: rejects trailing garbage & Infinity
        run_cmd(['agent-browser', 'open', self.get_url('/tools/unit-converter.html')])
        time.sleep(0.25)
        uc_res = eval_js('''(async () => {
            await YMT.i18n.setLocale('en');
            var inp = document.getElementById('uc-input-value');
            inp.value = '12abc';
            inp.dispatchEvent(new Event('input'));
            var bad1 = document.getElementById('uc-output-value').textContent.trim();
            inp.value = '1e500';
            inp.dispatchEvent(new Event('input'));
            var bad2 = document.getElementById('uc-output-value').textContent.trim();
            return { bad1: bad1, bad2: bad2 };
        })()''')
        self.assertEqual(uc_res['bad1'], 'Invalid value')
        self.assertEqual(uc_res['bad2'], 'Invalid value')

    def test_21_qr_image_color_and_currency_resilience(self):
        # 1. QR Generator: img alt="" set, overflow clears canvas/title, invalid hex color sets aria-invalid
        run_cmd(['agent-browser', 'open', self.get_url('/tools/qr-generator.html')])
        time.sleep(0.25)
        qr_res = eval_js('''(async () => {
            var urlInp = document.getElementById('qr-input-url');
            urlInp.value = 'https://yourminitools.com';
            urlInp.dispatchEvent(new Event('input'));
            await new Promise(r => setTimeout(r, 400));
            var img = document.querySelector('#qr-output img');
            var imgAlt = img ? img.getAttribute('alt') : null;
            var titleAfterOk = document.getElementById('qr-output').getAttribute('title');

            var typeEl = document.getElementById('qr-type');
            typeEl.value = 'text';
            typeEl.dispatchEvent(new Event('change'));
            var txtEl = document.getElementById('qr-input-text');
            txtEl.value = 'A'.repeat(4000);
            txtEl.dispatchEvent(new Event('input'));
            await new Promise(r => setTimeout(r, 400));
            var errChildren = Array.from(document.getElementById('qr-output').children).map(c => c.tagName);

            var fg = document.getElementById('qr-fg');
            fg.value = '#ZZZ';
            fg.dispatchEvent(new Event('input'));
            await new Promise(r => setTimeout(r, 400));
            var fgInvalid = fg.getAttribute('aria-invalid');
            return { imgAlt: imgAlt, titleAfterOk: titleAfterOk, errChildren: errChildren, fgInvalid: fgInvalid };
        })()''')
        self.assertEqual(qr_res['imgAlt'], '')
        self.assertIsNone(qr_res['titleAfterOk'])
        self.assertEqual(qr_res['errChildren'], ['P'])
        self.assertEqual(qr_res['fgInvalid'], 'true')

        # 2. Image Converter: corrupt PNG with valid magic bytes must be rejected
        run_cmd(['agent-browser', 'open', self.get_url('/tools/image-converter.html')])
        time.sleep(0.25)
        ic_err = eval_js('''(async () => {
            const dt = new DataTransfer();
            const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
            const file = new File([bytes], 'corrupt.png', { type: 'image/png' });
            dt.items.add(file);
            const inp = document.getElementById('ic-file-input');
            Object.defineProperty(inp, 'files', { value: dt.files, configurable: true });
            inp.dispatchEvent(new Event('change'));
            await new Promise(r => setTimeout(r, 300));
            return {
                queuedCount: document.querySelectorAll('#ic-file-list > *').length,
                convertDisabled: document.getElementById('ic-convert').disabled
            };
        })()''')
        self.assertEqual(ic_err['queuedCount'], 0)
        self.assertTrue(ic_err['convertDisabled'])

        # 3. Color Tool: invalid discrete input sets aria-invalid="true"
        run_cmd(['agent-browser', 'open', self.get_url('/tools/color-tool.html')])
        time.sleep(0.25)
        ct_bad = eval_js('''(() => {
            var r = document.getElementById('ct-r');
            r.value = 'abc';
            r.dispatchEvent(new Event('input'));
            r.dispatchEvent(new Event('blur'));
            return r.getAttribute('aria-invalid');
        })()''')
        self.assertEqual(ct_bad, 'true')

        # 4. Currency Converter: rejects corrupt cache and removes obsolete BGN
        run_cmd(['agent-browser', 'open', self.get_url('/tools/currency-converter.html')])
        time.sleep(0.2)
        eval_js("localStorage.setItem('ymt-currency-rates', JSON.stringify({ timestamp: Date.now(), data: { broken: true } }))")
        run_cmd(['agent-browser', 'open', self.get_url('/tools/currency-converter.html')])
        time.sleep(0.35)
        cc_res = eval_js('''(async () => {
            var opts = Array.from(document.getElementById('cc-from').options).map(o => o.value);
            var amt = document.getElementById('cc-amount');
            amt.value = '100abc';
            amt.dispatchEvent(new Event('input'));
            await new Promise(r => setTimeout(r, 220));
            return {
                hasBgn: opts.indexOf('BGN') !== -1,
                corruptCleared: !localStorage.getItem('ymt-currency-rates') || Boolean(JSON.parse(localStorage.getItem('ymt-currency-rates')).data.rates),
                amtResult: document.getElementById('cc-result').textContent
            };
        })()''')
        self.assertFalse(cc_res['hasBgn'])
        self.assertTrue(cc_res['corruptCleared'])
        self.assertEqual(cc_res['amtResult'], '—')
        eval_js("localStorage.removeItem('ymt-currency-rates')")


if __name__ == '__main__':
    unittest.main(verbosity=2)
