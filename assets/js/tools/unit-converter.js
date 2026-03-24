/* ============================================================
   YourMiniTools — Unit Converter v1.0.0
   Real-time conversion via base-unit intermediate coefficients
   Temperature uses dedicated formulas (non-linear)
   Depends on: notifications.js, clipboard.js (YMT namespace)
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

  /* --- Unit Definitions (factor = multiplier to base unit) ---- */
  var UNITS = {
    length: {
      base: 'm',
      units: [
        { id: 'mm',   labelKey: 'tool.unitConverter.mm',   factor: 0.001 },
        { id: 'cm',   labelKey: 'tool.unitConverter.cm',   factor: 0.01 },
        { id: 'm',    labelKey: 'tool.unitConverter.m',    factor: 1 },
        { id: 'km',   labelKey: 'tool.unitConverter.km',   factor: 1000 },
        { id: 'in',   labelKey: 'tool.unitConverter.in',   factor: 0.0254 },
        { id: 'ft',   labelKey: 'tool.unitConverter.ft',   factor: 0.3048 },
        { id: 'yd',   labelKey: 'tool.unitConverter.yd',   factor: 0.9144 },
        { id: 'mi',   labelKey: 'tool.unitConverter.mi',   factor: 1609.344 },
        { id: 'nmi',  labelKey: 'tool.unitConverter.nmi',  factor: 1852 }
      ]
    },
    weight: {
      base: 'kg',
      units: [
        { id: 'mg',  labelKey: 'tool.unitConverter.mg',  factor: 0.000001 },
        { id: 'g',   labelKey: 'tool.unitConverter.g',   factor: 0.001 },
        { id: 'kg',  labelKey: 'tool.unitConverter.kg',  factor: 1 },
        { id: 't',   labelKey: 'tool.unitConverter.t',   factor: 1000 },
        { id: 'oz',  labelKey: 'tool.unitConverter.oz',  factor: 0.0283495 },
        { id: 'lb',  labelKey: 'tool.unitConverter.lb',  factor: 0.453592 },
        { id: 'st',  labelKey: 'tool.unitConverter.st',  factor: 6.35029 }
      ]
    },
    temperature: {
      base: 'C',
      units: [
        { id: 'C', labelKey: 'tool.unitConverter.C' },
        { id: 'F', labelKey: 'tool.unitConverter.F' },
        { id: 'K', labelKey: 'tool.unitConverter.K' }
      ]
    },
    volume: {
      base: 'l',
      units: [
        { id: 'ml',     labelKey: 'tool.unitConverter.ml',     factor: 0.001 },
        { id: 'cl',     labelKey: 'tool.unitConverter.cl',     factor: 0.01 },
        { id: 'l',      labelKey: 'tool.unitConverter.l',      factor: 1 },
        { id: 'm3',     labelKey: 'tool.unitConverter.m3',     factor: 1000 },
        { id: 'gal_us', labelKey: 'tool.unitConverter.gal_us', factor: 3.78541 },
        { id: 'gal_uk', labelKey: 'tool.unitConverter.gal_uk', factor: 4.54609 },
        { id: 'fl_oz',  labelKey: 'tool.unitConverter.fl_oz',  factor: 0.0295735 },
        { id: 'cup',    labelKey: 'tool.unitConverter.cup',    factor: 0.236588 },
        { id: 'tbsp',   labelKey: 'tool.unitConverter.tbsp',   factor: 0.0147868 },
        { id: 'tsp',    labelKey: 'tool.unitConverter.tsp',    factor: 0.00492892 }
      ]
    },
    area: {
      base: 'm2',
      units: [
        { id: 'mm2',  labelKey: 'tool.unitConverter.mm2',  factor: 0.000001 },
        { id: 'cm2',  labelKey: 'tool.unitConverter.cm2',  factor: 0.0001 },
        { id: 'm2',   labelKey: 'tool.unitConverter.m2',   factor: 1 },
        { id: 'km2',  labelKey: 'tool.unitConverter.km2',  factor: 1000000 },
        { id: 'ha',   labelKey: 'tool.unitConverter.ha',   factor: 10000 },
        { id: 'ac',   labelKey: 'tool.unitConverter.ac',   factor: 4046.86 },
        { id: 'sqft', labelKey: 'tool.unitConverter.sqft', factor: 0.092903 },
        { id: 'sqmi', labelKey: 'tool.unitConverter.sqmi', factor: 2589988.11 }
      ]
    },
    speed: {
      base: 'ms',
      units: [
        { id: 'ms',   labelKey: 'tool.unitConverter.ms',   factor: 1 },
        { id: 'kmh',  labelKey: 'tool.unitConverter.kmh',  factor: 0.277778 },
        { id: 'mph',  labelKey: 'tool.unitConverter.mph',  factor: 0.44704 },
        { id: 'kn',   labelKey: 'tool.unitConverter.kn',   factor: 0.514444 },
        { id: 'fts',  labelKey: 'tool.unitConverter.fts',  factor: 0.3048 }
      ]
    },
    data: {
      base: 'B',
      units: [
        { id: 'b',   labelKey: 'tool.unitConverter.b',  factor: 0.125 },
        { id: 'B',   labelKey: 'tool.unitConverter.B', factor: 1 },
        { id: 'KB',  labelKey: 'tool.unitConverter.KB',   factor: 1024 },
        { id: 'MB',  labelKey: 'tool.unitConverter.MB',   factor: 1048576 },
        { id: 'GB',  labelKey: 'tool.unitConverter.GB',   factor: 1073741824 },
        { id: 'TB',  labelKey: 'tool.unitConverter.TB',   factor: 1099511627776 },
        { id: 'Kb',  labelKey: 'tool.unitConverter.Kb',   factor: 128 },
        { id: 'Mb',  labelKey: 'tool.unitConverter.Mb',   factor: 131072 },
        { id: 'Gb',  labelKey: 'tool.unitConverter.Gb',   factor: 134217728 }
      ]
    }
  };

  /* --- DOM refs ---------------------------------------------- */
  var categorySelect, fromSelect, toSelect, inputValue, outputEl;
  var swapBtn;

  /* --- Init -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    categorySelect = document.getElementById('uc-category');
    fromSelect     = document.getElementById('uc-from');
    toSelect       = document.getElementById('uc-to');
    inputValue     = document.getElementById('uc-input-value');
    outputEl       = document.getElementById('uc-output-value');
    swapBtn        = document.getElementById('uc-swap');

    categorySelect.addEventListener('change', onCategoryChange);
    fromSelect.addEventListener('change', convert);
    toSelect.addEventListener('change', convert);
    inputValue.addEventListener('input', convert);
    swapBtn.addEventListener('click', swapUnits);

    outputEl.addEventListener('click', copyResult);
    outputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyResult(); }
    });

    // Init — populate with whatever translations are available now
    onCategoryChange();

    // Re-populate selects when translations finish loading or language changes
    document.addEventListener('languagechange', function () {
      var fromVal = fromSelect.value;
      var toVal = toSelect.value;
      var cat = UNITS[categorySelect.value];
      repopulateSelect(fromSelect, cat.units, fromVal);
      repopulateSelect(toSelect, cat.units, toVal);
      convert();
    });
  });

  function repopulateSelect(selectEl, units, currentValue) {
    while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
    units.forEach(function (u) {
      var opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = t(u.labelKey);
      if (u.id === currentValue) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  /* --- Category Change --------------------------------------- */
  function onCategoryChange() {
    var cat = UNITS[categorySelect.value];
    populateSelect(fromSelect, cat.units, 0);
    populateSelect(toSelect, cat.units, cat.units.length > 1 ? 1 : 0);
    convert();
  }

  function populateSelect(selectEl, units, defaultIndex) {
    while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
    units.forEach(function (u, i) {
      var opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = t(u.labelKey);
      if (i === defaultIndex) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  /* --- Swap -------------------------------------------------- */
  function swapUnits() {
    var tmp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = tmp;
    convert();
  }

  /* --- Convert ----------------------------------------------- */
  function convert() {
    var raw = inputValue.value.replace(/,/g, '.').trim();
    if (!raw) {
      showEmpty(t('tool.unitConverter.enterValue'));
      return;
    }

    var num = parseFloat(raw);
    if (isNaN(num)) {
      showEmpty(t('tool.unitConverter.invalidValue'));
      return;
    }

    var cat = categorySelect.value;
    var fromId = fromSelect.value;
    var toId = toSelect.value;
    var result;

    if (cat === 'temperature') {
      result = convertTemperature(num, fromId, toId);
    } else {
      var catData = UNITS[cat];
      var fromFactor = getUnit(catData, fromId).factor;
      var toFactor = getUnit(catData, toId).factor;
      var baseValue = num * fromFactor;
      result = baseValue / toFactor;
    }

    var formatted = formatResult(result);
    outputEl.textContent = formatted;
    outputEl.className = 'tool-output tool-output-lg tool-output-copyable';
  }

  function showEmpty(msg) {
    // Clear and rebuild with safe DOM
    while (outputEl.firstChild) outputEl.removeChild(outputEl.firstChild);
    var span = document.createElement('span');
    span.className = 'tool-output-empty';
    span.textContent = msg;
    outputEl.appendChild(span);
  }

  function getUnit(catData, id) {
    for (var i = 0; i < catData.units.length; i++) {
      if (catData.units[i].id === id) return catData.units[i];
    }
    return catData.units[0];
  }

  /* --- Temperature ------------------------------------------- */
  function convertTemperature(value, from, to) {
    if (from === to) return value;

    // Convert to Celsius first
    var celsius;
    if (from === 'C') celsius = value;
    else if (from === 'F') celsius = (value - 32) * 5 / 9;
    else celsius = value - 273.15; // K

    // Convert from Celsius to target
    if (to === 'C') return celsius;
    if (to === 'F') return celsius * 9 / 5 + 32;
    return celsius + 273.15; // K
  }

  /* --- Format ------------------------------------------------ */
  function formatResult(num) {
    if (num === 0) return '0';
    var abs = Math.abs(num);
    if (abs > 0 && (abs < 1e-10 || abs >= 1e15)) {
      return num.toExponential(6);
    }
    var str = num.toFixed(10);
    str = str.replace(/\.?0+$/, '');
    return str;
  }

  /* --- Copy Result ------------------------------------------- */
  function copyResult() {
    var text = outputEl.textContent;
    if (text && !outputEl.querySelector('.tool-output-empty')) {
      window.YMT.copyToClipboard(text);
    }
  }
})();
