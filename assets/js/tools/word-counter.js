/* ============================================================
   YourMiniTools — Word Counter v1.0.0
   Real-time word, character, sentence, paragraph counting
   + reading/speaking time estimation with 150ms debounce
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

  var READING_WPM  = 225;
  var SPEAKING_WPM = 150;
  var DEBOUNCE_MS  = 150;
  var MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

  /* --- DOM refs ---------------------------------------------- */
  var textarea, fileDrop, fileInput;
  var statWords, statChars, statCharsNoSpaces, statSentences, statParagraphs;
  var statReadTime, statSpeakTime;
  var btnCopy, btnDownloadTxt, btnDownloadMd, btnClear;
  var debounceTimer;

  /* --- Init -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    textarea         = document.getElementById('wc-textarea');
    fileDrop         = document.getElementById('wc-file-drop');
    fileInput        = document.getElementById('wc-file-input');
    statWords        = document.getElementById('wc-words');
    statChars        = document.getElementById('wc-chars');
    statCharsNoSpaces = document.getElementById('wc-chars-no-spaces');
    statSentences    = document.getElementById('wc-sentences');
    statParagraphs   = document.getElementById('wc-paragraphs');
    statReadTime     = document.getElementById('wc-read-time');
    statSpeakTime    = document.getElementById('wc-speak-time');
    btnCopy          = document.getElementById('wc-copy');
    btnDownloadTxt   = document.getElementById('wc-download-txt');
    btnDownloadMd    = document.getElementById('wc-download-md');
    btnClear         = document.getElementById('wc-clear');

    // Text input with debounce
    textarea.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateStats, DEBOUNCE_MS);
    });

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

    // Actions
    btnCopy.addEventListener('click', function () {
      if (textarea.value) window.YMT.copyToClipboard(textarea.value);
    });
    btnDownloadTxt.addEventListener('click', function () {
      if (textarea.value) window.YMT.downloadText(textarea.value, 'text.txt');
    });
    btnDownloadMd.addEventListener('click', function () {
      if (textarea.value) window.YMT.downloadText(textarea.value, 'text.md', 'text/markdown;charset=utf-8');
    });
    btnClear.addEventListener('click', function () {
      textarea.value = '';
      updateStats();
      textarea.focus();
    });

    updateStats();
  });

  /* --- File Load --------------------------------------------- */
  function loadFile(file) {
    var sizeCheck = window.YMT.validateFileSize(file, MAX_FILE_BYTES);
    if (!sizeCheck.valid) {
      window.YMT.showNotification(sizeCheck.message, 'error');
      return;
    }

    var validTypes = ['text/plain', 'text/markdown'];
    var validExts = ['.txt', '.md'];
    var ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (validTypes.indexOf(file.type) === -1 && validExts.indexOf(ext) === -1) {
      window.YMT.showNotification(t('tool.wordCounter.unsupportedFormat'), 'error');
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      textarea.value = e.target.result;
      updateStats();
      window.YMT.showNotification(t('tool.wordCounter.fileLoaded', { name: file.name }), 'success', 2500);
    };
    reader.onerror = function () {
      window.YMT.showNotification(t('tool.wordCounter.fileReadError'), 'error');
    };
    reader.readAsText(file, 'UTF-8');
  }

  /* --- Stats Calculation ------------------------------------- */
  function updateStats() {
    var text = textarea.value;
    var locale = currentLocale();

    // Characters
    var chars = text.length;
    var charsNoSpaces = text.replace(/\s/g, '').length;

    // Words (split by whitespace, filter empty)
    var words = text.trim() ? text.trim().split(/\s+/).length : 0;

    // Sentences (split by .!? followed by space or end)
    var sentences = 0;
    if (text.trim()) {
      var sentenceMatches = text.match(/[^.!?]*[.!?]+/g);
      sentences = sentenceMatches ? sentenceMatches.length : (words > 0 ? 1 : 0);
    }

    // Paragraphs (non-empty lines separated by blank lines)
    var paragraphs = 0;
    if (text.trim()) {
      var blocks = text.split(/\n\s*\n/);
      paragraphs = blocks.filter(function (b) { return b.trim().length > 0; }).length;
      if (paragraphs === 0 && text.trim()) paragraphs = 1;
    }

    // Time estimates
    var readMin = words / READING_WPM;
    var speakMin = words / SPEAKING_WPM;

    // Update DOM
    statWords.textContent = words.toLocaleString(locale);
    statChars.textContent = chars.toLocaleString(locale);
    statCharsNoSpaces.textContent = charsNoSpaces.toLocaleString(locale);
    statSentences.textContent = sentences.toLocaleString(locale);
    statParagraphs.textContent = paragraphs.toLocaleString(locale);
    statReadTime.textContent = formatTime(readMin);
    statSpeakTime.textContent = formatTime(speakMin);
  }

  function formatTime(minutes) {
    if (minutes < 1) {
      var secs = Math.round(minutes * 60);
      return secs <= 0 ? t('tool.wordCounter.time0min') : t('tool.wordCounter.timeLess1min');
    }
    if (minutes < 60) return t('tool.wordCounter.timeMin', { n: Math.round(minutes) });
    var h = Math.floor(minutes / 60);
    var m = Math.round(minutes % 60);
    return t('tool.wordCounter.timeHourMin', { h: h, m: m });
  }
})();
