/* ============================================================
   YourMiniTools — Social Font Converter v1.0.0
   Unicode decorative text for social media
   Styles: Fraktur, Script, Double-struck, Small Caps,
           Circled, Filled Circle, Strikethrough, Underline
   Depends on: notifications.js, clipboard.js, download.js
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

  /* --- Unicode Mappings --------------------------------------- */

  // Helper: map each character through a function
  function mapChars(text, fn) {
    var result = '';
    var i = 0;
    while (i < text.length) {
      var code = text.codePointAt(i);
      var ch = String.fromCodePoint(code);
      result += fn(code, ch);
      i += ch.length; // handle surrogate pairs
    }
    return result;
  }

  // Fraktur Bold: A-Z → U+1D56C, a-z → U+1D586
  function toFraktur(text) {
    return mapChars(text, function (code, ch) {
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D56C + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D586 + code - 97);
      return ch;
    });
  }

  // Script Bold: A-Z → U+1D4D0, a-z → U+1D4EA
  function toScript(text) {
    return mapChars(text, function (code, ch) {
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D4D0 + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D4EA + code - 97);
      return ch;
    });
  }

  // Double-struck: A-Z → U+1D538 (with exceptions), a-z → U+1D552, 0-9 → U+1D7D8
  var DS_EXCEPTIONS = { 67: '\u2102', 72: '\u210D', 78: '\u2115', 80: '\u2119', 81: '\u211A', 82: '\u211D', 90: '\u2124' };
  function toDoubleStruck(text) {
    return mapChars(text, function (code, ch) {
      if (DS_EXCEPTIONS[code]) return DS_EXCEPTIONS[code];
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D538 + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D552 + code - 97);
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7D8 + code - 48);
      return ch;
    });
  }

  // Small Caps: a-z mapped to Unicode small capital letters
  var SMALL_CAPS = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ';
  var SMALL_CAPS_ARR = Array.from(SMALL_CAPS); // pre-computed once
  function toSmallCaps(text) {
    return mapChars(text, function (code, ch) {
      if (code >= 97 && code <= 122) return SMALL_CAPS_ARR[code - 97];
      // uppercase → keep as uppercase (already "large cap")
      return ch;
    });
  }

  // Circled: A-Z → U+24B6, a-z → U+24D0, 0 → U+24EA, 1-9 → U+2460
  function toCircled(text) {
    return mapChars(text, function (code, ch) {
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x24B6 + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x24D0 + code - 97);
      if (code === 48) return '\u24EA'; // ⓪
      if (code >= 49 && code <= 57) return String.fromCodePoint(0x2460 + code - 49);
      return ch;
    });
  }

  // Filled Circle (Negative Circled): A-Z → U+1F150 (uppercase only)
  function toFilledCircle(text) {
    return mapChars(text, function (code, ch) {
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1F150 + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1F150 + code - 97);
      if (code === 48) return '\u24FF'; // ⓿
      if (code >= 49 && code <= 57) return String.fromCodePoint(0x2776 + code - 49);
      return ch;
    });
  }

  // Strikethrough: each character + combining long stroke overlay U+0336
  function toStrikethrough(text) {
    return mapChars(text, function (code, ch) {
      if (code === 32 || code === 10 || code === 13) return ch;
      return ch + '\u0336';
    });
  }

  // Underline: each character + combining low line U+0332
  function toUnderline(text) {
    return mapChars(text, function (code, ch) {
      if (code === 32 || code === 10 || code === 13) return ch;
      return ch + '\u0332';
    });
  }

  /* --- Variant Definitions ------------------------------------ */
  var VARIANTS = [
    { id: 'fraktur',      labelKey: 'tool.socialFontConverter.variantFraktur',      fn: toFraktur },
    { id: 'script',       labelKey: 'tool.socialFontConverter.variantScript',       fn: toScript },
    { id: 'doublestruck', labelKey: 'tool.socialFontConverter.variantDoubleStruck', fn: toDoubleStruck },
    { id: 'smallcaps',    labelKey: 'tool.socialFontConverter.variantSmallCaps',    fn: toSmallCaps },
    { id: 'circled',      labelKey: 'tool.socialFontConverter.variantCircled',      fn: toCircled },
    { id: 'filled',       labelKey: 'tool.socialFontConverter.variantFilled',       fn: toFilledCircle },
    { id: 'strike',       labelKey: 'tool.socialFontConverter.variantStrike',       fn: toStrikethrough },
    { id: 'underline',    labelKey: 'tool.socialFontConverter.variantUnderline',    fn: toUnderline }
  ];

  /* --- DOM refs ---------------------------------------------- */
  var textarea, btnClear;
  var variantsContainer, variantsEl;
  var btnDownloadTxt, btnDownloadMd;

  /* --- Init -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    textarea          = document.getElementById('sf-textarea');
    btnClear          = document.getElementById('sf-clear');
    variantsContainer = document.getElementById('sf-variants-container');
    variantsEl        = document.getElementById('sf-variants');
    btnDownloadTxt    = document.getElementById('sf-download-txt');
    btnDownloadMd     = document.getElementById('sf-download-md');

    textarea.addEventListener('input', updateVariants);

    btnClear.addEventListener('click', function () {
      textarea.value = '';
      updateVariants();
      textarea.focus();
    });

    btnDownloadTxt.addEventListener('click', function () { downloadAll('txt'); });
    btnDownloadMd.addEventListener('click', function () { downloadAll('md'); });
  });

  /* --- Update Variants --------------------------------------- */
  function updateVariants() {
    var text = textarea.value.trim();

    while (variantsEl.firstChild) variantsEl.removeChild(variantsEl.firstChild);

    if (!text) {
      variantsContainer.hidden = true;
      return;
    }

    variantsContainer.hidden = false;

    VARIANTS.forEach(function (v) {
      var label = t(v.labelKey);
      var result = v.fn(text);
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
    copyBtn.setAttribute('aria-label', t('tool.socialFontConverter.copyVariant', { label: label }));
    copyBtn.textContent = t('common.copy');
    copyBtn.addEventListener('click', function () {
      window.YMT.copyToClipboard(text);
    });
    card.appendChild(copyBtn);

    return card;
  }

  /* --- Download All ------------------------------------------ */
  function downloadAll(format) {
    var text = textarea.value.trim();
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
    var filename = 'font-social.' + format;
    var mime = format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
    window.YMT.downloadText(content, filename, mime);
  }
})();
