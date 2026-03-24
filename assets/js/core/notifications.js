/* ============================================================
   YourMiniTools — Notifications Module v1.0.0
   Toast notification system (success, error, warning, info)
   CSS classes defined in global.css (.notification-container, .notification)
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

  var CONTAINER_CLASS = 'notification-container';
  var DEFAULT_DURATION = 4000;
  var MAX_VISIBLE = 5;

  var container = null;

  function getContainer() {
    if (container && container.parentNode) return container;
    container = document.createElement('div');
    container.className = CONTAINER_CLASS;
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(container);
    return container;
  }

  /**
   * Show a toast notification.
   * @param {string} message — Text to display
   * @param {string} [type='info'] — 'success' | 'error' | 'warning' | 'info'
   * @param {number} [duration] — Auto-dismiss ms (0 = manual only, default 4000)
   */
  function showNotification(message, type, duration) {
    type = type || 'info';
    duration = duration !== undefined ? duration : DEFAULT_DURATION;

    var wrap = getContainer();

    // Enforce max visible — remove oldest
    while (wrap.children.length >= MAX_VISIBLE) {
      removeNotification(wrap.firstElementChild);
    }

    var el = document.createElement('div');
    el.className = 'notification';
    el.setAttribute('role', 'status');
    el.setAttribute('data-type', type);
    el.setAttribute('data-visible', 'false');

    var msgSpan = document.createElement('span');
    msgSpan.className = 'notification-message';
    msgSpan.textContent = message;

    var closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', t('common.closeNotification'));
    closeBtn.textContent = '\u00D7';

    el.appendChild(msgSpan);
    el.appendChild(closeBtn);
    wrap.appendChild(el);

    // Animate in (two-frame delay for CSS transition)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.setAttribute('data-visible', 'true');
      });
    });

    closeBtn.addEventListener('click', function () {
      removeNotification(el);
    });

    if (duration > 0) {
      setTimeout(function () {
        removeNotification(el);
      }, duration);
    }

    return el;
  }

  function removeNotification(el) {
    if (!el || !el.parentNode) return;
    el.setAttribute('data-visible', 'false');
    el.addEventListener('transitionend', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, { once: true });
    // Fallback if transition doesn't fire
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 500);
  }

  // Expose globally
  window.YMT = window.YMT || {};
  window.YMT.showNotification = showNotification;
})();
