/* ============================================================
   YourMiniTools — Global JS v1.1.0
   Theme toggle, header/footer injection, back-to-top,
   cookie banner, language switcher (i18n integration)
   Constraints: CSP script-src 'self', no inline styles, no eval
   Note: innerHTML usage is safe here — all content is hardcoded
   constants or escaped via escapeHTML(). No user input is used.
   ============================================================ */

(function () {
  'use strict';

  /* --- Constants --------------------------------------------- */
  var THEME_KEY = 'ymt-theme';
  var COOKIE_KEY = 'ymt-cookie-seen';
  var SCROLL_THRESHOLD = 300;

  /* --- Theme ------------------------------------------------- */
  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function applyTheme(theme) {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* quota */ }
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var isDark = current === 'dark' ||
      (current !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(isDark ? 'light' : 'dark');
  }

  // Apply saved theme immediately (script is defer, runs after parsing)
  var saved = getStoredTheme();
  if (saved) applyTheme(saved);

  /* --- SVG Icons (hardcoded, no external requests) ----------- */
  var ICONS = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
    logo: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14L14 4l10 10"/><path d="M7 12v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V12"/></svg>'
  };

  /* --- Utility: i18n helper ---------------------------------- */
  function t(key, params) {
    if (window.YMT && window.YMT.i18n && window.YMT.i18n.t) {
      return window.YMT.i18n.t(key, params);
    }
    return key;
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
    var currentLocale = (window.YMT && window.YMT.i18n && window.YMT.i18n.getLocale)
      ? window.YMT.i18n.getLocale()
      : 'en';

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
        '<a href="/" class="site-logo" aria-label="' + escapeHTML(t('nav.logoAria')) + '">' +
          '<span class="site-logo-icon" aria-hidden="true">' + ICONS.logo + '</span>' +
          '<span>YourMiniTools</span>' +
        '</a>' +
        '<div class="header-actions">' +
          '<select class="lang-select" id="ymt-lang-select" aria-label="' + escapeHTML(t('common.selectLanguage')) + '">' +
            langOptions +
          '</select>' +
          '<button class="theme-toggle" id="theme-toggle" type="button" aria-label="' + escapeHTML(t('common.toggleTheme')) + '">' +
            '<span class="icon-sun" aria-hidden="true">' + ICONS.sun + '</span>' +
            '<span class="icon-moon" aria-hidden="true">' + ICONS.moon + '</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Language switcher
    var langSelect = document.getElementById('ymt-lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', function () {
        var locale = langSelect.value;
        if (window.YMT && window.YMT.i18n && window.YMT.i18n.setLocale) {
          window.YMT.i18n.setLocale(locale);
        }
        // Update URL to reflect chosen language (enables Google to index each language version)
        try {
          var params = new URLSearchParams(window.location.search);
          if (locale === 'en') {
            params.delete('lang');
          } else {
            params.set('lang', locale);
          }
          var newSearch = params.toString() ? '?' + params.toString() : '';
          history.replaceState(null, '', window.location.pathname + newSearch + window.location.hash);
        } catch (e) { /* history API not supported */ }
      });
    }
  }

  /* --- Footer ------------------------------------------------ */
  function buildFooter() {
    var footer = document.querySelector('.site-footer');
    if (!footer) return;

    var year = new Date().getFullYear();

    /* Safe: only hardcoded strings and a numeric year */
    footer.innerHTML =
      '<div class="footer-inner">' +
        '<nav class="footer-links" aria-label="' + escapeHTML(t('nav.footerLinks')) + '">' +
          '<a href="/privacy" data-i18n="common.privacy">Privacy</a>' +
          '<a href="/about" data-i18n="common.about">About</a>' +
        '</nav>' +
        '<p class="footer-copy">' +
          '\u00A9 ' + year + ' YourMiniTools \u2014 <span data-i18n="common.madeWith">Made with \u2665 in Italy</span>' +
        '</p>' +
      '</div>';
  }

  /* --- Back to Top ------------------------------------------- */
  function buildBackToTop() {
    var btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', t('common.scrollToTop'));
    btn.setAttribute('data-i18n-aria', 'common.scrollToTop');
    btn.setAttribute('data-visible', 'false');
    /* Safe: hardcoded SVG icon */
    btn.innerHTML = ICONS.arrowUp;
    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          btn.setAttribute('data-visible', window.scrollY > SCROLL_THRESHOLD ? 'true' : 'false');
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* --- Cookie Banner ----------------------------------------- */
  function buildCookieBanner() {
    try { if (localStorage.getItem(COOKIE_KEY)) return; } catch (e) { return; }

    var banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');

    /* Safe: hardcoded strings only */
    banner.innerHTML =
      '<div class="cookie-banner-inner">' +
        '<p class="cookie-banner-text">' +
          '<span data-i18n="cookie.text">This site does not use its own cookies. Cloudflare infrastructure may set technical cookies.</span> ' +
          '<a href="/privacy" data-i18n="cookie.moreInfo">More info</a>' +
        '</p>' +
        '<button class="btn btn-primary" id="cookie-accept" type="button" data-i18n="cookie.accept">OK, got it</button>' +
      '</div>';
    document.body.appendChild(banner);

    // Two-frame delay so the CSS transition animates in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        banner.setAttribute('data-visible', 'true');
        document.body.classList.add('has-cookie-banner');
      });
    });

    document.getElementById('cookie-accept').addEventListener('click', function () {
      banner.setAttribute('data-visible', 'false');
      document.body.classList.remove('has-cookie-banner');
      var removed = false;
      function removeBanner() {
        if (removed) return;
        removed = true;
        banner.remove();
      }
      banner.addEventListener('transitionend', removeBanner, { once: true });
      // Fallback if transition doesn't fire (prefers-reduced-motion: reduce)
      setTimeout(removeBanner, 500);
      try { localStorage.setItem(COOKIE_KEY, '1'); } catch (e) { /* quota */ }
    });
  }

  /* --- Privacy Contact Paragraph (preserves <a> during i18n) -- */
  function updatePrivacyContact() {
    var para = document.querySelector('.privacy-contact-para');
    if (!para) return;

    var template = t('page.privacy.contact.text');
    var linkText = t('page.privacy.contact.aboutLinkText');

    // Clear paragraph
    while (para.firstChild) para.removeChild(para.firstChild);

    // Split template on {aboutLink} and build DOM
    var parts = template.split('{aboutLink}');
    para.appendChild(document.createTextNode(parts[0] || ''));
    var link = document.createElement('a');
    link.href = '/about.html';
    link.textContent = linkText;
    para.appendChild(link);
    if (parts[1]) para.appendChild(document.createTextNode(parts[1]));
  }

  /* --- Manifest switcher ------------------------------------- */
  function updateManifest(locale) {
    var link = document.querySelector('link[rel="manifest"]');
    if (!link) return;
    var manifests = { en: '/manifest.json', it: '/manifest.it.json', es: '/manifest.es.json' };
    link.href = manifests[locale] || '/manifest.json';
  }

  /* --- Init -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    buildHeader();
    buildFooter();
    buildBackToTop();
    buildCookieBanner();
    updatePrivacyContact();

    // Re-apply translations when i18n module finishes loading
    document.addEventListener('languagechange', function (e) {
      buildHeader();
      buildFooter();
      updatePrivacyContact();

      // Swap manifest to language-specific version
      if (e.detail && e.detail.locale) {
        updateManifest(e.detail.locale);
      }

      // Apply translations to cookie banner if still visible
      if (window.YMT && window.YMT.i18n && window.YMT.i18n.applyTranslations) {
        window.YMT.i18n.applyTranslations();
      }
    });
  });
})();
