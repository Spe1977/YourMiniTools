#!/usr/bin/env python3
"""
YourMiniTools — Automated Test Suite
Covers:
1. i18n key consistency, completeness, and interpolation parameter matching
2. HTML / DOM ID bindings across all 12 tools and global pages
3. Mathematical correctness & roundtrip invariants (Loan Calc, Unit Converter, Color Tool)
4. Case conversion and Unicode social font mapping correctness
5. Asset integrity (CSS, JS, Favicons, OG images)
6. Security and CSP headers validation
"""

import os
import re
import sys
import math
import json
import glob
import base64
import hashlib
import tempfile
import subprocess
import unittest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

class TestI18nIntegrity(unittest.TestCase):
    """Test translation files for validity, symmetry, and interpolation tokens."""

    @classmethod
    def setUpClass(cls):
        cls.locales = ['en', 'it', 'es']
        cls.data = {}
        for loc in cls.locales:
            path = os.path.join(PROJECT_ROOT, f'assets/i18n/{loc}.json')
            with open(path, 'r', encoding='utf-8') as f:
                cls.data[loc] = json.load(f)

    def test_key_symmetry(self):
        en_keys = set(self.data['en'].keys())
        for loc in ['it', 'es']:
            loc_keys = set(self.data[loc].keys())
            missing = en_keys - loc_keys
            extra = loc_keys - en_keys
            self.assertEqual(missing, set(), f"Locale '{loc}' is missing keys: {missing}")
            self.assertEqual(extra, set(), f"Locale '{loc}' has unexpected extra keys: {extra}")

    def test_interpolation_parameters(self):
        """Verify that {param} tokens match across all translations for each key."""
        param_pattern = re.compile(r'\{([a-zA-Z0-9_-]+)\}')
        for key, en_val in self.data['en'].items():
            if not isinstance(en_val, str):
                continue
            en_params = set(param_pattern.findall(en_val))
            for loc in ['it', 'es']:
                loc_val = self.data[loc][key]
                if isinstance(loc_val, str):
                    loc_params = set(param_pattern.findall(loc_val))
                    self.assertEqual(
                        en_params, loc_params,
                        f"Mismatch in parameters for key '{key}' between 'en' ({en_params}) and '{loc}' ({loc_params})"
                    )

    def test_html_data_i18n_attributes(self):
        """All data-i18n* attributes in HTML files must exist in translation files."""
        html_files = glob.glob(os.path.join(PROJECT_ROOT, '*.html')) + \
                     glob.glob(os.path.join(PROJECT_ROOT, 'tools/*.html'))
        en_keys = set(self.data['en'].keys())

        for hf in html_files:
            with open(hf, 'r', encoding='utf-8') as f:
                content = f.read()
            for attr in ['data-i18n', 'data-i18n-placeholder', 'data-i18n-aria', 'data-i18n-title']:
                matches = re.findall(rf'{attr}=[\"\']([^\"\']+)[\"\']', content)
                for m in matches:
                    self.assertIn(
                        m, en_keys,
                        f"Key '{m}' from '{attr}' in file '{os.path.basename(hf)}' not found in i18n dictionaries."
                    )

    def test_js_i18n_keys(self):
        """All static literal t('...') keys referenced in non-vendor JS must exist in dictionaries."""
        js_files = sorted(
            glob.glob(os.path.join(PROJECT_ROOT, 'assets/js/*.js')) +
            glob.glob(os.path.join(PROJECT_ROOT, 'assets/js/core/*.js')) +
            glob.glob(os.path.join(PROJECT_ROOT, 'assets/js/tools/*.js'))
        )
        en_keys = set(self.data['en'].keys())
        for jf in js_files:
            with open(jf, 'r', encoding='utf-8') as f:
                content = f.read()
            for key in re.findall(r"\bt\(\s*['\"]([a-zA-Z0-9_.-]+)['\"]", content):
                if '.' in key and not key.endswith('.'):
                    self.assertIn(
                        key, en_keys,
                        f"Static JS key '{key}' in '{os.path.basename(jf)}' missing from en.json"
                    )


