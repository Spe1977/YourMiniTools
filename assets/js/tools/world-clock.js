/* ============================================================
   YourMiniTools — World Clock v1.0.0
   Live timezone comparison using Intl.DateTimeFormat
   Depends on: notifications.js, clipboard.js (YMT namespace)
   Data: assets/data/world-timezones.json
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

  function currentLocale() {
    if (window.YMT && window.YMT.i18n && window.YMT.i18n.getLocale) {
      return window.YMT.i18n.getLocale();
    }
    return 'en';
  }

  var REFRESH_MS = 1000;

  var selects = [];
  var formatCheckbox;
  var clocksContainer;
  var timezoneData = null;
  var intervalId = null;
  var renderedCards = [];

  /* --- Init -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    selects = [
      document.getElementById('wc-city-1'),
      document.getElementById('wc-city-2'),
      document.getElementById('wc-city-3'),
      document.getElementById('wc-city-4')
    ];
    formatCheckbox = document.getElementById('wc-format-12h');
    clocksContainer = document.getElementById('wc-clocks');

    loadTimezones();

    document.addEventListener('languagechange', function () {
      if (timezoneData) {
        var savedValues = selects.map(function (s) { return s.value; });
        populateSelects();
        selects.forEach(function (s, i) { if (savedValues[i]) s.value = savedValues[i]; });
        rebuildCards();
      }
    });
  });

  /* --- Load timezone data ------------------------------------ */
  function loadTimezones() {
    fetch('/assets/data/world-timezones.json?v=1.0.3')
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        timezoneData = data;
        populateSelects();
        bindEvents();
        rebuildCards();
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(tickClocks, REFRESH_MS);
      })
      .catch(function () {
        showError(t('tool.worldClock.errorLoadFailed'));
      });
  }

  function showError(msg) {
    if (window.YMT && window.YMT.showNotification) {
      window.YMT.showNotification(msg, 'error');
    }
  }

  /* --- Populate selects -------------------------------------- */
  function populateSelects() {
    if (!timezoneData || !timezoneData.continents) return;

    // Build continent → cities map (O(n) instead of O(n²) filter)
    var continentMap = [];
    timezoneData.continents.forEach(function (continent) {
      var cities = [];
      continent.cities.forEach(function (city) {
        cities.push({
          label: city.city + ' (' + city.country + ')',
          value: city.timezone
        });
      });
      continentMap.push({ name: continent.name, cities: cities });
    });

    // Default selections
    var defaults = ['Europe/Rome', 'America/New_York', '', ''];

    selects.forEach(function (select, idx) {
      var isOptional = idx >= 2;
      var fragment = document.createDocumentFragment();

      if (isOptional) {
        var emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = t('tool.worldClock.noneOption');
        fragment.appendChild(emptyOpt);
      }

      continentMap.forEach(function (continent) {
        var optgroup = document.createElement('optgroup');
        optgroup.label = continent.name;
        continent.cities.forEach(function (city) {
          var opt = document.createElement('option');
          opt.value = city.value;
          opt.textContent = city.label;
          optgroup.appendChild(opt);
        });
        fragment.appendChild(optgroup);
      });

      while (select.firstChild) {
        select.removeChild(select.firstChild);
      }
      select.appendChild(fragment);

      if (defaults[idx]) {
        select.value = defaults[idx];
      }
    });
  }

  /* --- Bind events ------------------------------------------- */
  function bindEvents() {
    selects.forEach(function (select) {
      select.addEventListener('change', rebuildCards);
    });
    formatCheckbox.addEventListener('change', tickClocks);
  }

  /* --- Rebuild clock cards (only when selection/language changes) - */
  function rebuildCards() {
    if (!timezoneData) return;

    renderedCards = [];

    // Clear previous container content
    while (clocksContainer.firstChild) {
      clocksContainer.removeChild(clocksContainer.firstChild);
    }

    // Collect selected timezones
    var selected = [];
    selects.forEach(function (select) {
      if (select.value) {
        selected.push({
          timezone: select.value,
          label: select.options[select.selectedIndex].textContent
        });
      }
    });

    if (selected.length < 2) {
      var msg = document.createElement('p');
      msg.className = 'form-hint';
      msg.textContent = t('tool.worldClock.selectAtLeast2');
      clocksContainer.appendChild(msg);
      return;
    }

    var fragment = document.createDocumentFragment();

    selected.forEach(function (item, idx) {
      var card = document.createElement('div');
      card.className = 'stat-item';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', t('tool.worldClock.copyTimeAria', { city: item.label }));

      var timeEl = document.createElement('div');
      timeEl.className = 'stat-value';

      var labelEl = document.createElement('div');
      labelEl.className = 'stat-label';
      labelEl.textContent = item.label;

      var dateEl = document.createElement('div');
      dateEl.className = 'form-hint';

      var diffEl = document.createElement('div');
      diffEl.className = 'form-hint';

      card.appendChild(timeEl);
      card.appendChild(labelEl);
      card.appendChild(dateEl);
      if (idx > 0) {
        card.appendChild(diffEl);
      }

      var cardEntry = {
        card: card,
        timeEl: timeEl,
        labelEl: labelEl,
        dateEl: dateEl,
        diffEl: diffEl,
        timezone: item.timezone,
        label: item.label,
        index: idx,
        latestCopyText: ''
      };

      card.addEventListener('click', function () {
        if (cardEntry.latestCopyText) {
          window.YMT.copyToClipboard(cardEntry.latestCopyText);
        }
      });
      card.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && cardEntry.latestCopyText) {
          e.preventDefault();
          window.YMT.copyToClipboard(cardEntry.latestCopyText);
        }
      });

      fragment.appendChild(card);
      renderedCards.push(cardEntry);
    });

    clocksContainer.appendChild(fragment);
    tickClocks();
  }

  /* --- Tick Clocks (fast in-place text update without DOM churn) - */
  function tickClocks() {
    if (!renderedCards.length) return;

    var use12h = formatCheckbox.checked;
    var now = new Date();
    var locale = currentLocale();

    var refOffset = getUtcOffset(now, renderedCards[0].timezone);

    renderedCards.forEach(function (entry) {
      var timeFormatter = new Intl.DateTimeFormat(locale, {
        timeZone: entry.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: use12h
      });

      var dateFormatter = new Intl.DateTimeFormat(locale, {
        timeZone: entry.timezone,
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      var timeStr = timeFormatter.format(now);
      var dateStr = dateFormatter.format(now);

      entry.timeEl.textContent = timeStr;
      entry.dateEl.textContent = dateStr;
      entry.latestCopyText = entry.label + ': ' + timeStr + ' (' + dateStr + ')';

      if (entry.index > 0) {
        var thisOffset = getUtcOffset(now, entry.timezone);
        var diff = thisOffset - refOffset;
        var diffHours = diff / 60;
        if (diffHours === 0) {
          entry.diffEl.textContent = t('tool.worldClock.sameTime');
        } else {
          var sign = diffHours > 0 ? '+' : '';
          entry.diffEl.textContent = sign + diffHours + 'h';
        }
      }
    });
  }

  /* --- UTC offset helper ------------------------------------- */
  function getUtcOffset(date, timezone) {
    // Get UTC offset in minutes for a given timezone
    var utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
    var tzStr = date.toLocaleString('en-US', { timeZone: timezone });
    var utcDate = new Date(utcStr);
    var tzDate = new Date(tzStr);
    return (tzDate - utcDate) / 60000;
  }
})();
