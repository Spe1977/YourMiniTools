/* ============================================================
   YourMiniTools — Core Notifications Module
   Toast notification system (success, error, warning, info)
   Uses native popover="manual" (Top Layer) inside a persistent
   accessible region container with hover/focus timer pause.
   CSS classes defined in global.css (.notification-container, .notification)
   ============================================================ */

(function () {
  'use strict';

  var CONTAINER_CLASS = 'notification-container';
  var DEFAULT_DURATION = 4000;
  var MIN_RESUME_MS = 1000;
  var STACK_GAP_PX = 8;
  var MAX_VISIBLE = 5;

  var container = null;
  var toastCounter = 0;
  var activeStates = [];
  var lastExternalFocus = null;
  var supportsDisplayTransitionCache;

  function translate(key, fallback) {
    if (window.YMT && typeof window.YMT.t === 'function') {
      var val = window.YMT.t(key);
      if (val && val !== key) {
        return val;
      }
    }
    return fallback;
  }

  function updateContainerLabel() {
    if (!container) return;
    container.setAttribute('aria-label', translate('common.notificationsRegion', 'Notifications'));
  }

  function ensureContainer() {
    if (container && document.body && document.body.contains(container)) {
      return container;
    }

    var existing = document.querySelector('.' + CONTAINER_CLASS);
    if (existing) {
      container = existing;
    } else if (document.body) {
      container = document.createElement('div');
      container.className = CONTAINER_CLASS;
      document.body.appendChild(container);
    } else {
      return null;
    }

    container.setAttribute('role', 'region');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-relevant', 'additions text');
    container.setAttribute('data-i18n-aria', 'common.notificationsRegion');
    updateContainerLabel();
    return container;
  }

  function recordExternalFocus(target) {
    var el = target || document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return;
    if (container && container.contains(el)) return;
    lastExternalFocus = el;
  }

  function initAccessibilityHost() {
    ensureContainer();
    recordExternalFocus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccessibilityHost);
  } else {
    initAccessibilityHost();
  }

  document.addEventListener('languagechange', updateContainerLabel);
  document.addEventListener('focusin', function (e) {
    recordExternalFocus(e.target);
  }, true);

  function canTransitionDisplay() {
    if (supportsDisplayTransitionCache !== undefined) {
      return supportsDisplayTransitionCache;
    }
    if (!window.CSS || typeof window.CSS.supports !== 'function' ||
        !window.CSS.supports('transition-behavior', 'allow-discrete') || !document.body) {
      supportsDisplayTransitionCache = false;
      return false;
    }
    var probe = document.createElement('div');
    probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
    document.body.appendChild(probe);
    window.getComputedStyle(probe).getPropertyValue('display');
    probe.style.display = 'none';
    supportsDisplayTransitionCache = window.getComputedStyle(probe).getPropertyValue('display') === 'block';
    probe.remove();
    return supportsDisplayTransitionCache;
  }

  function supportsTopLayerExit() {
    return Boolean(
      window.CSS &&
      typeof window.CSS.supports === 'function' &&
      window.CSS.supports('overlay', 'auto') &&
      canTransitionDisplay()
    );
  }

  function repositionToasts() {
    var items = [];
    var offset = 0;
    for (var i = 0; i < activeStates.length; i++) {
      var st = activeStates[i];
      if (st.closing) continue;
      items.push({ st: st, offset: offset });
      offset += st.el.offsetHeight + STACK_GAP_PX;
    }
    for (var j = 0; j < items.length; j++) {
      items[j].st.el.style.setProperty('--toast-offset', items[j].offset + 'px');
    }
  }

  function restoreFocusAfterDismiss(closedState) {
    if (!closedState.hadFocus) return;
    closedState.hadFocus = false;

    var remaining = activeStates.filter(function (st) {
      return st !== closedState && !st.closing && st.el.isConnected;
    });

    var closedIdx = activeStates.indexOf(closedState);
    var nextTarget = null;
    for (var i = closedIdx + 1; i < activeStates.length; i++) {
      if (!activeStates[i].closing && activeStates[i].el.isConnected) {
        nextTarget = activeStates[i];
        break;
      }
    }
    if (!nextTarget && remaining.length > 0) {
      nextTarget = remaining[remaining.length - 1];
    }

    if (nextTarget) {
      var nextBtn = nextTarget.el.querySelector('.notification-close');
      if (nextBtn && typeof nextBtn.focus === 'function') {
        nextBtn.focus();
        return;
      }
    }

    if (
      lastExternalFocus &&
      lastExternalFocus.isConnected &&
      !lastExternalFocus.disabled &&
      !lastExternalFocus.closest('[hidden]') &&
      typeof lastExternalFocus.focus === 'function'
    ) {
      lastExternalFocus.focus();
    }
  }

  function removeState(state) {
    var idx = activeStates.indexOf(state);
    if (idx !== -1) {
      activeStates.splice(idx, 1);
    }
    repositionToasts();
  }

  function waitForExitAnimations(el, done) {
    var animations = typeof el.getAnimations === 'function'
      ? el.getAnimations({ subtree: true })
      : [];

    if (!animations.length) {
      done();
      return;
    }

    var settled = false;
    var finishOnce = function () {
      if (settled) return;
      settled = true;
      done();
    };

    Promise.allSettled(animations.map(function (anim) {
      return anim.finished;
    })).then(finishOnce, finishOnce);

    setTimeout(finishOnce, 600);
  }

  function finalizeRemoval(state) {
    if (state.removed) return;
    state.removed = true;
    if (state.timerId !== null) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
    removeState(state);
    if (state.el.parentNode) {
      state.el.remove();
    }
  }

  function dismissToast(state, immediate) {
    if (state.closing) return;
    state.closing = true;
    if (state.timerId !== null) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }

    if (container && state.el.contains(document.activeElement)) {
      state.hadFocus = true;
    }

    if (state.supportsPopover) {
      if (!immediate && !supportsTopLayerExit()) {
        state.el.setAttribute('data-closing', '');
        restoreFocusAfterDismiss(state);
        repositionToasts();
        waitForExitAnimations(state.el, function () {
          if (state.el.matches(':popover-open')) {
            try {
              state.el.hidePopover();
            } catch (_) {
              /* Already closed */
            }
          }
          finalizeRemoval(state);
        });
        return;
      }

      restoreFocusAfterDismiss(state);
      try {
        state.el.hidePopover();
      } catch (_) {
        finalizeRemoval(state);
        return;
      }
      repositionToasts();
      waitForExitAnimations(state.el, function () {
        finalizeRemoval(state);
      });
      return;
    }

    restoreFocusAfterDismiss(state);
    state.el.setAttribute('data-visible', 'false');
    repositionToasts();
    if (immediate) {
      finalizeRemoval(state);
    } else {
      waitForExitAnimations(state.el, function () {
        finalizeRemoval(state);
      });
    }
  }

  /**
   * Show a toast notification.
   *
   * @param {string} message - Text to display
   * @param {'success'|'error'|'warning'|'info'} [type='info'] - Visual variant
   * @param {number} [duration=4000] - Auto-dismiss delay in ms (0 = sticky)
   * @returns {HTMLElement|null} The notification element
   */
  function showNotification(message, type, duration) {
    var host = ensureContainer();
    if (!host) return null;

    type = type || 'info';
    var ms = duration !== undefined ? duration : DEFAULT_DURATION;
    recordExternalFocus();

    var openStates = activeStates.filter(function (st) {
      return !st.closing;
    });
    while (openStates.length >= MAX_VISIBLE) {
      var oldest = openStates.shift();
      dismissToast(oldest, true);
    }

    toastCounter += 1;
    var toastId = 'ymt-toast-' + toastCounter;

    var el = document.createElement('div');
    el.id = toastId;
    el.className = 'notification';
    el.setAttribute('role', 'status');
    el.setAttribute('data-type', type);
    el.setAttribute('popover', 'manual');

    var msgSpan = document.createElement('span');
    msgSpan.className = 'notification-message';
    msgSpan.textContent = message;

    var closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', translate('common.closeNotification', 'Close notification'));
    closeBtn.setAttribute('popovertarget', toastId);
    closeBtn.setAttribute('popovertargetaction', 'hide');

    var closeIcon = document.createElement('span');
    closeIcon.setAttribute('aria-hidden', 'true');
    closeIcon.textContent = '\u00d7';
    closeBtn.appendChild(closeIcon);

    el.appendChild(msgSpan);
    el.appendChild(closeBtn);
    host.appendChild(el);

    var supportsPopover = typeof el.showPopover === 'function';
    var state = {
      el: el,
      duration: ms,
      remaining: ms,
      startedAt: 0,
      timerId: null,
      hovered: false,
      focused: false,
      closing: false,
      removed: false,
      hadFocus: false,
      supportsPopover: supportsPopover
    };
    activeStates.push(state);

    function startTimer() {
      if (state.closing || state.duration <= 0 || state.hovered || state.focused || state.timerId !== null) {
        return;
      }
      state.startedAt = Date.now();
      state.timerId = setTimeout(function () {
        state.timerId = null;
        dismissToast(state, false);
      }, state.remaining);
    }

    function pauseTimer() {
      if (state.timerId === null) return;
      clearTimeout(state.timerId);
      state.timerId = null;
      var elapsed = Date.now() - state.startedAt;
      state.remaining = Math.max(MIN_RESUME_MS, state.remaining - elapsed);
    }

    el.addEventListener('mouseenter', function () {
      state.hovered = true;
      pauseTimer();
    });

    el.addEventListener('mouseleave', function () {
      state.hovered = false;
      startTimer();
    });

    el.addEventListener('focusin', function () {
      state.focused = true;
      pauseTimer();
    });

    el.addEventListener('focusout', function (e) {
      if (e.relatedTarget && el.contains(e.relatedTarget)) {
        return;
      }
      state.focused = false;
      startTimer();
    });

    if (supportsPopover) {
      el.addEventListener('beforetoggle', function (e) {
        if (e.newState === 'closed' && el.contains(document.activeElement)) {
          state.hadFocus = true;
        }
      });

      el.addEventListener('toggle', function (e) {
        if (e.newState !== 'closed') return;
        if (!state.closing) {
          state.closing = true;
          if (state.timerId !== null) {
            clearTimeout(state.timerId);
            state.timerId = null;
          }
          restoreFocusAfterDismiss(state);
          repositionToasts();
          waitForExitAnimations(el, function () {
            finalizeRemoval(state);
          });
        }
      });

      try {
        el.showPopover();
      } catch (_) {
        el.setAttribute('data-visible', 'true');
      }
      repositionToasts();
    } else {
      closeBtn.addEventListener('click', function () {
        dismissToast(state, false);
      });
      requestAnimationFrame(function () {
        el.setAttribute('data-visible', 'true');
        repositionToasts();
      });
    }

    startTimer();
    return el;
  }

  window.YMT = window.YMT || {};
  window.YMT.showNotification = showNotification;
})();
