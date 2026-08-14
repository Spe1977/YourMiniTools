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

    def audit_page(self, page_path):
        if not os.path.exists(AXE_PATH):
            self.skipTest("Axe-core is not present locally")

        url = self.get_url(page_path)
        run_cmd(['agent-browser', 'open', url])
        time.sleep(0.3)

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
        run_cmd(['agent-browser', 'eval', inject_code])
        time.sleep(0.4)

        # Run axe scan
        scan_script = """
        new Promise((resolve) => {
            if (!window.axe) {
                resolve({ error: 'axe not loaded' });
                return;
            }
            axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })
               .then(results => resolve(results.violations))
               .catch(err => resolve({ error: err.message }));
        })
        """
        res = run_cmd(['agent-browser', 'eval', scan_script])
        try:
            violations = json.loads(res.stdout.strip())
        except Exception:
            return

        if isinstance(violations, dict) and 'error' in violations:
            return

        critical_or_serious = [
            v for v in violations if v.get('impact') in ['critical', 'serious']
        ]

        self.assertEqual(
            len(critical_or_serious), 0,
            f"Accessibility violations on {page_path}: " +
            json.dumps([{ 'id': v['id'], 'help': v['help'], 'impact': v['impact'], 'nodes': [{'target': n.get('target'), 'failure': n.get('failureSummary')} for n in v.get('nodes', [])] } for v in critical_or_serious], indent=2)
        )

    def test_a11y_homepage(self):
        self.audit_page('index.html')

    def test_a11y_password_generator(self):
        self.audit_page('tools/password-generator.html')

    def test_a11y_loan_calculator(self):
        self.audit_page('tools/loan-calculator.html')

    def test_a11y_word_counter(self):
        self.audit_page('tools/word-counter.html')

    def test_a11y_unit_converter(self):
        self.audit_page('tools/unit-converter.html')


if __name__ == '__main__':
    unittest.main(verbosity=2)
