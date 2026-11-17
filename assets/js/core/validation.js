/* ============================================================
   YourMiniTools — Validation Module v1.0.0
   Shared input validation with accessible error display
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

  /**
   * Validate that an input is not empty.
   * @param {HTMLInputElement|HTMLTextAreaElement} input
   * @param {string} [errorMsg] — Custom error message
   * @returns {boolean}
   */
  function requireNonEmpty(input, errorMsg) {
    var value = (input.value || '').trim();
    if (!value) {
      showFieldError(input, errorMsg || t('validation.required'));
      return false;
    }
    clearFieldError(input);
    return true;
  }

  /**
   * Validate that a numeric input is within range.
   * @param {HTMLInputElement} input
   * @param {number} min
   * @param {number} max
   * @param {string} [errorMsg]
   * @returns {boolean}
   */
  function requireNumberInRange(input, min, max, errorMsg) {
    var value = parseFloat(input.value);
    if (isNaN(value)) {
      showFieldError(input, errorMsg || t('validation.invalidNumber'));
      return false;
    }
    if (value < min || value > max) {
      showFieldError(input, errorMsg || t('validation.outOfRange', { min: min, max: max }));
      return false;
    }
    clearFieldError(input);
    return true;
  }

  /**
   * Validate file size (bytes).
   * @param {File} file
   * @param {number} maxBytes
   * @returns {{valid: boolean, message: string}}
   */
  function validateFileSize(file, maxBytes) {
    if (file.size > maxBytes) {
      var maxMB = (maxBytes / (1024 * 1024)).toFixed(0);
      var fileMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        message: t('validation.fileTooLarge', { fileSize: fileMB, maxSize: maxMB })
      };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validate image dimensions (megapixels).
   * Requires loading the image first — returns a Promise.
   * @param {File} file
   * @param {number} maxMegapixels
   * @returns {Promise<{valid: boolean, error: boolean, width: number, height: number, message: string}>}
   */
  function validateImageDimensions(file, maxMegapixels) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var mp = (img.width * img.height) / 1e6;
        URL.revokeObjectURL(url);
        if (mp > maxMegapixels) {
          resolve({
            valid: false,
            error: false,
            width: img.width,
            height: img.height,
            message: t('validation.imageTooLarge', { width: img.width, height: img.height, mp: mp.toFixed(1), max: maxMegapixels })
          });
        } else {
          resolve({ valid: true, error: false, width: img.width, height: img.height, message: '' });
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve({ valid: false, error: true, width: 0, height: 0, message: t('validation.imageReadError') });
      };
      img.src = url;
    });
  }

  /**
   * Show inline error on a form field.
   * Expects a sibling element with class .form-error or creates one.
   * Sets data-invalid="true" on the input for CSS styling.
   * @param {HTMLElement} input
   * @param {string} message
   */
  function getDescribedByTokens(el) {
    var attr = el.getAttribute('aria-describedby');
    if (!attr) return [];
    return attr.trim().split(/\s+/).filter(Boolean);
  }

  function addDescribedById(el, id) {
    if (!id) return;
    var tokens = getDescribedByTokens(el);
    if (tokens.indexOf(id) === -1) {
      tokens.push(id);
      el.setAttribute('aria-describedby', tokens.join(' '));
    }
  }

  function removeDescribedById(el, id) {
    if (!id) return;
    var tokens = getDescribedByTokens(el).filter(function (token) {
      return token !== id;
    });
    if (tokens.length > 0) {
      el.setAttribute('aria-describedby', tokens.join(' '));
    } else {
      el.removeAttribute('aria-describedby');
    }
  }

  /**
   * Parse a discrete integer from text input (accepting comma/dot decimals and
   * whitespace) and clamp it to [min, max]. Empty/incomplete text defaults to min.
   *
   * @param {string|number} rawValue
   * @param {number} min
   * @param {number} max
   * @returns {{ valid: boolean, isEmpty: boolean, value: number }}
   */
  function parseDiscreteNumber(rawValue, min, max) {
    var str = String(rawValue === null || rawValue === undefined ? '' : rawValue).trim();
    if (!str) {
      return { valid: true, isEmpty: true, value: min };
    }
    var normalized = str.replace(/,/g, '.');
    if (normalized === '-' || normalized === '+' || normalized === '.') {
      return { valid: true, isEmpty: true, value: min };
    }
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
      return { valid: false, isEmpty: false, value: min };
    }
    var num = Math.round(Number(normalized));
    if (!isFinite(num)) {
      return { valid: false, isEmpty: false, value: min };
    }
    var clamped = Math.max(min, Math.min(max, num));
    return { valid: true, isEmpty: false, value: clamped };
  }

  /**
   * Normalize a discrete numeric input element on blur/change when its value is
   * empty or parseable as a number. Leaves unparseable text intact so native
   * constraint validation (:user-invalid) can signal the invalid value.
   *
   * @param {HTMLInputElement} input
   * @param {number} min
   * @param {number} max
   * @returns {boolean} true if input.value was updated
   */
  function normalizeDiscreteInput(input, min, max) {
    if (!input) return false;
    var parsed = parseDiscreteNumber(input.value, min, max);
    if (!parsed.valid) return false;
    var next = String(parsed.value);
    if (input.value !== next) {
      input.value = next;
      return true;
    }
    return false;
  }

  /**
   * Display an inline error under a form field.
   * @param {HTMLElement} input
   * @param {string} message
   */
  function showFieldError(input, message) {
    input.setAttribute('data-invalid', 'true');
    input.setAttribute('aria-invalid', 'true');

    var errorEl = getErrorElement(input);
    errorEl.textContent = message;
    errorEl.setAttribute('data-visible', 'true');

    // Link error to input for screen readers without clobbering preexisting hints
    var errorId = errorEl.id || ('err-' + (input.id || Math.random().toString(36).slice(2, 8)));
    errorEl.id = errorId;
    addDescribedById(input, errorId);
  }

  /**
   * Clear inline error on a form field.
   * @param {HTMLElement} input
   */
  function clearFieldError(input) {
    input.removeAttribute('data-invalid');
    input.removeAttribute('aria-invalid');

    var errorEl = getErrorElement(input, false);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.setAttribute('data-visible', 'false');
      removeDescribedById(input, errorEl.id);
    }
  }

  /**
   * Clear all field errors inside a container.
   * @param {HTMLElement} container
   */
  function clearAllErrors(container) {
    var invalids = container.querySelectorAll('[data-invalid]');
    for (var i = 0; i < invalids.length; i++) {
      clearFieldError(invalids[i]);
    }
  }

  /**
   * Get or create the error element for an input.
   * Looks for .form-error sibling in the same .form-group parent.
   */
  function getErrorElement(input, create) {
    create = create !== false;
    var group = input.closest('.form-group');
    var nextSibling = input.nextElementSibling;
    var errorEl = group
      ? group.querySelector('.form-error')
      : (nextSibling && nextSibling.classList.contains('form-error') ? nextSibling : null);

    if (!errorEl && create) {
      errorEl = document.createElement('span');
      errorEl.className = 'form-error';
      errorEl.setAttribute('aria-live', 'polite');
      errorEl.setAttribute('aria-atomic', 'true');
      errorEl.setAttribute('data-visible', 'false');
      if (group) {
        group.appendChild(errorEl);
      } else {
        input.parentNode.insertBefore(errorEl, input.nextSibling);
      }
    }

    return errorEl;
  }

  // Expose globally
  window.YMT = window.YMT || {};
  window.YMT.requireNonEmpty = requireNonEmpty;
  window.YMT.requireNumberInRange = requireNumberInRange;
  window.YMT.validateFileSize = validateFileSize;
  window.YMT.validateImageDimensions = validateImageDimensions;
  window.YMT.parseDiscreteNumber = parseDiscreteNumber;
  window.YMT.normalizeDiscreteInput = normalizeDiscreteInput;
  window.YMT.showFieldError = showFieldError;
  window.YMT.clearFieldError = clearFieldError;
  window.YMT.clearAllErrors = clearAllErrors;
})();
