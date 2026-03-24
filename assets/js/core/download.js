/* ============================================================
   YourMiniTools — Download Module v1.0.0
   Download files via Blob + ObjectURL with auto-revoke
   Depends on: notifications.js (YMT.showNotification)
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

  /**
   * Trigger a file download from in-memory data.
   * @param {string|Blob|ArrayBuffer|Uint8Array} data — File content
   * @param {string} filename — Suggested filename (e.g. 'result.txt')
   * @param {string} [mimeType='application/octet-stream'] — MIME type (ignored if data is already a Blob)
   */
  function downloadFile(data, filename, mimeType) {
    mimeType = mimeType || 'application/octet-stream';

    var blob;
    if (data instanceof Blob) {
      blob = data;
    } else {
      blob = new Blob([data], { type: mimeType });
    }

    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.setAttribute('aria-hidden', 'true');
    link.className = 'sr-only';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke ObjectURL after a short delay to ensure download starts
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * Download text content as a file.
   * @param {string} text — Text content
   * @param {string} filename — e.g. 'output.txt'
   * @param {string} [mimeType='text/plain;charset=utf-8']
   */
  function downloadText(text, filename, mimeType) {
    mimeType = mimeType || 'text/plain;charset=utf-8';
    downloadFile(text, filename, mimeType);
  }

  /**
   * Download a canvas element as an image file.
   * @param {HTMLCanvasElement} canvas — Source canvas
   * @param {string} filename — e.g. 'image.png'
   * @param {string} [format='image/png'] — 'image/png', 'image/jpeg', 'image/webp'
   * @param {number} [quality=0.92] — Quality for lossy formats (0–1)
   */
  function downloadCanvas(canvas, filename, format, quality) {
    format = format || 'image/png';
    quality = quality !== undefined ? quality : 0.92;

    canvas.toBlob(function (blob) {
      if (!blob) {
        if (window.YMT && window.YMT.showNotification) {
          window.YMT.showNotification(t('common.downloadFailed'), 'error');
        }
        return;
      }
      downloadFile(blob, filename);
    }, format, quality);
  }

  // Expose globally
  window.YMT = window.YMT || {};
  window.YMT.downloadFile = downloadFile;
  window.YMT.downloadText = downloadText;
  window.YMT.downloadCanvas = downloadCanvas;
})();
