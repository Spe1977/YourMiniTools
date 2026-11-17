/* ============================================================
   YourMiniTools — Color Tool v1.0.0
   Manual color picker (HEX/RGB/HSL) + image pixel sampling
   Canvas getImageData for pixel picking, session palette (10 colors)
   Depends on: notifications.js, clipboard.js, validation.js
   Constraints: CSP compliant, no inline styles, no eval, no innerHTML
   ============================================================ */

(function () {
  'use strict';

  function t(key, params) {
    if (window.YMT && window.YMT.i18n && window.YMT.i18n.t) {
      return window.YMT.i18n.t(key, params);
    }
    return key;
  }

  var MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB
  var MAX_MEGAPIXELS = 25;
  var PALETTE_MAX = 10;

  var palette = [];

  /* ===== Tab Management ====================================== */
  document.addEventListener('DOMContentLoaded', function () {
    if (window.YMT && window.YMT.initTabs) {
      window.YMT.initTabs(document.querySelector('.tool-tabs[role="tablist"]'));
    }

    initManual();
    initImagePicker();

    document.addEventListener('languagechange', function () {
      if (palette.length > 0) {
        renderPalette();
      }
      if (hexInput && hexInput.getAttribute('data-invalid') === 'true' && window.YMT && window.YMT.showFieldError) {
        window.YMT.showFieldError(hexInput, t('tool.qrGenerator.invalidColor'));
      }
      [rInput, gInput, bInput, hInput, sInput, lInput].forEach(function (el) {
        if (el && el.getAttribute('data-invalid') === 'true' && window.YMT && window.YMT.showFieldError) {
          window.YMT.showFieldError(el, t('validation.invalidNumber'));
        }
      });
    });
  });

  /* ===== Manual Color Picker ================================= */
  var preview, hexInput, rInput, gInput, bInput, hInput, sInput, lInput;
  var btnCopyHex, btnCopyRgb, btnCopyHsl;
  var updatingFrom = null; // prevents circular updates

  function initManual() {
    preview   = document.getElementById('ct-preview');
    hexInput  = document.getElementById('ct-hex');
    rInput    = document.getElementById('ct-r');
    gInput    = document.getElementById('ct-g');
    bInput    = document.getElementById('ct-b');
    hInput    = document.getElementById('ct-h');
    sInput    = document.getElementById('ct-s');
    lInput    = document.getElementById('ct-l');
    btnCopyHex = document.getElementById('ct-copy-hex');
    btnCopyRgb = document.getElementById('ct-copy-rgb');
    btnCopyHsl = document.getElementById('ct-copy-hsl');

    function applyHex(normalized) {
      updatingFrom = 'hex';
      var rgb = hexToRgb(normalized);
      setRgbInputs(rgb.r, rgb.g, rgb.b);
      var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHslInputs(hsl.h, hsl.s, hsl.l);
      updatePreview(normalized);
      clearGroupErrors([hexInput, rInput, gInput, bInput, hInput, sInput, lInput]);
      updatingFrom = null;
    }

    hexInput.addEventListener('input', function () {
      if (updatingFrom) return;
      var raw = hexInput.value.trim();
      var full = normalizeHex(raw, false);
      if (full) {
        applyHex(full);
      } else if (window.YMT && window.YMT.clearFieldError && /^#?[0-9A-Fa-f]{0,6}$/.test(raw)) {
        window.YMT.clearFieldError(hexInput);
      } else if (window.YMT && window.YMT.showFieldError) {
        window.YMT.showFieldError(hexInput, t('tool.qrGenerator.invalidColor'));
      }
    });

    ['change', 'blur'].forEach(function (evtName) {
      hexInput.addEventListener(evtName, function () {
        if (updatingFrom) return;
        var expanded = normalizeHex(hexInput.value, true);
        if (expanded) {
          hexInput.value = expanded;
          applyHex(expanded);
        } else if (window.YMT && window.YMT.showFieldError) {
          window.YMT.showFieldError(hexInput, t('tool.qrGenerator.invalidColor'));
        }
      });
    });

    var rgbFields = [
      { el: rInput, max: 255 },
      { el: gInput, max: 255 },
      { el: bInput, max: 255 }
    ];
    var hslFields = [
      { el: hInput, max: 360 },
      { el: sInput, max: 100 },
      { el: lInput, max: 100 }
    ];

    bindDiscreteGroup(rgbFields, syncFromRgb);
    bindDiscreteGroup(hslFields, syncFromHsl);

    function syncFromRgb() {
      if (updatingFrom) return;
      if (!validateDiscreteFields(rgbFields)) return;
      updatingFrom = 'rgb';
      var r = parseDiscrete(rInput, 255);
      var g = parseDiscrete(gInput, 255);
      var b = parseDiscrete(bInput, 255);
      var hex = rgbToHex(r, g, b);
      hexInput.value = hex;
      var hsl = rgbToHsl(r, g, b);
      setHslInputs(hsl.h, hsl.s, hsl.l);
      updatePreview(hex);
      clearGroupErrors([hexInput, hInput, sInput, lInput]);
      updatingFrom = null;
    }

    function syncFromHsl() {
      if (updatingFrom) return;
      if (!validateDiscreteFields(hslFields)) return;
      updatingFrom = 'hsl';
      var h = parseDiscrete(hInput, 360);
      var s = parseDiscrete(sInput, 100);
      var l = parseDiscrete(lInput, 100);
      var rgb = hslToRgb(h, s, l);
      setRgbInputs(rgb.r, rgb.g, rgb.b);
      var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      hexInput.value = hex;
      updatePreview(hex);
      clearGroupErrors([hexInput, rInput, gInput, bInput]);
      updatingFrom = null;
    }

    btnCopyHex.addEventListener('click', function () {
      var validHex = normalizeHex(hexInput.value, true);
      window.YMT.copyToClipboard(validHex || hexInput.value);
    });
    btnCopyRgb.addEventListener('click', function () {
      if (!validateDiscreteFields(rgbFields)) return;
      window.YMT.copyToClipboard(
        'rgb(' + parseDiscrete(rInput, 255) + ', ' + parseDiscrete(gInput, 255) + ', ' + parseDiscrete(bInput, 255) + ')'
      );
    });
    btnCopyHsl.addEventListener('click', function () {
      if (!validateDiscreteFields(hslFields)) return;
      window.YMT.copyToClipboard(
        'hsl(' + parseDiscrete(hInput, 360) + ', ' + parseDiscrete(sInput, 100) + '%, ' + parseDiscrete(lInput, 100) + '%)'
      );
    });

    // Initial preview
    updatePreview(hexInput.value);
  }

  function normalizeHex(raw, allowShorthand) {
    var s = (raw || '').trim();
    if (!s) return null;
    if (s.charAt(0) !== '#') s = '#' + s;
    if (allowShorthand && /^#[0-9A-Fa-f]{3}$/.test(s)) {
      return ('#' + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)).toUpperCase();
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(s)) {
      return s.toUpperCase();
    }
    return null;
  }

  function clearGroupErrors(inputs) {
    if (!window.YMT || !window.YMT.clearFieldError) return;
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i]) window.YMT.clearFieldError(inputs[i]);
    }
  }

  function validateSingleDiscrete(input, max) {
    if (input.validity && input.validity.badInput) {
      if (window.YMT && window.YMT.showFieldError) {
        window.YMT.showFieldError(input, t('validation.invalidNumber'));
      }
      return false;
    }
    if (window.YMT && window.YMT.parseDiscreteNumber) {
      var parsed = window.YMT.parseDiscreteNumber(input.value, 0, max);
      if (!parsed.valid) {
        if (window.YMT.showFieldError) {
          window.YMT.showFieldError(input, t('validation.invalidNumber'));
        }
        return false;
      }
      if (window.YMT.clearFieldError) {
        window.YMT.clearFieldError(input);
      }
    }
    return true;
  }

  function validateDiscreteFields(fields) {
    var allValid = true;
    for (var i = 0; i < fields.length; i++) {
      if (!validateSingleDiscrete(fields[i].el, fields[i].max)) {
        allValid = false;
      }
    }
    return allValid;
  }

  function parseDiscrete(input, max) {
    if (window.YMT && window.YMT.parseDiscreteNumber) {
      return window.YMT.parseDiscreteNumber(input.value, 0, max).value;
    }
    return clamp(parseInt(input.value, 10) || 0, 0, max);
  }

  function bindDiscreteGroup(fields, syncFn) {
    fields.forEach(function (field) {
      field.el.addEventListener('input', syncFn);
      ['change', 'blur'].forEach(function (evtName) {
        field.el.addEventListener(evtName, function () {
          if (!validateSingleDiscrete(field.el, field.max)) return;
          if (window.YMT && window.YMT.normalizeDiscreteInput) {
            if (window.YMT.normalizeDiscreteInput(field.el, 0, field.max)) {
              syncFn();
            }
          }
        });
      });
    });
  }

  function setRgbInputs(r, g, b) {
    rInput.value = r;
    gInput.value = g;
    bInput.value = b;
  }

  function setHslInputs(h, s, l) {
    hInput.value = h;
    sInput.value = s;
    lInput.value = l;
  }

  function updatePreview(hex) {
    preview.setAttribute('data-color', hex);
    preview.style.setProperty('background-color', hex);
  }

  /* ===== Image Pixel Picker ================================== */
  var fileDrop, fileInput, canvasWrapper, canvas, ctx;
  var pickedSection, pickedPreview, pickedHex, pickedRgb, pickedHsl;
  var pickCopyHex, pickCopyRgb, pickCopyHsl;
  var imgWidth = 0, imgHeight = 0;

  function initImagePicker() {
    fileDrop     = document.getElementById('ct-file-drop');
    fileInput    = document.getElementById('ct-file-input');
    canvasWrapper = document.getElementById('ct-canvas-wrapper');
    canvas       = document.getElementById('ct-canvas');
    ctx          = canvas.getContext('2d', { willReadFrequently: true });
    pickedSection = document.getElementById('ct-picked-section');
    pickedPreview = document.getElementById('ct-picked-preview');
    pickedHex    = document.getElementById('ct-picked-hex');
    pickedRgb    = document.getElementById('ct-picked-rgb');
    pickedHsl    = document.getElementById('ct-picked-hsl');
    pickCopyHex  = document.getElementById('ct-pick-copy-hex');
    pickCopyRgb  = document.getElementById('ct-pick-copy-rgb');
    pickCopyHsl  = document.getElementById('ct-pick-copy-hsl');

    // File drop (label natively triggers fileInput on click; keep drag-and-drop)
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
      if (e.dataTransfer.files.length > 0) loadImage(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) loadImage(fileInput.files[0]);
      fileInput.value = '';
    });

    // Canvas click/touch for pixel picking
    canvas.addEventListener('click', pickPixel);
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      pickPixelFromTouch(e);
    }, { passive: false });

    // Copy buttons
    pickCopyHex.addEventListener('click', function () {
      window.YMT.copyToClipboard(pickedHex.textContent);
    });
    pickCopyRgb.addEventListener('click', function () {
      window.YMT.copyToClipboard(pickedRgb.textContent);
    });
    pickCopyHsl.addEventListener('click', function () {
      window.YMT.copyToClipboard(pickedHsl.textContent);
    });
  }

  function loadImage(file) {
    var sizeCheck = window.YMT.validateFileSize(file, MAX_FILE_BYTES);
    if (!sizeCheck.valid) {
      window.YMT.showNotification(sizeCheck.message, 'error');
      return;
    }

    var validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (validTypes.indexOf(file.type) === -1) {
      window.YMT.showNotification(t('tool.colorTool.unsupportedFormat'), 'error');
      return;
    }

    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var megapixels = (img.width * img.height) / 1e6;
      if (megapixels > MAX_MEGAPIXELS) {
        window.YMT.showNotification(t('tool.colorTool.imageTooLarge', { mp: megapixels.toFixed(1), max: MAX_MEGAPIXELS }), 'error');
        URL.revokeObjectURL(url);
        return;
      }

      // Deallocate previous canvas data before loading new image
      canvas.width = 0;
      canvas.height = 0;

      imgWidth = img.width;
      imgHeight = img.height;

      // Scale canvas to fit container while maintaining aspect ratio
      var maxW = canvasWrapper.parentElement.clientWidth - 48; // padding
      var scale = (imgWidth > 0) ? Math.min(1, maxW / imgWidth) : 1;
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      canvas.setAttribute('data-scale', scale);

      ctx.drawImage(img, 0, 0);
      canvasWrapper.hidden = false;
      pickedSection.hidden = false;

      URL.revokeObjectURL(url);
      window.YMT.showNotification(t('tool.colorTool.imageLoaded'), 'success', 3000);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      window.YMT.showNotification(t('tool.colorTool.imageLoadError'), 'error');
    };
    img.src = url;
  }

  function pickPixel(e) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !canvas.width || !canvas.height) return;
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = Math.floor((e.clientX - rect.left) * scaleX);
    var y = Math.floor((e.clientY - rect.top) * scaleY);
    sampleAt(x, y);
  }

  function pickPixelFromTouch(e) {
    if (e.touches.length === 0) return;
    var touch = e.touches[0];
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !canvas.width || !canvas.height) return;
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = Math.floor((touch.clientX - rect.left) * scaleX);
    var y = Math.floor((touch.clientY - rect.top) * scaleY);
    sampleAt(x, y);
  }

  function sampleAt(x, y) {
    x = clamp(x, 0, canvas.width - 1);
    y = clamp(y, 0, canvas.height - 1);

    var pixel = ctx.getImageData(x, y, 1, 1).data;
    var r = pixel[0], g = pixel[1], b = pixel[2];
    var hex = rgbToHex(r, g, b);
    var hsl = rgbToHsl(r, g, b);

    pickedPreview.style.setProperty('background-color', hex);
    pickedHex.textContent = hex;
    pickedRgb.textContent = 'rgb(' + r + ', ' + g + ', ' + b + ')';
    pickedHsl.textContent = 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';

    addToPalette(hex);
  }

  /* ===== Palette ============================================= */
  function addToPalette(hex) {
    // Remove duplicate if exists
    var idx = palette.indexOf(hex);
    if (idx !== -1) palette.splice(idx, 1);

    palette.unshift(hex);
    if (palette.length > PALETTE_MAX) palette.pop();

    renderPalette();
  }

  function renderPalette() {
    var section = document.getElementById('ct-palette-section');
    var container = document.getElementById('ct-palette');

    section.hidden = palette.length === 0;
    while (container.firstChild) container.removeChild(container.firstChild);

    palette.forEach(function (hex) {
      var swatch = document.createElement('button');
      swatch.className = 'color-swatch';
      swatch.setAttribute('type', 'button');
      swatch.setAttribute('aria-label', t('tool.colorTool.copySwatch', { hex: hex }));
      swatch.setAttribute('title', hex);
      swatch.style.setProperty('background-color', hex);
      swatch.addEventListener('click', function () {
        window.YMT.copyToClipboard(hex);
      });
      container.appendChild(swatch);
    });
  }

  /* ===== Color Conversion ==================================== */
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function hexToRgb(hex) {
    var bigint = parseInt(hex.slice(1), 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;

    if (s === 0) {
      var val = Math.round(l * 255);
      return { r: val, g: val, b: val };
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;

    return {
      r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hueToRgb(p, q, h) * 255),
      b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255)
    };
  }

  function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
})();
