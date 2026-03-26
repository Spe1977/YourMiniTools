/* ============================================================
   YourMiniTools — Loan Calculator v1.0.0
   French amortization: constant monthly payment.
   Export TXT, MD, PDF (jsPDF lazy-loaded).
   Constraints: CSP compliant, no innerHTML, no inline styles
                (except style.setProperty for dynamic pie chart),
                no eval, IIFE strict mode.
   ============================================================ */

(function () {
  'use strict';

  function t(key, params) {
    if (window.YMT && window.YMT.i18n && window.YMT.i18n.t) {
      return window.YMT.i18n.t(key, params);
    }
    return key;
  }

  // --- DOM refs -----------------------------------------------
  var modeSelect    = document.getElementById('lc-mode');
  var capitalInput = document.getElementById('lc-capital');
  var rateGroup     = document.getElementById('lc-rate-group');
  var rateInput = document.getElementById('lc-rate');
  var paymentGroup  = document.getElementById('lc-payment-group');
  var paymentInput  = document.getElementById('lc-payment');
  var durationInput = document.getElementById('lc-duration');
  var durationTypeSelect = document.getElementById('lc-duration-type');
  var calculateBtn = document.getElementById('lc-calculate');
  var resetBtn = document.getElementById('lc-reset');

  var resultsSection = document.getElementById('lc-results-section');
  var monthlyPaymentEl = document.getElementById('lc-monthly-payment');
  var totalInterestEl = document.getElementById('lc-total-interest');
  var totalCostEl = document.getElementById('lc-total-cost');
  var pieChartEl = document.getElementById('lc-pie-chart');

  var tableSection = document.getElementById('lc-table-section');
  var tableBody = document.getElementById('lc-table-body');
  var stat1LabelEl  = document.getElementById('lc-stat1-label');

  var exportTxtBtn = document.getElementById('lc-export-txt');
  var exportMdBtn = document.getElementById('lc-export-md');
  var exportPdfBtn = document.getElementById('lc-export-pdf');

  // --- State --------------------------------------------------
  var lastResult = null; // { capital, rate, months, monthlyPayment, totalInterest, totalCost, schedule }

  // --- Events -------------------------------------------------
  modeSelect.addEventListener('change', onModeChange);
  calculateBtn.addEventListener('click', calculate);
  resetBtn.addEventListener('click', resetAll);
  exportTxtBtn.addEventListener('click', function () { exportText('txt'); });
  exportMdBtn.addEventListener('click', function () { exportText('md'); });
  exportPdfBtn.addEventListener('click', exportPDF);

  // Allow Enter key to trigger calculation
  [capitalInput, rateInput, paymentInput, durationInput].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculate();
      }
    });
  });

  // --- Mode change --------------------------------------------

  function onModeChange() {
    var isRateMode = modeSelect.value === 'rate';
    if (isRateMode) {
      rateGroup.setAttribute('hidden', '');
      paymentGroup.removeAttribute('hidden');
    } else {
      rateGroup.removeAttribute('hidden');
      paymentGroup.setAttribute('hidden', '');
    }
    YMT.clearFieldError(rateInput);
    YMT.clearFieldError(paymentInput);
    resultsSection.setAttribute('hidden', '');
    tableSection.setAttribute('hidden', '');
    lastResult = null;
  }

  // --- Calculation --------------------------------------------

  function calculate() {
    if (modeSelect.value === 'rate') {
      calculateRate();
    } else {
      calculatePayment();
    }
  }

  function calculatePayment() {
    // Validate inputs
    var valid = true;

    // Parse capital — allow dots/commas as thousand/decimal separators
    var capitalRaw = capitalInput.value.replace(/\s/g, '').replace(/,/g, '.');
    var capital = parseFloat(capitalRaw);
    if (isNaN(capital) || capital <= 0 || capital > 100000000) {
      YMT.showFieldError(capitalInput, t('tool.loanCalculator.errorCapital'));
      valid = false;
    } else {
      YMT.clearFieldError(capitalInput);
    }

    var rateRaw = rateInput.value.replace(/\s/g, '').replace(/,/g, '.');
    var annualRate = parseFloat(rateRaw);
    if (isNaN(annualRate) || annualRate < 0.01 || annualRate > 30) {
      YMT.showFieldError(rateInput, t('tool.loanCalculator.errorRate'));
      valid = false;
    } else {
      YMT.clearFieldError(rateInput);
    }

    var durationRaw = durationInput.value.replace(/\s/g, '');
    var duration = parseInt(durationRaw, 10);
    var isYears = durationTypeSelect.value === 'years';
    var maxDuration = isYears ? 50 : 600;
    var unitLabel = isYears ? t('tool.loanCalculator.unitYears').toLowerCase() : t('tool.loanCalculator.unitMonths').toLowerCase();
    if (isNaN(duration) || duration < 1 || duration > maxDuration) {
      YMT.showFieldError(durationInput, t('tool.loanCalculator.errorDuration', { max: maxDuration, unit: unitLabel }));
      valid = false;
    } else {
      YMT.clearFieldError(durationInput);
    }

    if (!valid) return;

    // Compute
    var months = isYears ? duration * 12 : duration;
    var monthlyRate = annualRate / 100 / 12;

    var monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = capital / months;
    } else {
      // M = P × [r(1+r)^n] / [(1+r)^n – 1]
      var factor = Math.pow(1 + monthlyRate, months);
      monthlyPayment = capital * (monthlyRate * factor) / (factor - 1);
    }

    var totalCost = monthlyPayment * months;
    var totalInterest = totalCost - capital;

    // Build amortization schedule
    var schedule = [];
    var remaining = capital;
    for (var i = 1; i <= months; i++) {
      var interestPart = remaining * monthlyRate;
      var capitalPart = monthlyPayment - interestPart;
      remaining = remaining - capitalPart;
      if (remaining < 0.005) remaining = 0; // avoid floating point artifacts

      schedule.push({
        month: i,
        payment: monthlyPayment,
        capitalPart: capitalPart,
        interestPart: interestPart,
        remaining: remaining
      });
    }

    lastResult = {
      capital: capital,
      annualRate: annualRate,
      months: months,
      monthlyPayment: monthlyPayment,
      totalInterest: totalInterest,
      totalCost: totalCost,
      schedule: schedule,
      mode: 'payment'
    };

    renderResults();
  }

  function calculateRate() {
    var valid = true;

    var capitalRaw = capitalInput.value.replace(/\s/g, '').replace(/,/g, '.');
    var capital = parseFloat(capitalRaw);
    if (isNaN(capital) || capital <= 0 || capital > 100000000) {
      YMT.showFieldError(capitalInput, t('tool.loanCalculator.errorCapital'));
      valid = false;
    } else {
      YMT.clearFieldError(capitalInput);
    }

    var paymentRaw = paymentInput.value.replace(/\s/g, '').replace(/,/g, '.');
    var monthlyPayment = parseFloat(paymentRaw);
    if (isNaN(monthlyPayment) || monthlyPayment <= 0) {
      YMT.showFieldError(paymentInput, t('tool.loanCalculator.errorPayment'));
      valid = false;
    } else {
      YMT.clearFieldError(paymentInput);
    }

    var durationRaw = durationInput.value.replace(/\s/g, '');
    var duration = parseInt(durationRaw, 10);
    var isYears = durationTypeSelect.value === 'years';
    var maxDuration = isYears ? 50 : 600;
    var unitLabel = isYears ? t('tool.loanCalculator.unitYears').toLowerCase() : t('tool.loanCalculator.unitMonths').toLowerCase();
    if (isNaN(duration) || duration < 1 || duration > maxDuration) {
      YMT.showFieldError(durationInput, t('tool.loanCalculator.errorDuration', { max: maxDuration, unit: unitLabel }));
      valid = false;
    } else {
      YMT.clearFieldError(durationInput);
    }

    if (!valid) return;

    var months = isYears ? duration * 12 : duration;

    // Business-logic checks (require both capital and payment to be valid)
    if (monthlyPayment <= capital / months) {
      YMT.showFieldError(paymentInput, t('tool.loanCalculator.errorPaymentTooLow'));
      return;
    }

    var maxMonthlyRate = 0.30 / 12;
    if (monthlyPayment > amortPayment(capital, maxMonthlyRate, months)) {
      YMT.showFieldError(paymentInput, t('tool.loanCalculator.errorPaymentTooHigh'));
      return;
    }

    var annualRate = bisectRate(capital, monthlyPayment, months);
    var monthlyRate = annualRate / 100 / 12;
    var totalCost = monthlyPayment * months;
    var totalInterest = totalCost - capital;

    // Build amortization schedule using the found rate
    var schedule = [];
    var remaining = capital;
    for (var i = 1; i <= months; i++) {
      var interestPart = remaining * monthlyRate;
      var capitalPart = monthlyPayment - interestPart;
      remaining = remaining - capitalPart;
      if (remaining < 0.005) remaining = 0;

      schedule.push({
        month: i,
        payment: monthlyPayment,
        capitalPart: capitalPart,
        interestPart: interestPart,
        remaining: remaining
      });
    }

    lastResult = {
      capital: capital,
      annualRate: annualRate,
      months: months,
      monthlyPayment: monthlyPayment,
      totalInterest: totalInterest,
      totalCost: totalCost,
      schedule: schedule,
      mode: 'rate'
    };

    renderResults();
  }

  /**
   * French amortization formula: monthly payment for a given monthly rate.
   */
  function amortPayment(capital, monthlyRate, months) {
    if (monthlyRate < 1e-12) return capital / months;
    var factor = Math.pow(1 + monthlyRate, months);
    return capital * (monthlyRate * factor) / (factor - 1);
  }

  /**
   * Bisection method: find annual rate (%) such that amortPayment matches
   * the target payment. Precondition: caller verified payment is in range.
   * 60 iterations → precision ~2.6e-19 annual rate, far below sub-cent.
   */
  function bisectRate(capital, payment, months) {
    var lo = 1e-9, hi = 0.30 / 12, mid;
    for (var iter = 0; iter < 60; iter++) {
      mid = (lo + hi) / 2;
      if (amortPayment(capital, mid, months) > payment) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    return mid * 12 * 100; // monthly rate → annual percentage
  }

  // --- Rendering ----------------------------------------------

  function renderResults() {
    if (!lastResult) return;

    // Show sections
    resultsSection.removeAttribute('hidden');
    tableSection.removeAttribute('hidden');

    // Summary stats — first card is mode-dependent
    if (lastResult.mode === 'rate') {
      monthlyPaymentEl.textContent = lastResult.annualRate.toFixed(4) + ' %';
      stat1LabelEl.textContent = t('tool.loanCalculator.annualRate');
    } else {
      monthlyPaymentEl.textContent = formatCurrency(lastResult.monthlyPayment);
      stat1LabelEl.textContent = t('tool.loanCalculator.monthlyPayment');
    }
    totalInterestEl.textContent = formatCurrency(lastResult.totalInterest);
    totalCostEl.textContent = formatCurrency(lastResult.totalCost);

    // Pie chart via conic-gradient
    var capitalPct = (lastResult.capital / lastResult.totalCost) * 100;
    var interestPct = 100 - capitalPct;
    pieChartEl.style.setProperty(
      'background-image',
      'conic-gradient(#2980b9 0% ' + capitalPct.toFixed(1) + '%, #e74c3c ' + capitalPct.toFixed(1) + '% 100%)'
    );
    pieChartEl.setAttribute('aria-label',
      t('tool.loanCalculator.pieLabel', { capitalPct: capitalPct.toFixed(1), interestPct: interestPct.toFixed(1) })
    );

    // Amortization table
    while (tableBody.firstChild) {
      tableBody.removeChild(tableBody.firstChild);
    }

    var schedule = lastResult.schedule;
    for (var i = 0; i < schedule.length; i++) {
      var row = document.createElement('tr');

      var cells = [
        schedule[i].month,
        formatNumber(schedule[i].payment),
        formatNumber(schedule[i].capitalPart),
        formatNumber(schedule[i].interestPart),
        formatNumber(schedule[i].remaining)
      ];

      for (var j = 0; j < cells.length; j++) {
        var td = document.createElement('td');
        td.textContent = cells[j];
        row.appendChild(td);
      }

      tableBody.appendChild(row);
    }

    YMT.showNotification(t('tool.loanCalculator.calculationDone'), 'success');
  }

  // --- Export TXT / MD ----------------------------------------

  function exportText(format) {
    if (!lastResult) {
      YMT.showNotification(t('tool.loanCalculator.calculateFirst'), 'warning');
      return;
    }

    var isMd = format === 'md';
    var sep = isMd ? ' | ' : '\t';
    var lines = [];

    var exportTitle = t('tool.loanCalculator.exportTitle');

    // Header
    if (isMd) {
      lines.push('# ' + exportTitle);
      lines.push('');
    } else {
      lines.push(exportTitle.toUpperCase());
      lines.push('==========================');
    }

    lines.push('');
    lines.push(t('tool.loanCalculator.exportCapital', { value: formatCurrency(lastResult.capital) }));
    lines.push(t('tool.loanCalculator.exportRate', { value: lastResult.annualRate.toFixed(2) }));
    lines.push(t('tool.loanCalculator.exportDuration', { months: lastResult.months, years: (lastResult.months / 12).toFixed(1) }));
    lines.push('');
    lines.push(t('tool.loanCalculator.exportMonthly', { value: formatCurrency(lastResult.monthlyPayment) }));
    lines.push(t('tool.loanCalculator.exportTotalInterest', { value: formatCurrency(lastResult.totalInterest) }));
    lines.push(t('tool.loanCalculator.exportTotalCost', { value: formatCurrency(lastResult.totalCost) }));
    lines.push('');

    // Amortization table
    var amortTitle = t('tool.loanCalculator.exportAmortTitle');
    var thMonth = t('tool.loanCalculator.tableMonth');
    var thPayment = t('tool.loanCalculator.tablePayment');
    var thPrincipal = t('tool.loanCalculator.tablePrincipal');
    var thInterest = t('tool.loanCalculator.tableInterest');
    var thRemaining = t('tool.loanCalculator.tableRemaining');

    if (isMd) {
      lines.push('## ' + amortTitle);
      lines.push('');
      lines.push('| ' + thMonth + ' | ' + thPayment + ' | ' + thPrincipal + ' | ' + thInterest + ' | ' + thRemaining + ' |');
      lines.push('|------|----------|--------------|----------------|---------------------|');
    } else {
      lines.push(amortTitle.toUpperCase());
      lines.push('---------------------');
      lines.push(thMonth + sep + thPayment + sep + thPrincipal + sep + thInterest + sep + thRemaining);
    }

    var schedule = lastResult.schedule;
    for (var i = 0; i < schedule.length; i++) {
      var s = schedule[i];
      if (isMd) {
        lines.push('| ' + s.month + sep + formatNumber(s.payment) + sep +
          formatNumber(s.capitalPart) + sep + formatNumber(s.interestPart) + sep +
          formatNumber(s.remaining) + ' |');
      } else {
        lines.push(s.month + sep + formatNumber(s.payment) + sep +
          formatNumber(s.capitalPart) + sep + formatNumber(s.interestPart) + sep +
          formatNumber(s.remaining));
      }
    }

    lines.push('');
    lines.push('---');
    lines.push(t('tool.loanCalculator.exportFooter'));
    lines.push(t('tool.loanCalculator.exportDisclaimer'));

    var text = lines.join('\n');
    var ext = isMd ? 'md' : 'txt';
    var mime = isMd ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
    YMT.downloadText(text, 'loan-simulation.' + ext, mime);
    YMT.showNotification(t('tool.loanCalculator.fileDownloaded', { format: ext.toUpperCase() }), 'success');
  }

  // --- Export PDF (jsPDF lazy-loaded) -------------------------

  function exportPDF() {
    if (!lastResult) {
      YMT.showNotification(t('tool.loanCalculator.calculateFirst'), 'warning');
      return;
    }

    exportPdfBtn.disabled = true;
    exportPdfBtn.textContent = t('tool.loanCalculator.loading');

    loadJsPDF()
      .then(function (jspdfModule) {
        var jsPDF = jspdfModule.jsPDF;
        var doc = new jsPDF();

        var pageWidth = doc.internal.pageSize.getWidth();
        var margin = 15;
        var y = 20;

        var exportTitle = t('tool.loanCalculator.exportTitle');

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(exportTitle, margin, y);
        y += 12;

        // Summary
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(t('tool.loanCalculator.exportCapital', { value: formatCurrency(lastResult.capital) }), margin, y); y += 7;
        doc.text(t('tool.loanCalculator.exportRate', { value: lastResult.annualRate.toFixed(2) }), margin, y); y += 7;
        doc.text(t('tool.loanCalculator.exportDuration', { months: lastResult.months, years: (lastResult.months / 12).toFixed(1) }), margin, y); y += 10;

        doc.setFont('helvetica', 'bold');
        doc.text(t('tool.loanCalculator.exportMonthly', { value: formatCurrency(lastResult.monthlyPayment) }), margin, y); y += 7;
        doc.text(t('tool.loanCalculator.exportTotalInterest', { value: formatCurrency(lastResult.totalInterest) }), margin, y); y += 7;
        doc.text(t('tool.loanCalculator.exportTotalCost', { value: formatCurrency(lastResult.totalCost) }), margin, y); y += 14;

        // Amortization table header
        var amortTitle = t('tool.loanCalculator.exportAmortTitle');
        doc.setFontSize(13);
        doc.text(amortTitle, margin, y); y += 8;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');

        var colWidths = [18, 30, 35, 35, 45];
        var headers = [
          t('tool.loanCalculator.tableMonth'),
          t('tool.loanCalculator.tablePayment'),
          t('tool.loanCalculator.tablePrincipal'),
          t('tool.loanCalculator.tableInterest'),
          t('tool.loanCalculator.tableRemaining')
        ];
        var xPos = margin;
        for (var h = 0; h < headers.length; h++) {
          doc.text(headers[h], xPos, y);
          xPos += colWidths[h];
        }
        y += 2;
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);

        var schedule = lastResult.schedule;
        for (var i = 0; i < schedule.length; i++) {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }

          var s = schedule[i];
          xPos = margin;
          var rowData = [
            String(s.month),
            formatNumber(s.payment),
            formatNumber(s.capitalPart),
            formatNumber(s.interestPart),
            formatNumber(s.remaining)
          ];

          for (var c = 0; c < rowData.length; c++) {
            doc.text(rowData[c], xPos, y);
            xPos += colWidths[c];
          }
          y += 4.5;
        }

        // Footer
        y += 6;
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(t('tool.loanCalculator.exportFooter'), margin, y); y += 5;
        doc.text(t('tool.loanCalculator.exportDisclaimer'), margin, y);

        doc.save('loan-simulation.pdf');
        YMT.showNotification(t('tool.loanCalculator.pdfDownloaded'), 'success');
      })
      .catch(function () {
        YMT.showNotification(t('tool.loanCalculator.pdfFallback'), 'warning');
      })
      .finally(function () {
        exportPdfBtn.disabled = false;
        exportPdfBtn.textContent = t('tool.loanCalculator.exportPdf');
      });
  }

  /**
   * Lazy-load jsPDF UMD via dynamic script tag.
   * jsPDF UMD is NOT an ES module — import() would fail.
   */
  function loadJsPDF() {
    if (window.jspdf) return Promise.resolve(window.jspdf);

    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = '/assets/js/vendor/pdf/jspdf.umd.min.js';
      script.onload = function () {
        if (window.jspdf) {
          resolve(window.jspdf);
        } else {
          reject(new Error('jsPDF not found after loading.'));
        }
      };
      script.onerror = function () {
        reject(new Error('Failed to load jsPDF.'));
      };
      document.head.appendChild(script);
    });
  }

  // --- Reset --------------------------------------------------

  function resetAll() {
    capitalInput.value = '';
    rateInput.value = '';
    paymentInput.value = '';
    durationInput.value = '';
    durationTypeSelect.selectedIndex = 0;
    modeSelect.selectedIndex = 0;

    // Restore field visibility to payment-mode defaults
    rateGroup.removeAttribute('hidden');
    paymentGroup.setAttribute('hidden', '');

    YMT.clearFieldError(capitalInput);
    YMT.clearFieldError(rateInput);
    YMT.clearFieldError(paymentInput);
    YMT.clearFieldError(durationInput);

    resultsSection.setAttribute('hidden', '');
    tableSection.setAttribute('hidden', '');

    monthlyPaymentEl.textContent = '\u2014';
    totalInterestEl.textContent = '\u2014';
    totalCostEl.textContent = '\u2014';
    stat1LabelEl.textContent = t('tool.loanCalculator.monthlyPayment');

    pieChartEl.style.setProperty('background-image', 'none');

    while (tableBody.firstChild) {
      tableBody.removeChild(tableBody.firstChild);
    }

    lastResult = null;
  }

  // --- Helpers ------------------------------------------------

  /**
   * Format number to 2 decimal places with locale-aware separators.
   */
  function formatNumber(n) {
    var locale = getLocale();
    try {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(n);
    } catch (e) {
      return n.toFixed(2);
    }
  }

  /**
   * Format as currency string (locale-aware).
   */
  function formatCurrency(n) {
    var locale = getLocale();
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(n);
    } catch (e) {
      return n.toFixed(2) + ' \u20AC';
    }
  }

  /**
   * Get current locale from i18n system, mapping to BCP 47.
   */
  function getLocale() {
    if (window.YMT && window.YMT.i18n && window.YMT.i18n.getLocale) {
      var loc = window.YMT.i18n.getLocale();
      var map = { en: 'en-US', it: 'it-IT', es: 'es-ES', ru: 'ru-RU', zh: 'zh-CN' };
      return map[loc] || loc;
    }
    return 'en-US';
  }

})();
