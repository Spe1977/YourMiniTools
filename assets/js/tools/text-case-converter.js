/* ============================================================
   YourMiniTools — Text Case Converter v1.0.0
   UPPER, lower, Title Case, Sentence Case, aLtErNaTe, Capitalize
   Locale-aware Title Case stop words (EN/IT/ES)
   Depends on: notifications.js, clipboard.js, download.js, validation.js
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

  var MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

  // English stop words for Title Case (default)
  var EN_LOWERCASE = [
    'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor',
    'on', 'at', 'to', 'by', 'in', 'of', 'up', 'is', 'it', 'as'
  ];

  // Italian articles/prepositions for Title Case
  var IT_LOWERCASE = [
    'di', 'da', 'del', 'dello', 'della', 'dei', 'degli', 'delle',
    'a', 'al', 'allo', 'alla', 'ai', 'agli', 'alle',
    'in', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',
    'con', 'col', 'per', 'tra', 'fra', 'su', 'sul', 'sullo',
    'sulla', 'sui', 'sugli', 'sulle', 'il', 'lo', 'la', 'i',
    'gli', 'le', 'un', 'uno', 'una', 'e', 'ed', 'o', 'od',
    'ma', 'che', 'se', 'come', 'non'
  ];

  // Spanish stop words for Title Case
  var ES_LOWERCASE = [
    'a', 'al', 'de', 'del', 'el', 'la', 'los', 'las', 'un', 'una',
    'unos', 'unas', 'en', 'con', 'por', 'para', 'y', 'e', 'o', 'u',
    'pero', 'que', 'se', 'su', 'sus'
  ];

  function getStopWords() {
    var locale = currentLocale();
    if (locale === 'it') return IT_LOWERCASE;
    if (locale === 'es') return ES_LOWERCASE;
    return EN_LOWERCASE;
  }

  var VARIANTS = [
    { id: 'upper',      labelKey: 'tool.textCaseConverter.variantUpper',      fn: toUpper },
    { id: 'lower',      labelKey: 'tool.textCaseConverter.variantLower',      fn: toLower },
    { id: 'title',      labelKey: 'tool.textCaseConverter.variantTitle',      fn: toTitleCase },
    { id: 'sentence',   labelKey: 'tool.textCaseConverter.variantSentence',   fn: toSentenceCase },
    { id: 'alternate',  labelKey: 'tool.textCaseConverter.variantAlternate',  fn: toAlternate },
    { id: 'capitalize', labelKey: 'tool.textCaseConverter.variantCapitalize', fn: toCapitalize }
  ];

  /* --- DOM refs ---------------------------------------------- */
  var textarea, fileDrop, fileInput, btnClear;
  var variantsContainer, variantsEl;
  var btnDownloadTxt, btnDownloadMd;

  /* --- Init -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    textarea          = document.getElementById('tc-textarea');
    fileDrop          = document.getElementById('tc-file-drop');
    fileInput         = document.getElementById('tc-file-input');
    btnClear          = document.getElementById('tc-clear');
    variantsContainer = document.getElementById('tc-variants-container');
    variantsEl        = document.getElementById('tc-variants');
    btnDownloadTxt    = document.getElementById('tc-download-txt');
    btnDownloadMd     = document.getElementById('tc-download-md');

    // Input event
    textarea.addEventListener('input', updateVariants);

    // File drop
    fileDrop.addEventListener('click', function () { fileInput.click(); });
    fileDrop.addEventListener('dragover', function (e) {
      e.preventDefault();
      fileDrop.setAttribute('data-dragover', 'true');
    });
    fileDrop.addEventListener('dragleave', function () {
      fileDrop.setAttribute('data-dragover', 'false');
    });
    fileDrop.addEventListener('drop', function (e) {
      e.preventDefault();
      fileDrop.setAttribute('data-dragover', 'false');
      if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) loadFile(fileInput.files[0]);
    });

    // Clear
    btnClear.addEventListener('click', function () {
      textarea.value = '';
      updateVariants();
      textarea.focus();
    });

    // Downloads
    btnDownloadTxt.addEventListener('click', function () { downloadAll('txt'); });
    btnDownloadMd.addEventListener('click', function () { downloadAll('md'); });
  });

  /* --- File Load --------------------------------------------- */
  function loadFile(file) {
    var sizeCheck = window.YMT.validateFileSize(file, MAX_FILE_BYTES);
    if (!sizeCheck.valid) {
      window.YMT.showNotification(sizeCheck.message, 'error');
      return;
    }

    var validExts = ['.txt', '.md'];
    var ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (validExts.indexOf(ext) === -1 && file.type !== 'text/plain' && file.type !== 'text/markdown') {
      window.YMT.showNotification(t('tool.textCaseConverter.unsupportedFormat'), 'error');
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      textarea.value = e.target.result;
      updateVariants();
      window.YMT.showNotification(t('tool.textCaseConverter.fileLoaded', { name: file.name }), 'success', 2500);
    };
    reader.onerror = function () {
      window.YMT.showNotification(t('tool.textCaseConverter.fileReadError'), 'error');
    };
    reader.readAsText(file, 'UTF-8');
  }

  /* --- Update Variants --------------------------------------- */
  function updateVariants() {
    var raw = textarea.value;
    // Trim multiple spaces + leading/trailing
    var text = raw.replace(/  +/g, ' ').trim();

    // Clear previous variants
    while (variantsEl.firstChild) variantsEl.removeChild(variantsEl.firstChild);

    if (!text) {
      variantsContainer.hidden = true;
      return;
    }

    variantsContainer.hidden = false;

    VARIANTS.forEach(function (v) {
      var result = v.fn(text);
      var label = t(v.labelKey);
      var card = buildVariantCard(label, result);
      variantsEl.appendChild(card);
    });
  }

  function buildVariantCard(label, text) {
    var card = document.createElement('div');
    card.className = 'variant-card';

    var content = document.createElement('div');

    var labelEl = document.createElement('div');
    labelEl.className = 'variant-label';
    labelEl.textContent = label;
    content.appendChild(labelEl);

    var textEl = document.createElement('div');
    textEl.className = 'variant-text';
    textEl.textContent = text;
    content.appendChild(textEl);

    card.appendChild(content);

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn btn-secondary btn-icon variant-copy';
    copyBtn.setAttribute('aria-label', t('tool.textCaseConverter.copyVariant', { label: label }));
    copyBtn.textContent = t('common.copy');
    copyBtn.addEventListener('click', function () {
      window.YMT.copyToClipboard(text);
    });
    card.appendChild(copyBtn);

    return card;
  }

  /* --- Transformations --------------------------------------- */
  function toUpper(text) {
    return text.toUpperCase();
  }

  function toLower(text) {
    return text.toLowerCase();
  }

  function toTitleCase(text) {
    var stopWords = getStopWords();
    var words = text.toLowerCase().split(/\s+/);
    return words.map(function (word, i) {
      // First word always capitalized
      if (i === 0) return capitalizeWord(word);
      // Stop words stay lowercase
      if (stopWords.indexOf(word) !== -1) return word;
      return capitalizeWord(word);
    }).join(' ');
  }

  function toSentenceCase(text) {
    return text.toLowerCase().replace(/(^\s*|[.!?]\s+)(\w)/g, function (match, sep, char) {
      return sep + char.toUpperCase();
    });
  }

  function toAlternate(text) {
    var result = '';
    var charIndex = 0;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (/[a-zA-Z\u00C0-\u024F]/.test(c)) {
        result += charIndex % 2 === 0 ? c.toLowerCase() : c.toUpperCase();
        charIndex++;
      } else {
        result += c;
      }
    }
    return result;
  }

  function toCapitalize(text) {
    return text.toLowerCase().replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  function capitalizeWord(word) {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  /* --- Download All ------------------------------------------ */
  function downloadAll(format) {
    var text = textarea.value.replace(/  +/g, ' ').trim();
    if (!text) return;

    var lines = [];
    if (format === 'md') {
      VARIANTS.forEach(function (v) {
        lines.push('## ' + t(v.labelKey));
        lines.push(v.fn(text));
        lines.push('');
      });
    } else {
      VARIANTS.forEach(function (v) {
        lines.push('--- ' + t(v.labelKey) + ' ---');
        lines.push(v.fn(text));
        lines.push('');
      });
    }

    var content = lines.join('\n');
    var filename = 'text-converted.' + format;
    var mime = format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
    window.YMT.downloadText(content, filename, mime);
  }
})();
