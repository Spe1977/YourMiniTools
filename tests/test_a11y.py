#!/usr/bin/env python3
"""
YourMiniTools — Automated WCAG 2.2 AA Accessibility (a11y) Audit
Injects axe-core via a locally-served script and scans pages for WCAG violations.
"""

import os
import time
import json
import socketserver
import http.server
import threading
import subprocess
import urllib.request
import unittest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
AXE_PATH = os.path.join(PROJECT_ROOT, 'tests/axe.min.js')

def run_cmd(args):
    return subprocess.run(args, capture_output=True, text=True)

class TestAccessibility(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.chdir(PROJECT_ROOT)
        handler = http.server.SimpleHTTPRequestHandler
        socketserver.TCPServer.allow_reuse_address = True
        cls.httpd = socketserver.TCPServer(('127.0.0.1', 0), handler)
        cls.port = cls.httpd.server_address[1]
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.3)

        # Ensure axe-core is downloaded locally
        if not os.path.exists(AXE_PATH):
            try:
                req = urllib.request.Request(
                    'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js',
                    headers={'User-Agent': 'Mozilla/5.0'}
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    with open(AXE_PATH, 'wb') as f:
                        f.write(resp.read())
            except Exception:
                pass

    @classmethod
    def tearDownClass(cls):
        run_cmd(['agent-browser', 'close'])
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def get_url(self, path=""):
        return f"http://127.0.0.1:{self.port}/{path.lstrip('/')}"

    def audit_page(self, page_path, themes=('light', 'dark')):
        if not os.path.exists(AXE_PATH):
            self.skipTest("Axe-core is not present locally")

        url = self.get_url(page_path)
        open_res = run_cmd(['agent-browser', 'open', url])
        self.assertEqual(open_res.returncode, 0, f"Failed to open {page_path}: {open_res.stderr}")
        time.sleep(0.25)

        # Inject axe script tag
        inject_code = """
        new Promise((resolve) => {
            if (window.axe) {
                resolve(true);
                return;
            }
            const s = document.createElement('script');
            s.src = '/tests/axe.min.js';
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
        })
        """
        inj_res = run_cmd(['agent-browser', 'eval', inject_code])
        self.assertEqual(inj_res.returncode, 0, f"Axe injection failed on {page_path}: {inj_res.stderr}")
        self.assertEqual(inj_res.stdout.strip(), 'true', f"Axe failed to load on {page_path}: {inj_res.stdout}")
        time.sleep(0.2)

        for theme in themes:
            scan_script = f"""
            new Promise((resolve) => {{
                if (!window.axe) {{
                    resolve({{ error: 'axe not loaded' }});
                    return;
                }}
                document.documentElement.setAttribute('data-theme', '{theme}');
                void document.body.offsetHeight;
                document.getAnimations({{ subtree: true }}).forEach((anim) => {{
                    try {{ anim.finish(); }} catch (_) {{}}
                }});
                // Allow color/background transitions to flush before measuring contrast
                setTimeout(() => {{
                    document.getAnimations({{ subtree: true }}).forEach((anim) => {{
                        try {{ anim.finish(); }} catch (_) {{}}
                    }});
                    axe.run({{ runOnly: {{ type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] }} }})
                       .then(results => resolve(results.violations))
                       .catch(err => resolve({{ error: err.message }}));
                }}, 280);
            }})
            """
            res = run_cmd(['agent-browser', 'eval', scan_script])
            self.assertEqual(res.returncode, 0, f"Axe eval failed on {page_path} ({theme}): {res.stderr}")
            try:
                violations = json.loads(res.stdout.strip())
            except json.JSONDecodeError as exc:
                self.fail(f"Invalid Axe JSON output on {page_path} ({theme}): {exc} -> {res.stdout!r}")

            self.assertIsInstance(
                violations, list,
                f"Unexpected Axe response on {page_path} ({theme}): {violations}"
            )

            critical_or_serious = [
                v for v in violations if v.get('impact') in ['critical', 'serious']
            ]

            self.assertEqual(
                len(critical_or_serious), 0,
                f"Accessibility violations on {page_path} ({theme} mode): " +
                json.dumps([{
                    'id': v['id'],
                    'help': v['help'],
                    'impact': v['impact'],
                    'nodes': [{'target': n.get('target'), 'failure': n.get('failureSummary')} for n in v.get('nodes', [])]
                } for v in critical_or_serious], indent=2)
            )

    # All 16 pages audited in both light and dark modes (WCAG 2.2 AA).
    def test_a11y_homepage(self):
        self.audit_page('index.html')

    def test_a11y_about(self):
        self.audit_page('about.html')

    def test_a11y_privacy(self):
        self.audit_page('privacy.html')

    def test_a11y_404(self):
        self.audit_page('404.html')

    def test_a11y_color_tool(self):
        self.audit_page('tools/color-tool.html')

    def test_a11y_currency_converter(self):
        self.audit_page('tools/currency-converter.html')

    def test_a11y_image_converter(self):
        self.audit_page('tools/image-converter.html')

    def test_a11y_loan_calculator(self):
        self.audit_page('tools/loan-calculator.html')

    def test_a11y_password_generator(self):
        self.audit_page('tools/password-generator.html')

    def test_a11y_qr_generator(self):
        self.audit_page('tools/qr-generator.html')

    def test_a11y_social_font_converter(self):
        self.audit_page('tools/social-font-converter.html')

    def test_a11y_stopwatch_timer(self):
        self.audit_page('tools/stopwatch-timer.html')

    def test_a11y_text_case_converter(self):
        self.audit_page('tools/text-case-converter.html')

    def test_a11y_unit_converter(self):
        self.audit_page('tools/unit-converter.html')

    def test_a11y_word_counter(self):
        self.audit_page('tools/word-counter.html')

    def test_a11y_world_clock(self):
        self.audit_page('tools/world-clock.html')

    def audit_active_state(self, page_path, setup_js):
        if not os.path.exists(AXE_PATH):
            self.skipTest("Axe-core is not present locally")

        url = self.get_url(page_path)
        open_res = run_cmd(['agent-browser', 'open', url])
        self.assertEqual(open_res.returncode, 0, f"Failed to open {page_path}: {open_res.stderr}")
        time.sleep(0.25)

        inject_code = """
        new Promise((resolve) => {
            if (window.axe) { resolve(true); return; }
            const s = document.createElement('script');
            s.src = '/tests/axe.min.js';
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
        })
        """
        inj_res = run_cmd(['agent-browser', 'eval', inject_code])
        self.assertEqual(inj_res.stdout.strip(), 'true')

        setup_res = run_cmd(['agent-browser', 'eval', setup_js])
        self.assertEqual(setup_res.returncode, 0, f"Setup failed on {page_path}: {setup_res.stderr}")
        time.sleep(0.35)

        for theme in ('light', 'dark'):
            scan_script = f"""
            new Promise((resolve) => {{
                document.documentElement.setAttribute('data-theme', '{theme}');
                void document.body.offsetHeight;
                document.getAnimations({{ subtree: true }}).forEach((anim) => {{
                    try {{ anim.finish(); }} catch (_) {{}}
                }});
                setTimeout(() => {{
                    document.getAnimations({{ subtree: true }}).forEach((anim) => {{
                        try {{ anim.finish(); }} catch (_) {{}}
                    }});
                    axe.run({{ runOnly: {{ type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] }} }})
                       .then(results => resolve(results.violations))
                       .catch(err => resolve({{ error: err.message }}));
                }}, 280);
            }})
            """
            res = run_cmd(['agent-browser', 'eval', scan_script])
            self.assertEqual(res.returncode, 0)
            violations = json.loads(res.stdout.strip())
            critical_or_serious = [
                v for v in violations if v.get('impact') in ['critical', 'serious']
            ]
            self.assertEqual(
                len(critical_or_serious), 0,
                f"Active state a11y violations on {page_path} ({theme}): " +
                json.dumps([{
                    'id': v['id'],
                    'impact': v['impact'],
                    'nodes': [n.get('target') for n in v.get('nodes', [])]
                } for v in critical_or_serious], indent=2)
            )

    def test_a11y_active_tool_states(self):
        # Password Generator: strong + medium + weak meters visible
        self.audit_active_state('tools/password-generator.html', """(() => {
            document.getElementById('pw-generate').click();
            var ti = document.getElementById('pw-test-input');
            ti.value = 'abcdefghijkl';
            ti.dispatchEvent(new Event('input'));
        })()""")
        self.audit_active_state('tools/password-generator.html', """(() => {
            var ti = document.getElementById('pw-test-input');
            ti.value = 'abc';
            ti.dispatchEvent(new Event('input'));
        })()""")

        # Loan Calculator: results + scrollable amortization table + validation error
        self.audit_active_state('tools/loan-calculator.html', """(() => {
            document.getElementById('lc-capital').value = '200000';
            document.getElementById('lc-rate').value = '3.5';
            document.getElementById('lc-duration').value = '20';
            document.getElementById('lc-calculate').click();
            document.getElementById('lc-rate').value = '999';
            document.getElementById('lc-calculate').click();
        })()""")

        # QR Generator: rendered QR code canvas + img
        self.audit_active_state('tools/qr-generator.html', """(() => {
            var u = document.getElementById('qr-input-url');
            u.value = 'https://yourminitools.com';
            u.dispatchEvent(new Event('input'));
        })()""")

        # Image Converter: enabled primary button
        self.audit_active_state('tools/image-converter.html', """(() => {
            document.getElementById('ic-convert').disabled = false;
        })()""")


if __name__ == '__main__':
    unittest.main(verbosity=2)
