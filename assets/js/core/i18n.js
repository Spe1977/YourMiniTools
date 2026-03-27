/* ============================================================
   YourMiniTools — i18n Module v1.0.0
   Internationalization: language detection, JSON loading,
   DOM binding via data-i18n attributes, API for tool JS.
   Constraints: CSP compliant, no inline styles, no eval
   ============================================================ */

(function () {
  'use strict';

  var SUPPORTED_LOCALES = ['en', 'it', 'es'];
  var DEFAULT_LOCALE = 'en';
  var STORAGE_KEY = 'ymt-lang';
  var VERSION = '1.0.3';

  var currentLocale = DEFAULT_LOCALE;
  var translations = {};
  var fallbackTranslations = {};
  var isReady = false;

  /* --- Locale Detection -------------------------------------- */

  function detectLocale() {
    // 1. localStorage (user's explicit choice)
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LOCALES.indexOf(stored) !== -1) {
        return stored;
      }
    } catch (e) { /* localStorage disabled */ }

    // 2. navigator.language
    var browserLangs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < browserLangs.length; i++) {
      var primary = browserLangs[i].split('-')[0].toLowerCase();
      if (SUPPORTED_LOCALES.indexOf(primary) !== -1) {
        return primary;
      }
    }

    // 3. Fallback
    return DEFAULT_LOCALE;
  }

  /* --- Translation Loading ----------------------------------- */

  function loadTranslations(locale) {
    return fetch('/assets/i18n/' + locale + '.json?v=' + VERSION)
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      });
  }

  /* --- DOM Binding ------------------------------------------- */

  function applyTranslations() {
    // data-i18n → textContent
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      var val = t(key);
      if (val !== key) {
        applyElementTranslation(els[i], val);
      }
    }

    // data-i18n-placeholder → placeholder
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < placeholders.length; j++) {
      var pKey = placeholders[j].getAttribute('data-i18n-placeholder');
      var pVal = t(pKey);
      if (pVal !== pKey) {
        placeholders[j].setAttribute('placeholder', pVal);
      }
    }

    // data-i18n-aria → aria-label
    var arias = document.querySelectorAll('[data-i18n-aria]');
    for (var k = 0; k < arias.length; k++) {
      var aKey = arias[k].getAttribute('data-i18n-aria');
      var aVal = t(aKey);
      if (aVal !== aKey) {
        arias[k].setAttribute('aria-label', aVal);
      }
    }

    // data-i18n-title → title
    var titles = document.querySelectorAll('[data-i18n-title]');
    for (var m = 0; m < titles.length; m++) {
      var tKey = titles[m].getAttribute('data-i18n-title');
      var tVal = t(tKey);
      if (tVal !== tKey) {
        titles[m].setAttribute('title', tVal);
      }
    }
  }

  function applyElementTranslation(el, val) {
    var placeholders = el.querySelectorAll('[data-i18n-param]');
    if (!placeholders.length) {
      el.textContent = val;
      return;
    }

    var params = {};
    for (var i = 0; i < placeholders.length; i++) {
      params[placeholders[i].getAttribute('data-i18n-param')] = placeholders[i].cloneNode(true);
    }

    var fragment = document.createDocumentFragment();
    var pattern = /\{([a-zA-Z0-9_-]+)\}/g;
    var lastIndex = 0;
    var match;

    while ((match = pattern.exec(val)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(val.slice(lastIndex, match.index)));
      }

      if (params[match[1]]) {
        fragment.appendChild(params[match[1]].cloneNode(true));
      } else {
        fragment.appendChild(document.createTextNode(match[0]));
      }

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < val.length) {
      fragment.appendChild(document.createTextNode(val.slice(lastIndex)));
    }

    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    el.appendChild(fragment);
  }

  /* --- Update HTML Metadata ---------------------------------- */

  function updateHtmlMetadata() {
    // <html lang="...">
    document.documentElement.setAttribute('lang', currentLocale);

    // <title>
    var pageType = detectPageType();
    var titleKey = getTitleKey(pageType);
    if (titleKey) {
      var titleVal = t(titleKey);
      if (titleVal !== titleKey) {
        document.title = titleVal;
      }
    }

    // <meta name="description">
    var descKey = getDescKey(pageType);
    if (descKey) {
      var descVal = t(descKey);
      var descMeta = document.querySelector('meta[name="description"]');
      if (descMeta && descVal !== descKey) {
        descMeta.setAttribute('content', descVal);
      }

      var ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc && descVal !== descKey) {
        ogDesc.setAttribute('content', descVal);
      }

      var twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc && descVal !== descKey) {
        twitterDesc.setAttribute('content', descVal);
      }
    }

    if (titleKey) {
      var pageTitle = t(titleKey);
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && pageTitle !== titleKey) {
        ogTitle.setAttribute('content', pageTitle);
      }

      var twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle && pageTitle !== titleKey) {
        twitterTitle.setAttribute('content', pageTitle);
      }
    }

    // og:locale
    var ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) {
      var localeMap = { en: 'en_US', it: 'it_IT', es: 'es_ES', ru: 'ru_RU', zh: 'zh_CN' };
      ogLocale.setAttribute('content', localeMap[currentLocale] || 'en_US');
    }
  }

  function detectPageType() {
    var path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'home';
    if (path.indexOf('/privacy') !== -1) return 'privacy';
    if (path.indexOf('/about') !== -1) return 'about';
    if (path.indexOf('/404') !== -1) return '404';

    // Tool pages — extract slug (supports both /tools/slug and /tools/slug.html)
    var match = path.match(/\/tools\/([^.\/]+)(?:\.html)?$/);
    if (match) return 'tool:' + match[1];
    return null;
  }

  function slugToCamelCase(slug) {
    return slug.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
  }

  function getTitleKey(pageType) {
    if (!pageType) return null;
    if (pageType === 'home') return 'home.title';
    if (pageType === 'privacy') return 'page.privacy.title';
    if (pageType === 'about') return 'page.about.title';
    if (pageType === '404') return 'page.404.title';
    if (pageType.indexOf('tool:') === 0) {
      var slug = pageType.slice(5);
      return 'tool.' + slugToCamelCase(slug) + '.title';
    }
    return null;
  }

  function getDescKey(pageType) {
    if (!pageType) return null;
    if (pageType === 'home') return 'home.metaDescription';
    if (pageType === 'privacy') return 'page.privacy.metaDescription';
    if (pageType === 'about') return 'page.about.metaDescription';
    if (pageType === '404') return 'page.404.metaDescription';
    if (pageType.indexOf('tool:') === 0) {
      var slug = pageType.slice(5);
      return 'tool.' + slugToCamelCase(slug) + '.metaDescription';
    }
    return null;
  }

  /* --- Translation Lookup ------------------------------------ */

  /**
   * Get a translated string by key. Supports parameter substitution.
   * @param {string} key — Dot-separated key (e.g. 'tool.passwordGenerator.title')
   * @param {Object} [params] — Parameters for substitution (e.g. { max: '12 MB' })
   * @returns {string} — Translated string or key if not found
   */
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function t(key, params) {
    var val = translations[key] || fallbackTranslations[key] || key;
    if (params && typeof val === 'string') {
      Object.keys(params).forEach(function (p) {
        val = val.replace(new RegExp('\\{' + escapeRegExp(p) + '\\}', 'g'), params[p]);
      });
    }
    return val;
  }

  /* --- Language Switching ------------------------------------ */

  function setLocale(locale) {
    if (SUPPORTED_LOCALES.indexOf(locale) === -1) return Promise.resolve();
    if (locale === currentLocale && isReady) return Promise.resolve();

    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch (e) { /* quota */ }

    var loadPromise;
    if (locale === DEFAULT_LOCALE) {
      // en.json is the fallback — already loaded or load it
      loadPromise = fallbackTranslations && Object.keys(fallbackTranslations).length > 0
        ? Promise.resolve(fallbackTranslations)
        : loadTranslations(DEFAULT_LOCALE);
    } else {
      loadPromise = loadTranslations(locale);
    }

    return loadPromise.then(function (data) {
      currentLocale = locale;
      if (locale === DEFAULT_LOCALE) {
        translations = data;
        fallbackTranslations = data;
      } else {
        translations = data;
      }
      applyTranslations();
      updateHtmlMetadata();
      isReady = true;

      // Update language selector if it exists
      var langSelect = document.getElementById('ymt-lang-select');
      if (langSelect && langSelect.value !== locale) {
        langSelect.value = locale;
      }

      // Emit custom event
      document.dispatchEvent(new CustomEvent('languagechange', {
        detail: { locale: locale }
      }));
    }).catch(function () {
      // If non-default language fails, fall back to English
      if (locale !== DEFAULT_LOCALE) {
        currentLocale = DEFAULT_LOCALE;
        translations = fallbackTranslations;
        applyTranslations();
        updateHtmlMetadata();
      }
    });
  }

  /* --- Init -------------------------------------------------- */

  function init() {
    var detectedLocale = detectLocale();

    // Always load English as fallback first
    loadTranslations(DEFAULT_LOCALE)
      .then(function (enData) {
        fallbackTranslations = enData;

        if (detectedLocale === DEFAULT_LOCALE) {
          translations = enData;
          currentLocale = DEFAULT_LOCALE;
          isReady = true;
          applyTranslations();
          updateHtmlMetadata();
          document.dispatchEvent(new CustomEvent('languagechange', {
            detail: { locale: DEFAULT_LOCALE }
          }));
        } else {
          return setLocale(detectedLocale);
        }
      })
      .catch(function () {
        // en.json failed to load — use English text already in HTML
        isReady = true;
      });
  }

  // Start loading on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* --- Public API -------------------------------------------- */

  window.YMT = window.YMT || {};
  window.YMT.i18n = {
    t: t,
    setLocale: setLocale,
    getLocale: function () { return currentLocale; },
    getSupportedLocales: function () { return SUPPORTED_LOCALES.slice(); },
    isReady: function () { return isReady; },
    applyTranslations: applyTranslations
  };
})();
