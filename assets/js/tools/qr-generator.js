/* ============================================================
   YourMiniTools — QR Generator v1.0.0
   QR Code generation for URL, text, tel, email, WiFi, vCard
   Uses qrcode.js (~4KB) for canvas rendering, debounce 300ms
   Depends on: qrcode.min.js, notifications.js, clipboard.js, download.js
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

  var DEBOUNCE_MS = 300;

  /* --- DOM refs ---------------------------------------------- */
  var typeSelect, sizeSelect, errorSelect, fgInput, bgInput;
  var outputEl, downloadSection, btnDownload;
  var debounceTimer;
  var qrInstance = null;

  // Input fields by type
  var fields = {};
  var inputs = {};

  /* --- Init -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    typeSelect  = document.getElementById('qr-type');
    sizeSelect  = document.getElementById('qr-size');
    errorSelect = document.getElementById('qr-error');
    fgInput     = document.getElementById('qr-fg');
    bgInput     = document.getElementById('qr-bg');
    outputEl    = document.getElementById('qr-output');
    downloadSection = document.getElementById('qr-download-section');
    btnDownload = document.getElementById('qr-download');

    // Field containers
    fields.url   = document.getElementById('qr-field-url');
    fields.text  = document.getElementById('qr-field-text');
    fields.tel   = document.getElementById('qr-field-tel');
    fields.email = document.getElementById('qr-field-email');
    fields.wifi  = document.getElementById('qr-field-wifi');
    fields.vcard = document.getElementById('qr-field-vcard');

    // Input elements
    inputs.url   = document.getElementById('qr-input-url');
    inputs.text  = document.getElementById('qr-input-text');
    inputs.tel   = document.getElementById('qr-input-tel');
    inputs.email = document.getElementById('qr-input-email');
    inputs.wifiSsid = document.getElementById('qr-wifi-ssid');
    inputs.wifiPass = document.getElementById('qr-wifi-pass');
    inputs.wifiEnc  = document.getElementById('qr-wifi-enc');
    inputs.vcardName  = document.getElementById('qr-vcard-name');
    inputs.vcardTel   = document.getElementById('qr-vcard-tel');
    inputs.vcardEmail = document.getElementById('qr-vcard-email');
    inputs.vcardOrg   = document.getElementById('qr-vcard-org');

    // Events
    typeSelect.addEventListener('change', function () {
      showFieldsForType(typeSelect.value);
      scheduleGenerate();
    });

    // Listen on all inputs for real-time generation
    var allInputs = [
      inputs.url, inputs.text, inputs.tel, inputs.email,
      inputs.wifiSsid, inputs.wifiPass, inputs.wifiEnc,
      inputs.vcardName, inputs.vcardTel, inputs.vcardEmail, inputs.vcardOrg,
      sizeSelect, errorSelect, fgInput, bgInput
    ];
    allInputs.forEach(function (el) {
      if (el) {
        el.addEventListener('input', scheduleGenerate);
        el.addEventListener('change', scheduleGenerate);
      }
    });

    btnDownload.addEventListener('click', downloadQR);

    showFieldsForType('url');
  });

  /* --- Show/hide fields -------------------------------------- */
  function showFieldsForType(type) {
    Object.keys(fields).forEach(function (key) {
      fields[key].hidden = (key !== type);
    });
  }

  /* --- Build QR content string ------------------------------- */
  function buildContent() {
    var type = typeSelect.value;

    switch (type) {
      case 'url':
        return inputs.url.value.trim();

      case 'text':
        return inputs.text.value;

      case 'tel':
        var tel = inputs.tel.value.trim();
        return tel ? 'tel:' + tel : '';

      case 'email':
        var email = inputs.email.value.trim();
        return email ? 'mailto:' + email : '';

      case 'wifi':
        var ssid = inputs.wifiSsid.value.trim();
        if (!ssid) return '';
        var pass = inputs.wifiPass.value;
        var enc = inputs.wifiEnc.value;
        // WiFi QR format: WIFI:T:<enc>;S:<ssid>;P:<password>;;
        return 'WIFI:T:' + enc + ';S:' + escapeWifi(ssid) + ';P:' + escapeWifi(pass) + ';;';

      case 'vcard':
        var name = inputs.vcardName.value.trim();
        if (!name) return '';
        var parts = name.split(' ');
        var lastName = parts.length > 1 ? parts.pop() : name;
        var firstName = parts.join(' ');
        var lines = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          'N:' + lastName + ';' + firstName + ';;;',
          'FN:' + name
        ];
        if (inputs.vcardTel.value.trim()) {
          lines.push('TEL:' + inputs.vcardTel.value.trim());
        }
        if (inputs.vcardEmail.value.trim()) {
          lines.push('EMAIL:' + inputs.vcardEmail.value.trim());
        }
        if (inputs.vcardOrg.value.trim()) {
          lines.push('ORG:' + inputs.vcardOrg.value.trim());
        }
        lines.push('END:VCARD');
        return lines.join('\n');

      default:
        return '';
    }
  }

  function escapeWifi(str) {
    // Escape special characters in WiFi QR string
    return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/:/g, '\\:').replace(/"/g, '\\"');
  }

  /* --- Generate QR ------------------------------------------- */
  function scheduleGenerate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(generateQR, DEBOUNCE_MS);
  }

  function generateQR() {
    var content = buildContent();

    // Clear previous
    while (outputEl.firstChild) {
      outputEl.removeChild(outputEl.firstChild);
    }

    if (!content) {
      downloadSection.hidden = true;
      var hint = document.createElement('p');
      hint.className = 'form-hint';
      hint.textContent = t('tool.qrGenerator.enterContent');
      outputEl.appendChild(hint);
      return;
    }

    if (typeof QRCode === 'undefined') {
      var errMsg = document.createElement('p');
      errMsg.className = 'form-hint';
      errMsg.textContent = t('tool.qrGenerator.libraryUnavailable');
      outputEl.appendChild(errMsg);
      return;
    }

    var size = parseInt(sizeSelect.value, 10);
    var errorLevel = errorSelect.value;
    var fg = fgInput.value.trim() || '#000000';
    var bg = bgInput.value.trim() || '#FFFFFF';

    var errorMap = { L: 1, M: 0, Q: 3, H: 2 };

    try {
      qrInstance = new QRCode(outputEl, {
        text: content,
        width: size,
        height: size,
        colorDark: fg,
        colorLight: bg,
        correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel[errorLevel] : errorMap[errorLevel]
      });
      downloadSection.hidden = false;
    } catch (e) {
      downloadSection.hidden = true;
      var errEl = document.createElement('p');
      errEl.className = 'form-hint';
      errEl.textContent = t('tool.qrGenerator.contentTooLong');
      outputEl.appendChild(errEl);
    }
  }

  /* --- Download ---------------------------------------------- */
  function downloadQR() {
    var canvas = outputEl.querySelector('canvas');
    if (canvas && window.YMT && window.YMT.downloadCanvas) {
      window.YMT.downloadCanvas(canvas, 'qr-code.png');
    } else {
      // Fallback: try img element
      var img = outputEl.querySelector('img');
      if (img && img.src) {
        var link = document.createElement('a');
        link.href = img.src;
        link.download = 'qr-code.png';
        link.click();
      }
    }
  }
})();
