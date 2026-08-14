/* ============================================================
   YourMiniTools — Image Converter v1.0.0
   Convert images between JPG, PNG, WebP via Canvas API.
   Batch up to 10 files, quality slider, MIME verification,
   downscale offer for oversized images.
   Constraints: CSP compliant, no innerHTML, no inline styles,
                no eval, canvas deallocation, ObjectURL revoke
   ============================================================ */

(function () {
  'use strict';

  function t(key, params) {
    if (window.YMT && window.YMT.i18n && window.YMT.i18n.t) {
      return window.YMT.i18n.t(key, params);
    }
    return key;
  }

  var MAX_FILE_SIZE = 12 * 1024 * 1024; // 12 MB
  var MAX_MEGAPIXELS = 25;
  var MAX_DOWNSCALE_SIDE = 4096;
  var MAX_FILES = 10;
  var ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  // DOM refs
  var dropZone = document.getElementById('ic-drop-zone');
  var fileInput = document.getElementById('ic-file-input');
  var formatSelect = document.getElementById('ic-format');
  var qualitySlider = document.getElementById('ic-quality');
  var qualityGroup = document.getElementById('ic-quality-group');
  var convertBtn = document.getElementById('ic-convert');
  var clearBtn = document.getElementById('ic-clear');
  var progressSection = document.getElementById('ic-progress-section');
  var progressBar = document.getElementById('ic-progress-bar');
  var progressText = document.getElementById('ic-progress-text');
  var fileListSection = document.getElementById('ic-file-list-section');
  var fileListEl = document.getElementById('ic-file-list');
  var resultsSection = document.getElementById('ic-results-section');
  var resultsEl = document.getElementById('ic-results');

  // State
  var pendingFiles = []; // Array of { file, width, height, needsDownscale }
  var isConverting = false;

  // --- Event Listeners ------------------------------------------------

  dropZone.addEventListener('click', function () {
    if (!isConverting) fileInput.click();
  });

  dropZone.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && !isConverting) {
      e.preventDefault();
      fileInput.click();
    }
  });

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.setAttribute('data-dragover', 'true');
  });

  dropZone.addEventListener('dragleave', function () {
    dropZone.setAttribute('data-dragover', 'false');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.setAttribute('data-dragover', 'false');
    if (!isConverting) handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', function () {
    if (!isConverting) handleFiles(fileInput.files);
    fileInput.value = '';
  });

  formatSelect.addEventListener('change', updateQualityVisibility);

  qualitySlider.addEventListener('input', function () {
    var el = document.getElementById('ic-quality-value');
    if (el) el.textContent = qualitySlider.value;
  });

  convertBtn.addEventListener('click', startConversion);

  clearBtn.addEventListener('click', clearAll);

  // --- File Handling --------------------------------------------------

  function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList);
    var totalAfter = pendingFiles.length + files.length;

    if (totalAfter > MAX_FILES) {
      YMT.showNotification(
        t('tool.imageConverter.maxFilesWarning', { max: MAX_FILES, current: pendingFiles.length }),
        'warning'
      );
      files = files.slice(0, MAX_FILES - pendingFiles.length);
      if (files.length === 0) return;
    }

    var validationPromises = files.map(function (file) {
      return validateFile(file);
    });

    Promise.all(validationPromises).then(function (results) {
      var added = 0;
      results.forEach(function (result) {
        if (result) {
          pendingFiles.push(result);
          added++;
        }
      });
      if (added > 0) renderFileList();
    });
  }

  function validateFile(file) {
    // Check MIME type
    if (ALLOWED_TYPES.indexOf(file.type) === -1) {
      YMT.showNotification(
        t('tool.imageConverter.unsupportedFormat', { name: file.name }),
        'error'
      );
      return Promise.resolve(null);
    }

    // Check file size
    var sizeCheck = YMT.validateFileSize(file, MAX_FILE_SIZE);
    if (!sizeCheck.valid) {
      YMT.showNotification(file.name + ': ' + sizeCheck.message, 'error');
      return Promise.resolve(null);
    }

    // Verify MIME via header bytes
    return verifyMimeType(file).then(function (realType) {
      if (!realType || ALLOWED_TYPES.indexOf(realType) === -1) {
        YMT.showNotification(
          t('tool.imageConverter.invalidMime', { name: file.name }),
          'error'
        );
        return null;
      }

      // Check dimensions
      return YMT.validateImageDimensions(file, MAX_MEGAPIXELS).then(function (dimResult) {
        var entry = {
          file: file,
          width: dimResult.width,
          height: dimResult.height,
          needsDownscale: false
        };

        if (!dimResult.valid) {
          // Offer downscale
          entry.needsDownscale = true;
          YMT.showNotification(
            t('tool.imageConverter.willDownscale', { name: file.name, message: dimResult.message }),
            'warning'
          );
        }

        return entry;
      });
    });
  }

  /**
   * Verify real MIME type by reading magic bytes.
   * Returns a Promise resolving to the detected MIME string or null.
   */
  function verifyMimeType(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onloadend = function () {
        if (!reader.result) { resolve(null); return; }
        var arr = new Uint8Array(reader.result);
        var hex = '';
        for (var i = 0; i < Math.min(arr.length, 12); i++) {
          hex += arr[i].toString(16).padStart(2, '0');
        }
        // JPEG: FF D8 FF
        if (hex.indexOf('ffd8ff') === 0) { resolve('image/jpeg'); return; }
        // PNG: 89 50 4E 47
        if (hex.indexOf('89504e47') === 0) { resolve('image/png'); return; }
        // WebP: RIFF....WEBP
        if (hex.indexOf('52494646') === 0 && hex.indexOf('57454250') === 16) {
          resolve('image/webp'); return;
        }
        resolve(null);
      };
      reader.onerror = function () { resolve(null); };
      reader.readAsArrayBuffer(file.slice(0, 12));
    });
  }

  // --- File List Rendering --------------------------------------------

  function renderFileList() {
    fileListSection.removeAttribute('hidden');
    convertBtn.disabled = pendingFiles.length === 0;
    clearBtn.removeAttribute('hidden');

    // Clear previous
    while (fileListEl.firstChild) {
      fileListEl.removeChild(fileListEl.firstChild);
    }

    pendingFiles.forEach(function (entry, index) {
      var item = document.createElement('div');
      item.className = 'ic-file-item';
      item.setAttribute('role', 'listitem');

      var info = document.createElement('span');
      info.className = 'ic-file-info';
      var sizeMB = (entry.file.size / (1024 * 1024)).toFixed(1);
      info.textContent = entry.file.name + ' \u2014 ' +
        entry.width + '\u00D7' + entry.height + ' \u2014 ' + sizeMB + ' MB';
      if (entry.needsDownscale) {
        info.textContent += ' ' + t('tool.imageConverter.willDownscaleTag');
      }

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn btn-sm btn-secondary';
      removeBtn.textContent = t('tool.imageConverter.removeBtn');
      removeBtn.setAttribute('aria-label', t('tool.imageConverter.removeAria', { name: entry.file.name }));
      removeBtn.addEventListener('click', function () {
        pendingFiles.splice(index, 1);
        renderFileList();
        if (pendingFiles.length === 0) {
          fileListSection.setAttribute('hidden', '');
          clearBtn.setAttribute('hidden', '');
          convertBtn.disabled = true;
        }
      });

      item.appendChild(info);
      item.appendChild(removeBtn);
      fileListEl.appendChild(item);
    });
  }

  // --- Conversion -----------------------------------------------------

  function startConversion() {
    if (isConverting || pendingFiles.length === 0) return;
    isConverting = true;
    convertBtn.disabled = true;

    var format = formatSelect.value;
    var quality = format === 'image/png' ? undefined : qualitySlider.value / 100;
    var ext = formatToExt(format);

    // Show progress
    progressSection.removeAttribute('hidden');
    resultsSection.removeAttribute('hidden');

    // Clear previous results
    while (resultsEl.firstChild) {
      resultsEl.removeChild(resultsEl.firstChild);
    }

    var total = pendingFiles.length;
    var done = 0;

    function processNext() {
      if (done >= total) {
        finishConversion();
        return;
      }

      var entry = pendingFiles[done];
      updateProgress(done, total, entry.file.name);

      convertImage(entry, format, quality, ext)
        .then(function (result) {
          appendResult(result);
          done++;
          updateProgress(done, total, done < total ? pendingFiles[done].file.name : '');
          processNext();
        })
        .catch(function () {
          appendError(entry.file.name);
          done++;
          processNext();
        });
    }

    processNext();
  }

  function convertImage(entry, format, quality, ext) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(entry.file);
      var img = new Image();

      img.onload = function () {
        URL.revokeObjectURL(url);

        var w = img.width;
        var h = img.height;

        // Downscale if needed
        if (entry.needsDownscale) {
          var scale = Math.min(MAX_DOWNSCALE_SIDE / w, MAX_DOWNSCALE_SIDE / h, 1);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(function (blob) {
          // Deallocate canvas
          canvas.width = 0;
          canvas.height = 0;

          if (!blob) {
            reject(new Error('toBlob failed'));
            return;
          }

          var baseName = entry.file.name.replace(/\.[^.]+$/, '');
          var fileName = baseName + '.' + ext;

          resolve({
            originalName: entry.file.name,
            originalSize: entry.file.size,
            fileName: fileName,
            blob: blob,
            width: w,
            height: h,
            convertedSize: blob.size
          });
        }, format, quality);
      };

      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Image load failed'));
      };

      img.src = url;
    });
  }

  function appendResult(result) {
    var item = document.createElement('div');
    item.className = 'ic-result-item';
    item.setAttribute('role', 'listitem');

    // Info
    var info = document.createElement('div');
    info.className = 'ic-result-info';

    var name = document.createElement('span');
    name.className = 'ic-result-name';
    name.textContent = result.fileName;

    var details = document.createElement('span');
    details.className = 'ic-result-details';
    var origKB = (result.originalSize / 1024).toFixed(0);
    var newKB = (result.convertedSize / 1024).toFixed(0);
    var ratio = result.originalSize > 0
      ? ((1 - result.convertedSize / result.originalSize) * 100).toFixed(0)
      : 0;
    var sign = ratio >= 0 ? '-' : '+';
    if (ratio < 0) ratio = Math.abs(ratio);

    details.textContent = result.width + '\u00D7' + result.height +
      ' \u2014 ' + origKB + ' KB \u2192 ' + newKB + ' KB (' + sign + ratio + '%)';

    info.appendChild(name);
    info.appendChild(details);

    // Download button
    var dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'btn btn-primary btn-sm';
    dlBtn.textContent = t('tool.imageConverter.downloadBtn');
    dlBtn.setAttribute('aria-label', t('tool.imageConverter.downloadAria', { name: result.fileName }));
    dlBtn.addEventListener('click', function () {
      YMT.downloadFile(result.blob, result.fileName);
    });

    item.appendChild(info);
    item.appendChild(dlBtn);
    resultsEl.appendChild(item);
  }

  function appendError(fileName) {
    var item = document.createElement('div');
    item.className = 'ic-result-item ic-result-error';
    item.setAttribute('role', 'listitem');

    var info = document.createElement('span');
    info.className = 'ic-result-name';
    info.textContent = fileName + ' \u2014 ' + t('tool.imageConverter.conversionFailed');

    item.appendChild(info);
    resultsEl.appendChild(item);
  }

  function updateProgress(done, total, currentFile) {
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;
    progressBar.setAttribute('data-width', pct);
    progressBar.style.setProperty('width', pct + '%');
    if (done < total) {
      progressText.textContent = t('tool.imageConverter.progressText', { current: done + 1, total: total, name: currentFile });
    } else {
      progressText.textContent = t('tool.imageConverter.progressDone', { total: total });
    }
  }

  function finishConversion() {
    isConverting = false;
    convertBtn.disabled = false;
    YMT.showNotification(t('tool.imageConverter.conversionComplete'), 'success');
  }

  function clearAll() {
    pendingFiles = [];
    isConverting = false;
    convertBtn.disabled = true;
    clearBtn.setAttribute('hidden', '');
    fileListSection.setAttribute('hidden', '');
    resultsSection.setAttribute('hidden', '');
    progressSection.setAttribute('hidden', '');

    while (fileListEl.firstChild) {
      fileListEl.removeChild(fileListEl.firstChild);
    }
    while (resultsEl.firstChild) {
      resultsEl.removeChild(resultsEl.firstChild);
    }

    progressBar.style.setProperty('width', '0%');
    progressText.textContent = '';
  }

  // --- Helpers --------------------------------------------------------

  function updateQualityVisibility() {
    if (formatSelect.value === 'image/png') {
      qualityGroup.setAttribute('data-disabled', 'true');
      qualitySlider.disabled = true;
    } else {
      qualityGroup.removeAttribute('data-disabled');
      qualitySlider.disabled = false;
    }
  }

  function formatToExt(mimeType) {
    switch (mimeType) {
      case 'image/jpeg': return 'jpg';
      case 'image/png': return 'png';
      case 'image/webp': return 'webp';
      default: return 'bin';
    }
  }

  // Init
  updateQualityVisibility();

})();
