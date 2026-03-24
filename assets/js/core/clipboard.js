/* ============================================================
   YourMiniTools — Clipboard Module v1.0.0
   Copy text to clipboard with toast feedback
   Depends on: notifications.js (YMT.showNotification)
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
   * Copy text to the user's clipboard.
   * Shows a success/error toast notification automatically.
   * @param {string} text — The text to copy
   * @param {string} [successMsg] — Custom success message
   * @returns {Promise<boolean>} — true if copy succeeded
   */
  function copyToClipboard(text, successMsg) {
    successMsg = successMsg || t('common.copied');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        if (window.YMT && window.YMT.showNotification) {
          window.YMT.showNotification(successMsg, 'success', 2500);
        }
        return true;
      }).catch(function () {
        return fallbackCopy(text, successMsg);
      });
    }

    return fallbackCopy(text, successMsg);
  }

  /**
   * Fallback for browsers without navigator.clipboard (e.g. non-HTTPS).
   */
  function fallbackCopy(text, successMsg) {
    return new Promise(function (resolve) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      // Position off-screen without inline styles — use className
      textarea.className = 'sr-only';
      textarea.setAttribute('aria-hidden', 'true');
      textarea.setAttribute('tabindex', '-1');
      document.body.appendChild(textarea);
      textarea.select();

      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }

      document.body.removeChild(textarea);

      if (window.YMT && window.YMT.showNotification) {
        if (ok) {
          window.YMT.showNotification(successMsg, 'success', 2500);
        } else {
          window.YMT.showNotification(t('common.copyFailed'), 'error');
        }
      }

      resolve(ok);
    });
  }

  // Expose globally
  window.YMT = window.YMT || {};
  window.YMT.copyToClipboard = copyToClipboard;
})();
