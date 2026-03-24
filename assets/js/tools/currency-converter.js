/* ============================================================
   YourMiniTools — Currency Converter v1.0.0
   Live currency conversion via Frankfurter API (BCE rates).
   localStorage cache with 1h TTL, graceful fallback.
   Constraints: CSP compliant, no innerHTML, no inline styles,
                no eval, IIFE strict mode.
   ============================================================ */

(function () {
  'use strict';

  function t(key, params) {
    if (window.YMT && window.YMT.i18n && window.YMT.i18n.t) {
      return window.YMT.i18n.t(key, params);
    }
    return key;
  }

  var API_BASE = 'https://api.frankfurter.dev/v1';
  var CACHE_KEY = 'ymt-currency-rates';
  var CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

  // Currency definitions: code + emoji flag (names via i18n)
  var CURRENCIES = [
    { code: 'EUR', flag: '\uD83C\uDDEA\uD83C\uDDFA' },
    { code: 'USD', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
    { code: 'GBP', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
    { code: 'JPY', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
    { code: 'CHF', flag: '\uD83C\uDDE8\uD83C\uDDED' },
    { code: 'CAD', flag: '\uD83C\uDDE8\uD83C\uDDE6' },
    { code: 'AUD', flag: '\uD83C\uDDE6\uD83C\uDDFA' },
    { code: 'CNY', flag: '\uD83C\uDDE8\uD83C\uDDF3' },
    { code: 'INR', flag: '\uD83C\uDDEE\uD83C\uDDF3' },
    { code: 'BRL', flag: '\uD83C\uDDE7\uD83C\uDDF7' },
    { code: 'SEK', flag: '\uD83C\uDDF8\uD83C\uDDEA' },
    { code: 'NOK', flag: '\uD83C\uDDF3\uD83C\uDDF4' },
    { code: 'DKK', flag: '\uD83C\uDDE9\uD83C\uDDF0' },
    { code: 'PLN', flag: '\uD83C\uDDF5\uD83C\uDDF1' },
    { code: 'CZK', flag: '\uD83C\uDDE8\uD83C\uDDFF' },
    { code: 'HUF', flag: '\uD83C\uDDED\uD83C\uDDFA' },
    { code: 'RON', flag: '\uD83C\uDDF7\uD83C\uDDF4' },
    { code: 'BGN', flag: '\uD83C\uDDE7\uD83C\uDDEC' },
    { code: 'TRY', flag: '\uD83C\uDDF9\uD83C\uDDF7' },
    { code: 'ZAR', flag: '\uD83C\uDDFF\uD83C\uDDE6' },
    { code: 'MXN', flag: '\uD83C\uDDF2\uD83C\uDDFD' },
    { code: 'SGD', flag: '\uD83C\uDDF8\uD83C\uDDEC' },
    { code: 'HKD', flag: '\uD83C\uDDED\uD83C\uDDF0' },
    { code: 'KRW', flag: '\uD83C\uDDF0\uD83C\uDDF7' },
    { code: 'NZD', flag: '\uD83C\uDDF3\uD83C\uDDFF' },
    { code: 'THB', flag: '\uD83C\uDDF9\uD83C\uDDED' },
    { code: 'MYR', flag: '\uD83C\uDDF2\uD83C\uDDFE' },
    { code: 'IDR', flag: '\uD83C\uDDEE\uD83C\uDDE9' },
    { code: 'PHP', flag: '\uD83C\uDDF5\uD83C\uDDED' },
    { code: 'ISK', flag: '\uD83C\uDDEE\uD83C\uDDF8' },
    { code: 'ILS', flag: '\uD83C\uDDEE\uD83C\uDDF1' }
  ];

  // --- DOM refs -----------------------------------------------
  var amountInput = document.getElementById('cc-amount');
  var fromSelect = document.getElementById('cc-from');
  var toSelect = document.getElementById('cc-to');
  var swapBtn = document.getElementById('cc-swap');
  var resultSection = document.getElementById('cc-result-section');
  var resultEl = document.getElementById('cc-result');
  var rateDetailEl = document.getElementById('cc-rate-detail');
  var statusBanner = document.getElementById('cc-status-banner');
  var statusText = document.getElementById('cc-status-text');
  var manualGroup = document.getElementById('cc-manual-group');
  var manualRateInput = document.getElementById('cc-manual-rate');

  // --- State --------------------------------------------------
  var rates = null;       // { base: 'EUR', date: '...', rates: { USD: 1.08, ... } }
  var ratesTimestamp = 0;  // ms epoch when rates were fetched/cached
  var isFromCache = false;
  var isManualMode = false;
  var debounceTimer = null;

  // --- Init ---------------------------------------------------
  populateSelects();
  fromSelect.value = 'EUR';
  toSelect.value = 'USD';

  loadRates();

  // Re-populate selects on language change for translated currency names
  document.addEventListener('languagechange', function () {
    var fromVal = fromSelect.value;
    var toVal = toSelect.value;
    populateSelects();
    fromSelect.value = fromVal;
    toSelect.value = toVal;
  });

  // --- Events -------------------------------------------------
  amountInput.addEventListener('input', debounceConvert);
  fromSelect.addEventListener('change', onCurrencyChange);
  toSelect.addEventListener('change', debounceConvert);
  swapBtn.addEventListener('click', swapCurrencies);
  manualRateInput.addEventListener('input', debounceConvert);

  resultEl.addEventListener('click', function () {
    var text = resultEl.textContent;
    if (text && text !== '\u2014') {
      YMT.copyToClipboard(text);
    }
  });

  amountInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); convert(); }
  });

  // --- Select Population --------------------------------------

  function populateSelects() {
    while (fromSelect.firstChild) fromSelect.removeChild(fromSelect.firstChild);
    while (toSelect.firstChild) toSelect.removeChild(toSelect.firstChild);

    CURRENCIES.forEach(function (cur) {
      var name = t('tool.currencyConverter.' + cur.code);
      var optFrom = document.createElement('option');
      optFrom.value = cur.code;
      optFrom.textContent = cur.flag + ' ' + cur.code + ' \u2014 ' + name;

      var optTo = optFrom.cloneNode(true);

      fromSelect.appendChild(optFrom);
      toSelect.appendChild(optTo);
    });
  }

  // --- Rate Loading -------------------------------------------

  function loadRates() {
    // Try cache first
    var cached = loadFromCache();
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      rates = cached.data;
      ratesTimestamp = cached.timestamp;
      isFromCache = false; // fresh cache (within TTL) = treated as live data
      showStatus(null);
      convert();
      return;
    }

    // Fetch fresh rates
    fetchRates()
      .then(function (data) {
        rates = data;
        ratesTimestamp = Date.now();
        isFromCache = false;
        saveToCache(data);
        showStatus(null);
        convert();
      })
      .catch(function () {
        // Fallback to stale cache
        if (cached) {
          rates = cached.data;
          ratesTimestamp = cached.timestamp;
          isFromCache = true;
          var dateStr = formatTimestamp(ratesTimestamp);
          showStatus(t('tool.currencyConverter.statusStaleCache', { date: dateStr }));
          convert();
        } else {
          // No cache, no API — manual mode
          isManualMode = true;
          manualGroup.removeAttribute('hidden');
          showStatus(t('tool.currencyConverter.statusNoData'));
        }
      });
  }

  function fetchRates() {
    var base = fromSelect.value;
    return fetch(API_BASE + '/latest?base=' + base)
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        if (!data || typeof data.rates !== 'object' || typeof data.base !== 'string') {
          throw new Error('Invalid API response structure');
        }
        return data;
      });
  }

  function onCurrencyChange() {
    if (isManualMode) {
      debounceConvert();
      return;
    }

    // Re-fetch rates when "from" currency changes
    fetchRates()
      .then(function (data) {
        rates = data;
        ratesTimestamp = Date.now();
        isFromCache = false;
        saveToCache(data);
        showStatus(null);
        convert();
      })
      .catch(function () {
        // Use existing rates with cross-rate calculation
        if (rates) {
          isFromCache = true;
          var dateStr = formatTimestamp(ratesTimestamp);
          showStatus(t('tool.currencyConverter.statusCacheUsed', { date: dateStr }));
          convert();
        }
      });
  }

  // --- localStorage Cache ------------------------------------

  function saveToCache(data) {
    try {
      var cacheObj = { timestamp: Date.now(), data: data };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
    } catch (e) {
      // localStorage full or disabled — silent fail
    }
  }

  function loadFromCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // --- Conversion ---------------------------------------------

  function debounceConvert() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(convert, 150);
  }

  function convert() {
    var amountRaw = amountInput.value.replace(/\s/g, '').replace(/,/g, '.');
    var amount = parseFloat(amountRaw);

    if (isNaN(amount) || amount < 0) {
      resultEl.textContent = '\u2014';
      rateDetailEl.textContent = '';
      resultSection.removeAttribute('hidden');
      return;
    }

    var from = fromSelect.value;
    var to = toSelect.value;

    if (from === to) {
      resultSection.removeAttribute('hidden');
      resultEl.textContent = formatResult(amount, to);
      rateDetailEl.textContent = '1 ' + from + ' = 1 ' + to;
      return;
    }

    var rate = getRate(from, to);
    if (rate === null) {
      if (!isManualMode) {
        resultEl.textContent = t('tool.currencyConverter.rateUnavailable');
        rateDetailEl.textContent = '';
      }
      resultSection.removeAttribute('hidden');
      return;
    }

    var result = amount * rate;
    resultSection.removeAttribute('hidden');
    resultEl.textContent = formatResult(result, to);
    rateDetailEl.textContent = '1 ' + from + ' = ' + rate.toFixed(6) + ' ' + to;
  }

  function getRate(from, to) {
    // Manual mode
    if (isManualMode) {
      var manualRaw = manualRateInput.value.replace(/\s/g, '').replace(/,/g, '.');
      var manualRate = parseFloat(manualRaw);
      if (isNaN(manualRate) || manualRate <= 0) return null;
      return manualRate;
    }

    if (!rates || !rates.rates) return null;

    var base = rates.base;

    // Direct: from is the base currency
    if (base === from && rates.rates[to] !== undefined) {
      return rates.rates[to];
    }

    // Inverse: to is the base currency
    if (base === to && rates.rates[from] !== undefined && rates.rates[from] !== 0) {
      return 1 / rates.rates[from];
    }

    // Cross-rate: both from and to are in rates relative to base
    // rate(FROM→TO) = rate(BASE→TO) / rate(BASE→FROM)
    var baseToFrom = (from === base) ? 1 : rates.rates[from];
    var baseToTo = (to === base) ? 1 : rates.rates[to];

    if (typeof baseToFrom !== 'number' || baseToFrom === 0 ||
        typeof baseToTo !== 'number') return null;

    return baseToTo / baseToFrom;
  }

  // --- Swap ---------------------------------------------------

  function swapCurrencies() {
    var fromVal = fromSelect.value;
    var toVal = toSelect.value;
    fromSelect.value = toVal;
    toSelect.value = fromVal;
    onCurrencyChange();
  }

  // --- Status Banner ------------------------------------------

  function showStatus(message) {
    if (!message) {
      statusBanner.setAttribute('hidden', '');
      return;
    }
    statusText.textContent = message;
    statusBanner.removeAttribute('hidden');
  }

  // --- Helpers ------------------------------------------------

  function getLocale() {
    if (window.YMT && window.YMT.i18n && window.YMT.i18n.getLocale) {
      var loc = window.YMT.i18n.getLocale();
      var map = { en: 'en-US', it: 'it-IT', es: 'es-ES', ru: 'ru-RU', zh: 'zh-CN' };
      return map[loc] || loc;
    }
    return 'en-US';
  }

  function formatResult(value, currencyCode) {
    var locale = getLocale();
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      }).format(value);
    } catch (e) {
      return value.toFixed(2) + ' ' + currencyCode;
    }
  }

  function formatTimestamp(ts) {
    var d = new Date(ts);
    var locale = getLocale();
    try {
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch (e) {
      var day = String(d.getDate()).padStart(2, '0');
      var month = String(d.getMonth() + 1).padStart(2, '0');
      var year = d.getFullYear();
      var hours = String(d.getHours()).padStart(2, '0');
      var minutes = String(d.getMinutes()).padStart(2, '0');
      return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes;
    }
  }

})();