class TestDomBindings(unittest.TestCase):
    """Verify that all getElementById and selectors in JS exist in their corresponding HTML."""

    def test_tool_dom_ids(self):
        tool_pairs = [
            ('color-tool.js', 'color-tool.html'),
            ('currency-converter.js', 'currency-converter.html'),
            ('image-converter.js', 'image-converter.html'),
            ('loan-calculator.js', 'loan-calculator.html'),
            ('password-generator.js', 'password-generator.html'),
            ('qr-generator.js', 'qr-generator.html'),
            ('social-font-converter.js', 'social-font-converter.html'),
            ('stopwatch-timer.js', 'stopwatch-timer.html'),
            ('text-case-converter.js', 'text-case-converter.html'),
            ('unit-converter.js', 'unit-converter.html'),
            ('word-counter.js', 'word-counter.html'),
            ('world-clock.js', 'world-clock.html'),
        ]

        for js_name, html_name in tool_pairs:
            js_path = os.path.join(PROJECT_ROOT, 'assets/js/tools', js_name)
            html_path = os.path.join(PROJECT_ROOT, 'tools', html_name)

            with open(js_path, 'r', encoding='utf-8') as f:
                js_content = f.read()
            with open(html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()

            js_ids = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", js_content))
            html_ids = set(re.findall(r"id=['\"]([^'\"]+)['\"]", html_content))

            missing = js_ids - html_ids
            self.assertEqual(
                missing, set(),
                f"IDs referenced in '{js_name}' missing from '{html_name}': {missing}"
            )


class TestLoanCalculatorLogic(unittest.TestCase):
    """Verify French amortization formulas, total cost, and bisection solver."""

    def amort_payment(self, capital, monthly_rate, months):
        if monthly_rate < 1e-12:
            return capital / months
        factor = math.pow(1 + monthly_rate, months)
        return capital * (monthly_rate * factor) / (factor - 1)

    def bisect_rate(self, capital, payment, months):
        lo = 1e-9
        hi = 0.30 / 12
        for _ in range(60):
            mid = (lo + hi) / 2
            if self.amort_payment(capital, mid, months) > payment:
                hi = mid
            else:
                lo = mid
        return mid * 12 * 100

    def test_standard_mortgage_calculation(self):
        # €200,000 at 3.5% for 20 years (240 months)
        capital = 200000.0
        annual_rate = 3.5
        months = 240
        monthly_rate = annual_rate / 100 / 12

        payment = self.amort_payment(capital, monthly_rate, months)
        self.assertAlmostEqual(payment, 1159.92, delta=0.05)

        total_cost = payment * months
        total_interest = total_cost - capital

        # Amortization schedule invariant test
        remaining = capital
        sum_principal = 0.0
        sum_interest = 0.0
        for _ in range(months):
            interest_part = remaining * monthly_rate
            principal_part = payment - interest_part
            remaining -= principal_part
            sum_principal += principal_part
            sum_interest += interest_part

        self.assertAlmostEqual(remaining, 0.0, delta=0.01)
        self.assertAlmostEqual(sum_principal, capital, delta=0.01)
        self.assertAlmostEqual(sum_interest, total_interest, delta=0.01)

    def test_bisection_rate_solver_roundtrip(self):
        """Solving for interest rate from monthly payment must roundtrip accurately."""
        test_cases = [
            (50000, 2.5, 120),
            (150000, 4.2, 300),
            (10000, 6.8, 60),
            (300000, 1.2, 180),
        ]
        for capital, annual_rate, months in test_cases:
            monthly_rate = annual_rate / 100 / 12
            payment = self.amort_payment(capital, monthly_rate, months)
            computed_rate = self.bisect_rate(capital, payment, months)
            self.assertAlmostEqual(
                computed_rate, annual_rate, places=4,
                msg=f"Failed rate bisection for capital={capital}, rate={annual_rate}, months={months}"
            )


class TestUnitConverterLogic(unittest.TestCase):
    """Property-based invariant tests for Unit Converter factors and non-linear temperature formulas."""

    def convert_temp(self, val, from_u, to_u):
        if from_u == to_u:
            return val
        if from_u == 'C':
            c = val
        elif from_u == 'F':
            c = (val - 32) * 5 / 9
        else:
            c = val - 273.15
        
        if to_u == 'C':
            return c
        if to_u == 'F':
            return c * 9 / 5 + 32
        return c + 273.15

    def test_temperature_known_points(self):
        # Water freezing point
        self.assertAlmostEqual(self.convert_temp(0, 'C', 'F'), 32.0)
        self.assertAlmostEqual(self.convert_temp(0, 'C', 'K'), 273.15)
        # Water boiling point
        self.assertAlmostEqual(self.convert_temp(100, 'C', 'F'), 212.0)
        self.assertAlmostEqual(self.convert_temp(100, 'C', 'K'), 373.15)
        # Absolute zero
        self.assertAlmostEqual(self.convert_temp(0, 'K', 'C'), -273.15)
        self.assertAlmostEqual(self.convert_temp(0, 'K', 'F'), -459.67)

    def test_temperature_roundtrip(self):
        for temp_c in [-40, -10, 0, 20, 37, 100, 500]:
            f = self.convert_temp(temp_c, 'C', 'F')
            c_back = self.convert_temp(f, 'F', 'C')
            self.assertAlmostEqual(temp_c, c_back, places=6)

            k = self.convert_temp(temp_c, 'C', 'K')
            c_back_k = self.convert_temp(k, 'K', 'C')
            self.assertAlmostEqual(temp_c, c_back_k, places=6)

    def test_data_units_binary_multiples(self):
        units = {
            'b': 0.125, 'B': 1.0, 'KB': 1024.0, 'MB': 1048576.0,
            'GB': 1073741824.0, 'TB': 1099511627776.0,
            'Kb': 128.0, 'Mb': 131072.0, 'Gb': 134217728.0
        }
        # 1 GB in bytes
        self.assertEqual(units['GB'], 1024 * units['MB'])
        self.assertEqual(units['MB'], 1024 * units['KB'])
        self.assertEqual(units['TB'], 1024 * units['GB'])
        # 1 Byte = 8 bits
        self.assertEqual(units['B'] / units['b'], 8.0)


class TestColorToolLogic(unittest.TestCase):
    """Verify HEX, RGB, and HSL conversions."""

    def hex_to_rgb(self, hex_str):
        h = hex_str.lstrip('#')
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

    def rgb_to_hex(self, r, g, b):
        return f"#{r:02X}{g:02X}{b:02X}"

    def rgb_to_hsl(self, r, g, b):
        r_n, g_n, b_n = r / 255.0, g / 255.0, b / 255.0
        mx = max(r_n, g_n, b_n)
        mn = min(r_n, g_n, b_n)
        l = (mx + mn) / 2.0
        if mx == mn:
            h = s = 0.0
        else:
            d = mx - mn
            s = d / (2.0 - mx - mn) if l > 0.5 else d / (mx + mn)
            if mx == r_n:
                h = ((g_n - b_n) / d + (6.0 if g_n < b_n else 0.0)) / 6.0
            elif mx == g_n:
                h = ((b_n - r_n) / d + 2.0) / 6.0
            else:
                h = ((r_n - g_n) / d + 4.0) / 6.0
        return round(h * 360), round(s * 100), round(l * 100)

    def test_hex_rgb_roundtrip(self):
        test_hexes = ['#000000', '#FFFFFF', '#2576AE', '#E74C3C', '#27AE60', '#F39C12', '#1A1A2E']
        for hex_code in test_hexes:
            rgb = self.hex_to_rgb(hex_code)
            hex_back = self.rgb_to_hex(*rgb)
            self.assertEqual(hex_code.upper(), hex_back.upper())

    def test_known_hsl_colors(self):
        self.assertEqual(self.rgb_to_hsl(255, 0, 0), (0, 100, 50))      # Pure Red
        self.assertEqual(self.rgb_to_hsl(0, 255, 0), (120, 100, 50))    # Pure Green
        self.assertEqual(self.rgb_to_hsl(0, 0, 255), (240, 100, 50))    # Pure Blue
        self.assertEqual(self.rgb_to_hsl(0, 0, 0), (0, 0, 0))           # Black
        self.assertEqual(self.rgb_to_hsl(255, 255, 255), (0, 0, 100))   # White


class TestAssetAndHeaderIntegrity(unittest.TestCase):
    """Verify all referenced assets exist and _headers directives are valid."""

    def test_og_images_exist(self):
        html_files = glob.glob(os.path.join(PROJECT_ROOT, '*.html')) + \
                     glob.glob(os.path.join(PROJECT_ROOT, 'tools/*.html'))
        for hf in html_files:
            with open(hf, 'r', encoding='utf-8') as f:
                content = f.read()
            og_images = re.findall(r'property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', content)
            for img_url in og_images:
                rel_path = img_url.replace('https://yourminitools.com/', '')
                full_path = os.path.join(PROJECT_ROOT, rel_path)
                self.assertTrue(os.path.exists(full_path), f"OG image not found: {full_path}")

    def test_headers_config(self):
        headers_path = os.path.join(PROJECT_ROOT, '_headers')
        self.assertTrue(os.path.exists(headers_path))
        with open(headers_path, 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn("Content-Security-Policy", content)
        self.assertIn("/assets/data/*", content)
        self.assertNotIn("/assets/icons/*", content)

        # Point 8: CSP hardening & isolation headers
        self.assertIn("Cross-Origin-Opener-Policy: same-origin-allow-popups", content)
        self.assertIn("Cross-Origin-Resource-Policy: same-origin", content)
        self.assertIn("Reporting-Endpoints:", content)
        self.assertIn('default="https://yourminitools.com/csp-reports"', content)
        self.assertIn('csp-endpoint="https://yourminitools.com/csp-reports"', content)
        self.assertIn("base-uri 'none'", content)
        self.assertNotIn("base-uri 'self'", content)
        self.assertIn("'report-sample'", content)
        self.assertIn("report-to csp-endpoint", content)

        # Ensure AdSense, Funding Choices, Cloudflare Insights and Frankfurter API remain allowed
        for origin in [
            "https://pagead2.googlesyndication.com",
            "https://fundingchoicesmessages.google.com",
            "https://static.cloudflareinsights.com",
            "https://cloudflareinsights.com",
            "https://api.frankfurter.dev",
        ]:
            self.assertIn(origin, content)

    def test_inline_scripts_and_speculation_rules(self):
        """Verify deterministic inline scripts, SHA-256 hashes, and index.html speculationrules."""
        html_files = sorted(
            glob.glob(os.path.join(PROJECT_ROOT, '*.html')) +
            glob.glob(os.path.join(PROJECT_ROOT, 'tools/*.html'))
        )
        self.assertEqual(len(html_files), 16)

        with open(os.path.join(PROJECT_ROOT, '_headers'), 'r', encoding='utf-8') as f:
            headers_content = f.read()

        expected_fouc_hash = None
        for hf in html_files:
            with open(hf, 'r', encoding='utf-8') as f:
                html = f.read()
            self.assertIsNone(re.search(r'<base\b', html, re.I), f"Unexpected <base> in {hf}")
            self.assertIsNone(re.search(r'<style\b', html, re.I), f"Unexpected <style> in {hf}")
            self.assertIsNone(re.search(r'\sstyle=["\']', html, re.I), f"Unexpected style= in {hf}")
            self.assertIsNone(re.search(r'\son[a-z]+=', html, re.I), f"Unexpected inline event in {hf}")

            inline_scripts = [
                (attrs, body)
                for attrs, body in re.findall(r'<script\b([^>]*)>(.*?)</script>', html, re.S)
                if 'src=' not in attrs and 'application/ld+json' not in attrs
            ]
            if os.path.basename(hf) == 'index.html':
                self.assertEqual(len(inline_scripts), 2)
                spec_bodies = [b for a, b in inline_scripts if 'speculationrules' in a]
                self.assertEqual(len(spec_bodies), 1)
                spec_data = json.loads(spec_bodies[0])
                self.assertIn('prefetch', spec_data)
                rule = spec_data['prefetch'][0]
                self.assertEqual(rule.get('eagerness'), 'moderate')
                self.assertEqual(
                    rule.get('where'),
                    {'and': [{'href_matches': '/tools/*'}, {'selector_matches': '.tool-card'}]},
                )
                spec_hash = 'sha256-' + base64.b64encode(
                    hashlib.sha256(spec_bodies[0].encode('utf-8')).digest()
                ).decode('ascii')
                self.assertIn(spec_hash, headers_content)
                fouc_bodies = [b for a, b in inline_scripts if 'speculationrules' not in a]
            else:
                self.assertEqual(len(inline_scripts), 1)
                fouc_bodies = [inline_scripts[0][1]]

            fouc_hash = 'sha256-' + base64.b64encode(
                hashlib.sha256(fouc_bodies[0].encode('utf-8')).digest()
            ).decode('ascii')
            if expected_fouc_hash is None:
                expected_fouc_hash = fouc_hash
            self.assertEqual(fouc_hash, expected_fouc_hash)
            self.assertIn(fouc_hash, headers_content)

    def test_modern_css_and_production_minification(self):
        """Verify @view-transition, scroll-state CSS, readable sources, and dist minification."""
        global_css_path = os.path.join(PROJECT_ROOT, 'assets/css/global.css')
        tools_css_path = os.path.join(PROJECT_ROOT, 'assets/css/tools.css')
        with open(global_css_path, 'r', encoding='utf-8') as f:
            global_css = f.read()
        with open(tools_css_path, 'r', encoding='utf-8') as f:
            tools_css = f.read()

        # Readable source stylesheets preserved
        self.assertGreater(global_css.count('\n'), 500)
        self.assertGreater(tools_css.count('\n'), 500)
        self.assertIn('@layer reset, tokens, base, components, utilities;', global_css)
        self.assertIn('@view-transition', global_css)
        self.assertIn('navigation: auto;', global_css)
        self.assertIn('@supports (container-type: scroll-state)', global_css)
        self.assertIn('@container scroll-state(scrollable: top)', global_css)

        build_script = os.path.join(PROJECT_ROOT, 'scripts/build-prod.mjs')
        self.assertTrue(os.path.exists(build_script))

        with tempfile.TemporaryDirectory() as tmpdir:
            res = subprocess.run(
                ['node', build_script, '--out', tmpdir],
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
            )
            self.assertEqual(res.returncode, 0, res.stderr)

            min_global_path = os.path.join(tmpdir, 'assets/css/global.css')
            min_tools_path = os.path.join(tmpdir, 'assets/css/tools.css')
            self.assertTrue(os.path.exists(min_global_path))
            self.assertTrue(os.path.exists(min_tools_path))
            self.assertTrue(os.path.exists(os.path.join(tmpdir, 'index.html')))
            self.assertTrue(os.path.exists(os.path.join(tmpdir, '_headers')))
            self.assertTrue(os.path.exists(os.path.join(tmpdir, 'tools/password-generator.html')))

            with open(min_global_path, 'r', encoding='utf-8') as f:
                min_global = f.read()
            with open(min_tools_path, 'r', encoding='utf-8') as f:
                min_tools = f.read()

            self.assertLess(len(min_global), len(global_css) * 0.80)
            self.assertLess(len(min_tools), len(tools_css) * 0.80)
            self.assertIn('@view-transition{navigation:auto}', min_global)
            self.assertIn('@container scroll-state(scrollable:top)', min_global)
            self.assertIn('calc(100% - 2 * var(--spacing-md))', min_global)
            self.assertIn('data:image/svg+xml', min_tools)

    def test_vendor_libraries_exist(self):
        jspdf = os.path.join(PROJECT_ROOT, 'assets/js/vendor/pdf/jspdf.umd.min.js')
        qrcode = os.path.join(PROJECT_ROOT, 'assets/js/vendor/qr/qrcode.min.js')
        self.assertTrue(os.path.exists(jspdf), "jspdf.umd.min.js missing")
        self.assertTrue(os.path.exists(qrcode), "qrcode.min.js missing")

    def test_html_dark_mode_and_semantics(self):
        """Verify color-scheme meta, absence of data-theme='', label[for], and decorative SVG aria-hidden."""
        html_files = sorted(
            glob.glob(os.path.join(PROJECT_ROOT, '*.html')) +
            glob.glob(os.path.join(PROJECT_ROOT, 'tools/*.html'))
        )
        self.assertEqual(len(html_files), 16)

        for hf in html_files:
            with open(hf, 'r', encoding='utf-8') as f:
                html = f.read()
            fname = os.path.relpath(hf, PROJECT_ROOT)
            self.assertIn('<meta name="color-scheme" content="light dark">', html, f"Missing color-scheme meta in {fname}")
            self.assertNotIn('data-theme=""', html, f"Empty data-theme attribute in {fname}")

            for label_tag in re.findall(r'<label\b[^>]*class=["\'][^"\']*\bform-label\b[^"\']*["\'][^>]*>', html):
                self.assertRegex(label_tag, r'\bfor=["\'][^"\']+["\']', f"Orphan form-label missing for= in {fname}: {label_tag}")

            for svg_tag in re.findall(r'<svg\b[^>]*class=["\'][^"\']*\b(?:file-drop-icon|tool-banner-icon)\b[^"\']*["\'][^>]*>', html):
                self.assertIn('aria-hidden="true"', svg_tag, f"Missing aria-hidden on icon SVG in {fname}: {svg_tag}")

            for wrap_match in re.finditer(r'<(?:a|button)\b[^>]*class=["\'][^"\']*\b(?:tool-back-home|btn-swap)\b[^"\']*["\'][^>]*>([\s\S]*?)</(?:a|button)>', html):
                inner_svgs = re.findall(r'<svg\b[^>]*>', wrap_match.group(1))
                for svg_tag in inner_svgs:
                    self.assertIn('aria-hidden="true"', svg_tag, f"Missing aria-hidden on button/link SVG in {fname}: {svg_tag}")

    def test_css_architecture_and_motion(self):
        """Verify @layer cascade, forced-colors, prefers-reduced-motion opt-in, and no anti-patterns."""
        for rel_path in ['assets/css/global.css', 'assets/css/tools.css']:
            with open(os.path.join(PROJECT_ROOT, rel_path), 'r', encoding='utf-8') as f:
                css = f.read()
            self.assertIn('@layer reset, tokens, base, components, utilities;', css, f"Missing @layer declaration in {rel_path}")
            self.assertIn('@media (forced-colors: active)', css, f"Missing forced-colors rules in {rel_path}")
            self.assertIn('@media (prefers-reduced-motion: no-preference)', css, f"Missing reduced-motion opt-in in {rel_path}")
            self.assertNotIn('100vw', css, f"Unexpected 100vw unit in {rel_path}")

        with open(os.path.join(PROJECT_ROOT, 'assets/css/global.css'), 'r', encoding='utf-8') as f:
            global_css = f.read()
        with open(os.path.join(PROJECT_ROOT, 'assets/css/tools.css'), 'r', encoding='utf-8') as f:
            tools_css = f.read()

        self.assertIsNone(re.search(r'\bbody\s*\{[^}]*font-size:\s*16px', global_css, re.S), "Hardcoded 16px body font-size in global.css")
        self.assertIsNone(re.search(r'outline:\s*(none|0)\b', tools_css), "Unexpected outline: none in tools.css")

    def test_manifest_and_sitemap_integrity(self):
        """Verify manifest icons exist on disk and sitemap covers all indexable pages."""
        with open(os.path.join(PROJECT_ROOT, 'manifest.json'), 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        for icon in manifest.get('icons', []):
            icon_rel = icon['src'].lstrip('/')
            self.assertTrue(os.path.exists(os.path.join(PROJECT_ROOT, icon_rel)), f"Missing manifest icon: {icon['src']}")

        with open(os.path.join(PROJECT_ROOT, 'sitemap.xml'), 'r', encoding='utf-8') as f:
            sitemap = f.read()
        expected_urls = [
            'https://yourminitools.com/',
            'https://yourminitools.com/about',
            'https://yourminitools.com/privacy',
        ] + [
            'https://yourminitools.com/tools/' + os.path.basename(p).replace('.html', '')
            for p in sorted(glob.glob(os.path.join(PROJECT_ROOT, 'tools/*.html')))
        ]
        for url in expected_urls:
            self.assertIn(f'<loc>{url}</loc>', sitemap, f"Missing sitemap <loc> for {url}")

    def test_wcag_semantic_and_accent_contrast_invariants(self):
        """Verify semantic text tokens and all 12 per-tool accent buttons meet >= 4.5:1 WCAG AA contrast."""
        def srgb(c):
            c /= 255.0
            return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

        def lum(hx):
            hx = hx.lstrip('#')
            return 0.2126 * srgb(int(hx[0:2], 16)) + 0.7152 * srgb(int(hx[2:4], 16)) + 0.0722 * srgb(int(hx[4:6], 16))

        def contrast(c1, c2):
            l1, l2 = lum(c1), lum(c2)
            return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)

        with open(os.path.join(PROJECT_ROOT, 'assets/css/global.css'), 'r', encoding='utf-8') as f:
            global_css = f.read()

        # All 12 per-tool --accent colors must provide >= 4.5:1 against #ffffff button text
        accents = re.findall(r'\[data-tool-color="([^"]+)"\]\s*\{\s*--accent:\s*(#[0-9a-fA-F]{6})', global_css)
        self.assertEqual(len(accents), 12)
        for name, hex_val in accents:
            ratio = contrast('#ffffff', hex_val)
            self.assertGreaterEqual(ratio, 4.5, f"Tool '{name}' accent {hex_val} contrast vs #fff is {ratio:.2f} < 4.5")

        # Light and dark semantic text tokens must meet >= 4.5:1 against --color-surface
        for token in ['--color-success-text', '--color-warning-text', '--color-danger-text']:
            matches = re.findall(rf'{re.escape(token)}:\s*(#[0-9a-fA-F]{{6}})', global_css)
            self.assertGreaterEqual(len(matches), 2, f"Missing light/dark definitions for {token}")
            self.assertGreaterEqual(contrast(matches[0], '#ffffff'), 4.5, f"Light {token} ({matches[0]}) < 4.5:1 on #ffffff")
            self.assertGreaterEqual(contrast(matches[1], '#171a26'), 4.5, f"Dark {token} ({matches[1]}) < 4.5:1 on #171a26")

    def test_tool_markup_and_currency_integrity(self):
        """Verify structural accessibility attributes and active currency list."""
        with open(os.path.join(PROJECT_ROOT, 'tools/loan-calculator.html'), 'r', encoding='utf-8') as f:
            lc_html = f.read()
        self.assertRegex(lc_html, r'class="tool-table-wrapper tool-table-scroll"[^>]*tabindex="0"')
        self.assertIn('role="region"', lc_html)

        with open(os.path.join(PROJECT_ROOT, 'tools/world-clock.html'), 'r', encoding='utf-8') as f:
            wc_html = f.read()
        self.assertRegex(wc_html, r'id="wc-clocks"[^>]*aria-live="off"')

        with open(os.path.join(PROJECT_ROOT, 'tools/color-tool.html'), 'r', encoding='utf-8') as f:
            ct_html = f.read()
        self.assertNotIn('magnifying lens', ct_html.lower())

        with open(os.path.join(PROJECT_ROOT, 'tools/qr-generator.html'), 'r', encoding='utf-8') as f:
            qr_html = f.read()
        self.assertIn('assets/js/core/validation.js', qr_html)

        with open(os.path.join(PROJECT_ROOT, 'assets/js/tools/currency-converter.js'), 'r', encoding='utf-8') as f:
            cc_js = f.read()
        self.assertNotIn("code: 'BGN'", cc_js)


if __name__ == '__main__':
    unittest.main(verbosity=2)
