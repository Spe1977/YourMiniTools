/* ============================================================
   YourMiniTools — Global JS v1.0.3
   Theme toggle, header/footer injection, back-to-top,
   language switcher (i18n integration)
   Constraints: CSP script-src 'self', no inline styles, no eval
   Note: innerHTML usage is safe here — all content is hardcoded
   constants or escaped via escapeHTML(). No user input is used.
   ============================================================ */

(function () {
  'use strict';

  /* --- Constants --------------------------------------------- */
  var THEME_KEY = 'ymt-theme';
  var SCROLL_THRESHOLD = 300;

  /* --- Theme (3-state model: system / light / dark) ---------- */
  var mqlDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function getStoredTheme() {
    try {
      var val = localStorage.getItem(THEME_KEY);
      return (val === 'dark' || val === 'light') ? val : null;
    } catch (e) {
      return null;
    }
  }

  function getSystemTheme() {
    return (mqlDark && mqlDark.matches) ? 'dark' : 'light';
  }

  function syncThemeDOM(theme) {
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
      if (meta) meta.setAttribute('content', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (meta) meta.setAttribute('content', 'light dark');
    }
  }

  function applyTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
      syncThemeDOM(theme);
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* quota */ }
    } else {
      syncThemeDOM(null);
      try { localStorage.removeItem(THEME_KEY); } catch (e) { /* quota */ }
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var sys = getSystemTheme();
    var isDark = current === 'dark' || (current !== 'light' && sys === 'dark');
    var target = isDark ? 'light' : 'dark';
    // Revert to OS preference when toggled back to match system theme
    applyTheme(target === sys ? null : target);
  }

  // Sync theme immediately and listen for cross-tab changes
  syncThemeDOM(getStoredTheme());

  window.addEventListener('storage', function (e) {
    if (e.key === THEME_KEY || e.key === null) {
      var next = (e.newValue === 'dark' || e.newValue === 'light') ? e.newValue : null;
      syncThemeDOM(next);
    }
  });

  /* --- SVG Icons (hardcoded, no external requests) ----------- */
  var ICONS = {
    sun: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    moon: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    arrowUp: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
    logo: '<svg aria-hidden="true" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14L14 4l10 10"/><path d="M7 12v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V12"/></svg>'
  };

  /* --- Utility: i18n helper ---------------------------------- */
  var FALLBACK_STRINGS = {
    'nav.logoAria': 'YourMiniTools \u2014 Home',
    'common.selectLanguage': 'Select language',
    'common.switchToLight': 'Switch to light theme',
    'common.switchToDark': 'Switch to dark theme',
    'nav.footerLinks': 'Footer links',
    'common.scrollToTop': 'Back to top',
    'common.privacy': 'Privacy',
    'common.about': 'About',
    'common.madeWith': 'Made with \u2665 in Italy'
  };

  function t(key, params) {
    if (window.YMT && window.YMT.i18n && window.YMT.i18n.t) {
      var val = window.YMT.i18n.t(key, params);
      if (val !== key) return val;
    }
    return Object.prototype.hasOwnProperty.call(FALLBACK_STRINGS, key) ? FALLBACK_STRINGS[key] : key;
  }

  /* --- Utility: safe HTML escaping --------------------------- */
  function escapeHTML(str) {
    var el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  /* --- Header ------------------------------------------------
     All HTML is hardcoded or escaped via escapeHTML().
     Dynamic values: toolName/pageName from data-* attributes (escaped),
     year (number). No user input touches innerHTML.
     -------------------------------------------------------------- */
  function buildHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var currentLocale = (window.YMT && window.YMT.i18n && window.YMT.i18n.getLocale)
      ? window.YMT.i18n.getLocale()
      : 'en';

    // Update existing header in-place so focus (e.g. on #ymt-lang-select) is preserved
    var existingSelect = header.querySelector('#ymt-lang-select');
    if (existingSelect) {
      var logoEl = header.querySelector('.site-logo');
      if (logoEl) logoEl.setAttribute('aria-label', t('nav.logoAria'));
      existingSelect.setAttribute('aria-label', t('common.selectLanguage'));
      if (existingSelect.value !== currentLocale) existingSelect.value = currentLocale;
      var lightLbl = header.querySelector('.theme-label-light');
      if (lightLbl) lightLbl.textContent = t('common.switchToLight');
      var darkLbl = header.querySelector('.theme-label-dark');
      if (darkLbl) darkLbl.textContent = t('common.switchToDark');
      return;
    }

    // Language selector
    var langOptions = '';
    var langLabels = {
      en: '\uD83C\uDDEC\uD83C\uDDE7 EN',
      it: '\uD83C\uDDEE\uD83C\uDDF9 IT',
      es: '\uD83C\uDDEA\uD83C\uDDF8 ES'
    };
    var supported = (window.YMT && window.YMT.i18n && window.YMT.i18n.getSupportedLocales)
      ? window.YMT.i18n.getSupportedLocales()
      : ['en'];

    supported.forEach(function (loc) {
      var selected = loc === currentLocale ? ' selected' : '';
      langOptions += '<option value="' + loc + '"' + selected + '>' + (langLabels[loc] || loc.toUpperCase()) + '</option>';
    });

    /*
     * Safe: all interpolated values are either hardcoded constants (ICONS.*,
     * langLabels), pre-validated locale codes, or passed through escapeHTML().
     * No user-supplied input reaches innerHTML.
     */
    header.innerHTML =
      '<div class="header-inner">' +
        '<a href="/" class="site-logo" data-i18n-aria="nav.logoAria" aria-label="' + escapeHTML(t('nav.logoAria')) + '">' +
          '<span class="site-logo-icon" aria-hidden="true">' + ICONS.logo + '</span>' +
          '<span>YourMiniTools</span>' +
        '</a>' +
        '<div class="header-actions">' +
          '<select class="lang-select" id="ymt-lang-select" data-i18n-aria="common.selectLanguage" aria-label="' + escapeHTML(t('common.selectLanguage')) + '">' +
            langOptions +
          '</select>' +
          '<button class="theme-toggle" id="theme-toggle" type="button">' +
            '<span class="icon-sun" aria-hidden="true">' + ICONS.sun + '</span>' +
            '<span class="icon-moon" aria-hidden="true">' + ICONS.moon + '</span>' +
            '<span class="theme-label theme-label-light sr-only" data-i18n="common.switchToLight">' + escapeHTML(t('common.switchToLight')) + '</span>' +
            '<span class="theme-label theme-label-dark sr-only" data-i18n="common.switchToDark">' + escapeHTML(t('common.switchToDark')) + '</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Language switcher
    var langSelect = document.getElementById('ymt-lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', function () {
        if (window.YMT && window.YMT.i18n && window.YMT.i18n.setLocale) {
          window.YMT.i18n.setLocale(langSelect.value);
        }
      });
    }
  }

  /* --- Footer ------------------------------------------------ */
  function buildFooter() {
    var footer = document.querySelector('.site-footer');
    if (!footer) return;

    var existingNav = footer.querySelector('.footer-links');
    if (existingNav) {
      existingNav.setAttribute('aria-label', t('nav.footerLinks'));
      var footerTrans = footer.querySelectorAll('[data-i18n]');
      for (var i = 0; i < footerTrans.length; i++) {
        var fKey = footerTrans[i].getAttribute('data-i18n');
        var fVal = t(fKey);
        if (fVal !== fKey) footerTrans[i].textContent = fVal;
      }
      return;
    }

    var year = new Date().getFullYear();

    /* Safe: only hardcoded strings and a numeric year */
    footer.innerHTML =
      '<div class="footer-inner">' +
        '<nav class="footer-links" data-i18n-aria="nav.footerLinks" aria-label="' + escapeHTML(t('nav.footerLinks')) + '">' +
          '<a href="/privacy" data-i18n="common.privacy">' + escapeHTML(t('common.privacy')) + '</a>' +
          '<a href="/about" data-i18n="common.about">' + escapeHTML(t('common.about')) + '</a>' +
        '</nav>' +
        '<p class="footer-copy">' +
          '\u00A9 ' + year + ' YourMiniTools \u2014 <span data-i18n="common.madeWith">' + escapeHTML(t('common.madeWith')) + '</span>' +
        '</p>' +
      '</div>';
  }

  /* --- Back to Top ------------------------------------------- */
  function supportsScrollStateQueries() {
    return Boolean(
      window.CSS &&
      typeof window.CSS.supports === 'function' &&
      window.CSS.supports('container-type', 'scroll-state')
    );
  }

  function buildBackToTop() {
    var btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', t('common.scrollToTop'));
    btn.setAttribute('data-i18n-aria', 'common.scrollToTop');
    /* Safe: hardcoded SVG icon */
    btn.innerHTML = ICONS.arrowUp;
    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
      var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });

    // Progressive enhancement: CSS @container scroll-state(scrollable: top) controls visibility natively
    if (supportsScrollStateQueries()) {
      return;
    }

    // Fallback for browsers without CSS container scroll-state query support
    function syncFallbackVisibility() {
      btn.setAttribute('data-visible', window.scrollY > SCROLL_THRESHOLD ? 'true' : 'false');
    }

    syncFallbackVisibility();

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          syncFallbackVisibility();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* --- Privacy Contact Paragraph (preserves <a> during i18n) -- */
  function updatePrivacyContact() {
    var para = document.querySelector('.privacy-contact-para');
    if (!para) return;

    var template = t('page.privacy.contact.text');
    var linkText = t('page.privacy.contact.aboutLinkText');
    if (template === 'page.privacy.contact.text' || linkText === 'page.privacy.contact.aboutLinkText') {
      return;
    }

    // Clear paragraph
    while (para.firstChild) para.removeChild(para.firstChild);

    // Split template on {aboutLink} and build DOM
    var parts = template.split('{aboutLink}');
    para.appendChild(document.createTextNode(parts[0] || ''));
    var link = document.createElement('a');
    link.href = '/about';
    link.textContent = linkText;
    para.appendChild(link);
    if (parts[1]) para.appendChild(document.createTextNode(parts[1]));
  }

  /* --- Init -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    buildHeader();
    buildFooter();
    buildBackToTop();
    updatePrivacyContact();

    // Update dynamic chrome when i18n finishes loading or changes language
    document.addEventListener('languagechange', function () {
      buildHeader();
      buildFooter();
      updatePrivacyContact();
    });
  });

  /* --- Accessible WAI-ARIA Tabs (roving tabindex + arrows) ---- */
  function initTabs(tablistEl) {
    if (!tablistEl) return;
    var tabs = Array.prototype.slice.call(tablistEl.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function getPanel(tab) {
      return tab && tab.id
        ? document.querySelector('[role="tabpanel"][aria-labelledby="' + tab.id + '"]')
        : null;
    }

    function activateTab(nextTab, moveFocus) {
      tabs.forEach(function (t) {
        var active = t === nextTab;
        t.setAttribute('aria-selected', active ? 'true' : 'false');
        t.setAttribute('tabindex', active ? '0' : '-1');
        var panel = getPanel(t);
        if (panel) panel.hidden = !active;
      });
      if (moveFocus) nextTab.focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () {
        activateTab(tab, false);
      });

      tab.addEventListener('keydown', function (e) {
        var nextIndex = -1;
        if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = tabs.length - 1;

        if (nextIndex !== -1) {
          e.preventDefault();
          activateTab(tabs[nextIndex], true);
        }
      });
    });
  }

  window.YMT = window.YMT || {};
  window.YMT.initTabs = initTabs;
})();
