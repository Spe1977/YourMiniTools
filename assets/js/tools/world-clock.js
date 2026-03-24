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
  var MAX_CITIES = 4;

  var selects = [];
  var formatCheckbox;
  var clocksContainer;
  var timezoneData = null;
  var intervalId = null;

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
        updateClocks();
      }
    });
  });

  /* --- Load timezone data ------------------------------------ */
  function loadTimezones() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/assets/data/world-timezones.json', true);
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          timezoneData = JSON.parse(xhr.responseText);
          populateSelects();
          bindEvents();
          updateClocks();
          intervalId = setInterval(updateClocks, REFRESH_MS);
        } catch (e) {
          showError(t('tool.worldClock.errorLoad'));
        }
      } else {
        showError(t('tool.worldClock.errorLoadFailed'));
      }
    };
    xhr.onerror = function () {
      showError(t('tool.worldClock.errorNetwork'));
    };
    xhr.send();
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
      select.addEventListener('change', updateClocks);
    });
    formatCheckbox.addEventListener('change', updateClocks);
  }

  /* --- Update clocks ----------------------------------------- */
  function updateClocks() {
    if (!timezoneData) return;

    var use12h = formatCheckbox.checked;
    var now = new Date();
    var locale = currentLocale();

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

    // Build clock cards
    // Clear previous
    while (clocksContainer.firstChild) {
      clocksContainer.removeChild(clocksContainer.firstChild);
    }

    if (selected.length < 2) {
      var msg = document.createElement('p');
      msg.className = 'form-hint';
      msg.textContent = t('tool.worldClock.selectAtLeast2');
      clocksContainer.appendChild(msg);
      return;
    }

    // Reference timezone (first selected) for offset calculation
    var refOffset = getUtcOffset(now, selected[0].timezone);

    selected.forEach(function (item, idx) {
      var card = document.createElement('div');
      card.className = 'stat-item';

      // Time
      var timeFormatter = new Intl.DateTimeFormat(locale, {
        timeZone: item.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: use12h
      });

      var dateFormatter = new Intl.DateTimeFormat(locale, {
        timeZone: item.timezone,
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      var timeStr = timeFormatter.format(now);
      var dateStr = dateFormatter.format(now);

      // Offset difference from first city
      var thisOffset = getUtcOffset(now, item.timezone);
      var diff = thisOffset - refOffset;
      var diffStr = '';
      if (idx > 0) {
        var diffHours = diff / 60;
        if (diffHours === 0) {
          diffStr = t('tool.worldClock.sameTime');
        } else {
          var sign = diffHours > 0 ? '+' : '';
          diffStr = sign + diffHours + 'h';
        }
      }

      var timeEl = document.createElement('div');
      timeEl.className = 'stat-value';
      timeEl.textContent = timeStr;

      var labelEl = document.createElement('div');
      labelEl.className = 'stat-label';
      labelEl.textContent = item.label;

      var dateEl = document.createElement('div');
      dateEl.className = 'form-hint';
      dateEl.textContent = dateStr;

      card.appendChild(timeEl);
      card.appendChild(labelEl);
      card.appendChild(dateEl);

      if (diffStr) {
        var diffEl = document.createElement('div');
        diffEl.className = 'form-hint';
        diffEl.textContent = diffStr;
        card.appendChild(diffEl);
      }

      // Click to copy time
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', t('tool.worldClock.copyTimeAria', { city: item.label }));
      card.addEventListener('click', function () {
        window.YMT.copyToClipboard(item.label + ': ' + timeStr + ' (' + dateStr + ')');
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.YMT.copyToClipboard(item.label + ': ' + timeStr + ' (' + dateStr + ')');
        }
      });

      clocksContainer.appendChild(card);
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
