/* ============================================================
   YourMiniTools — Password Generator v1.0.0
   CSPRNG via crypto.getRandomValues(), entropy-based strength meter
   Depends on: notifications.js, clipboard.js (YMT namespace)
   Constraints: CSP compliant, no inline styles, no eval
   ============================================================ */

(function () {
  'use strict';

  function t(key, params) {
    if (window.YMT && window.YMT.i18n && window.YMT.i18n.t) {
      return window.YMT.i18n.t(key, params);
    }
    return key;
  }

  /* --- Character Sets ---------------------------------------- */
  var CHARS_UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var CHARS_LOWER   = 'abcdefghijklmnopqrstuvwxyz';
  var CHARS_NUMBERS = '0123456789';
  var CHARS_SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
  var AMBIGUOUS     = '0OoIl1';

  /* --- DOM refs ---------------------------------------------- */
  var lengthSlider, lengthValue;
  var cbUpper, cbLower, cbNumbers, cbSymbols, cbExclude;
  var btnGenerate, outputEl, outputDisplay;
  var strengthSection, strengthBar, strengthLabel;
  var btnCopy, copySection;
  var testInput, testStrengthSection, testStrengthBar, testStrengthLabel;

  var currentPassword = '';

  /* --- Init -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    lengthSlider = document.getElementById('pw-length');
    lengthValue  = document.getElementById('pw-length-value');
    cbUpper      = document.getElementById('pw-upper');
    cbLower      = document.getElementById('pw-lower');
    cbNumbers    = document.getElementById('pw-numbers');
    cbSymbols    = document.getElementById('pw-symbols');
    cbExclude    = document.getElementById('pw-exclude-ambiguous');
    btnGenerate  = document.getElementById('pw-generate');
    outputEl     = document.getElementById('pw-output');
    outputDisplay = document.getElementById('pw-output-display');
    strengthSection = document.getElementById('pw-strength-section');
    strengthBar  = document.getElementById('pw-strength-bar');
    strengthLabel = document.getElementById('pw-strength-label');
    btnCopy      = document.getElementById('pw-copy');
    copySection  = document.getElementById('pw-copy-section');
    testInput    = document.getElementById('pw-test-input');
    testStrengthSection = document.getElementById('pw-test-strength-section');
    testStrengthBar     = document.getElementById('pw-test-strength-bar');
    testStrengthLabel   = document.getElementById('pw-test-strength-label');

    // Events
    lengthSlider.addEventListener('input', function () {
      var el = document.getElementById('pw-length-value');
      if (el) el.textContent = lengthSlider.value;
    });

    btnGenerate.addEventListener('click', generatePassword);

    outputEl.addEventListener('click', function () {
      if (currentPassword) {
        window.YMT.copyToClipboard(currentPassword);
      }
    });

    outputEl.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && currentPassword) {
        e.preventDefault();
        window.YMT.copyToClipboard(currentPassword);
      }
    });

    btnCopy.addEventListener('click', function () {
      if (currentPassword) {
        window.YMT.copyToClipboard(currentPassword);
      }
    });

    testInput.addEventListener('input', function () {
      var val = testInput.value;
      if (val.length > 0) {
        testStrengthSection.hidden = false;
        updateStrengthMeter(val, testStrengthBar, testStrengthLabel);
      } else {
        testStrengthSection.hidden = true;
      }
    });

    // Enforce at least one checkbox
    var checkboxes = [cbUpper, cbLower, cbNumbers, cbSymbols];
    checkboxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        var anyChecked = checkboxes.some(function (c) { return c.checked; });
        if (!anyChecked) {
          cb.checked = true;
          if (window.YMT && window.YMT.showNotification) {
            window.YMT.showNotification(t('tool.passwordGenerator.atLeastOneSet'), 'warning', 3000);
          }
        }
      });
    });
  });

  /* --- Generate Password ------------------------------------- */
  function generatePassword() {
    var charset = buildCharset();
    if (!charset) return;

    var length = parseInt(lengthSlider.value, 10);
    var password = '';
    var charsetLen = charset.length;
    var maxValid = Math.floor(0x100000000 / charsetLen) * charsetLen;
    var array = new Uint32Array(length * 2);
    crypto.getRandomValues(array);

    var idx = 0;
    for (var i = 0; i < length; i++) {
      var rand = array[idx++];
      while (rand >= maxValid) {
        if (idx >= array.length) {
          array = new Uint32Array(length);
          crypto.getRandomValues(array);
          idx = 0;
        }
        rand = array[idx++];
      }
      password += charset[rand % charsetLen];
    }

    // Overwrite previous password reference (privacy)
    currentPassword = password;

    // Display
    outputDisplay.textContent = password;
    outputDisplay.classList.remove('tool-output-empty');
    outputEl.setAttribute('aria-label', t('tool.passwordGenerator.outputGenerated'));

    // Strength
    strengthSection.hidden = false;
    updateStrengthMeter(password, strengthBar, strengthLabel);

    // Show copy
    copySection.hidden = false;
  }

  /* --- Build Charset ----------------------------------------- */
  function buildCharset() {
    var chars = '';
    if (cbUpper.checked)   chars += CHARS_UPPER;
    if (cbLower.checked)   chars += CHARS_LOWER;
    if (cbNumbers.checked) chars += CHARS_NUMBERS;
    if (cbSymbols.checked) chars += CHARS_SYMBOLS;

    if (cbExclude.checked) {
      for (var i = 0; i < AMBIGUOUS.length; i++) {
        chars = chars.split(AMBIGUOUS[i]).join('');
      }
    }

    return chars;
  }

  /* --- Entropy & Strength Meter ------------------------------ */
  function calcEntropy(password) {
    var poolSize = 0;
    var hasLower = false, hasUpper = false, hasDigit = false, hasSymbol = false;

    for (var i = 0; i < password.length; i++) {
      var c = password.charCodeAt(i);
      if (c >= 97 && c <= 122) hasLower = true;
      else if (c >= 65 && c <= 90) hasUpper = true;
      else if (c >= 48 && c <= 57) hasDigit = true;
      else hasSymbol = true;
    }

    if (hasLower) poolSize += 26;
    if (hasUpper) poolSize += 26;
    if (hasDigit) poolSize += 10;
    if (hasSymbol) poolSize += 30;

    if (poolSize === 0) return 0;
    return password.length * (Math.log(poolSize) / Math.LN2);
  }

  function getStrengthInfo(entropy) {
    if (entropy < 40) {
      return { level: 'weak', label: t('tool.passwordGenerator.strengthWeak'), detail: t('tool.passwordGenerator.strengthDetailWeak') };
    }
    if (entropy < 60) {
      return { level: 'medium', label: t('tool.passwordGenerator.strengthMedium'), detail: t('tool.passwordGenerator.strengthDetailMedium') };
    }
    return { level: 'strong', label: t('tool.passwordGenerator.strengthStrong'), detail: t('tool.passwordGenerator.strengthDetailStrong') };
  }

  function formatCrackTime(entropy) {
    // Assumes 10 billion guesses/sec (modern hardware)
    var seconds = Math.pow(2, entropy) / 1e10;
    if (seconds < 1) return t('tool.passwordGenerator.timeLessThanSecond');
    if (seconds < 60) return t('tool.passwordGenerator.timeSeconds', { n: Math.round(seconds) });
    if (seconds < 3600) return t('tool.passwordGenerator.timeMinutes', { n: Math.round(seconds / 60) });
    if (seconds < 86400) return t('tool.passwordGenerator.timeHours', { n: Math.round(seconds / 3600) });
    if (seconds < 31536000) return t('tool.passwordGenerator.timeDays', { n: Math.round(seconds / 86400) });
    var years = seconds / 31536000;
    if (years < 1000) return t('tool.passwordGenerator.timeYears', { n: Math.round(years) });
    if (years < 1e6) return t('tool.passwordGenerator.timeThousandsYears', { n: Math.round(years / 1000) });
    if (years < 1e9) return t('tool.passwordGenerator.timeMillionsYears', { n: Math.round(years / 1e6) });
    return t('tool.passwordGenerator.timeAstronomical');
  }

  function updateStrengthMeter(password, bar, label) {
    var entropy = calcEntropy(password);
    var info = getStrengthInfo(entropy);
    var crackTime = formatCrackTime(entropy);

    bar.setAttribute('data-strength', info.level);
    label.setAttribute('data-strength', info.level);
    label.textContent = info.label + ' \u2014 ' + info.detail + ' (' + t('tool.passwordGenerator.crackTime', { time: crackTime }) + ')';
  }
})();
