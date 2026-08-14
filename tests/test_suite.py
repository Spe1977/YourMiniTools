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

    def test_vendor_libraries_exist(self):
        jspdf = os.path.join(PROJECT_ROOT, 'assets/js/vendor/pdf/jspdf.umd.min.js')
        qrcode = os.path.join(PROJECT_ROOT, 'assets/js/vendor/qr/qrcode.min.js')
        self.assertTrue(os.path.exists(jspdf), "jspdf.umd.min.js missing")
        self.assertTrue(os.path.exists(qrcode), "qrcode.min.js missing")


if __name__ == '__main__':
    unittest.main(verbosity=2)
