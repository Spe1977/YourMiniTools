/* ============================================================
   YourMiniTools — Stopwatch & Timer v1.0.0
   Stopwatch with laps, countdown timer, Pomodoro mode
   Uses performance.now() + real timestamps for drift compensation
   AudioContext created on first user gesture (browser autoplay policy)
   Depends on: notifications.js, clipboard.js (YMT namespace)
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

  var TICK_MS = 50;
  var POMODORO_WORK_MS  = 25 * 60 * 1000;
  var POMODORO_BREAK_MS = 5 * 60 * 1000;

  var audioCtx = null;

  /* ===== Tab Management ====================================== */
  var tabs, panels;

  document.addEventListener('DOMContentLoaded', function () {
    tabs = document.querySelectorAll('.tool-tab');
    panels = document.querySelectorAll('.tool-tab-panel');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (tab) { tab.setAttribute('aria-selected', 'false'); });
        panels.forEach(function (p) { p.setAttribute('data-active', 'false'); });
        tab.setAttribute('aria-selected', 'true');
        var panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) panel.setAttribute('data-active', 'true');
      });
    });

    initStopwatch();
    initTimer();
    initPomodoro();
    initVisibility();
  });

  /* ===== Audio (beep via AudioContext) ======================== */
  function ensureAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playBeep(frequency, duration) {
    try {
      var ctx = ensureAudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency || 880;
      gain.gain.value = 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (duration || 0.3));
    } catch (e) {
      // AudioContext may not be available
    }
  }

  function playAlarm() {
    playBeep(880, 0.15);
    setTimeout(function () { playBeep(880, 0.15); }, 200);
    setTimeout(function () { playBeep(1100, 0.3); }, 400);
  }

  /* ===== Format helpers ====================================== */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function pad3(n) { return n < 10 ? '00' + n : (n < 100 ? '0' + n : '' + n); }

  function formatMs(ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    var msR = Math.floor(ms % 1000);
    return pad(h) + ':' + pad(m) + ':' + pad(s) + '.' + pad3(msR);
  }

  function formatTimer(ms) {
    if (ms < 0) ms = 0;
    var totalSec = Math.ceil(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    if (h > 0) return pad(h) + ':' + pad(m) + ':' + pad(s);
    return pad(m) + ':' + pad(s);
  }

  /** Update a display element with time + ms span (no innerHTML) */
  var _displayCache = new WeakMap();
  function setStopwatchDisplay(el, ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    var msR = Math.floor(ms % 1000);

    // Cache DOM refs per element to avoid querySelector on every tick
    var cached = _displayCache.get(el);
    if (!cached) {
      el.textContent = '';
      var textNode = document.createTextNode('');
      var msSpan = document.createElement('span');
      msSpan.className = 'display-time-ms';
      el.appendChild(textNode);
      el.appendChild(msSpan);
      cached = { textNode: textNode, msSpan: msSpan };
      _displayCache.set(el, cached);
    }

    cached.textNode.nodeValue = pad(h) + ':' + pad(m) + ':' + pad(s);
    cached.msSpan.textContent = '.' + pad3(msR);
  }

  /* ===== Stopwatch =========================================== */
  var sw = {
    display: null,
    btnStart: null,
    btnLap: null,
    btnReset: null,
    lapsSection: null,
    lapsList: null,
    running: false,
    startTime: 0,
    elapsed: 0,
    laps: [],
    intervalId: null
  };

  function initStopwatch() {
    sw.display   = document.getElementById('sw-display');
    sw.btnStart  = document.getElementById('sw-start');
    sw.btnLap    = document.getElementById('sw-lap');
    sw.btnReset  = document.getElementById('sw-reset');
    sw.lapsSection = document.getElementById('sw-laps-section');
    sw.lapsList  = document.getElementById('sw-laps');

    sw.btnStart.addEventListener('click', function () {
      ensureAudioCtx();
      if (sw.running) {
        stopStopwatch();
      } else {
        startStopwatch();
      }
    });

    sw.btnLap.addEventListener('click', function () {
      if (sw.running) addLap();
    });

    sw.btnReset.addEventListener('click', resetStopwatch);
  }

  function startStopwatch() {
    sw.running = true;
    sw.startTime = performance.now() - sw.elapsed;
    sw.btnStart.textContent = t('tool.stopwatchTimer.pause');
    sw.btnLap.disabled = false;
    sw.btnReset.disabled = false;
    sw.intervalId = setInterval(tickStopwatch, TICK_MS);
  }

  function stopStopwatch() {
    sw.running = false;
    sw.elapsed = performance.now() - sw.startTime;
    sw.btnStart.textContent = t('tool.stopwatchTimer.resume');
    clearInterval(sw.intervalId);
  }

  function resetStopwatch() {
    sw.running = false;
    sw.elapsed = 0;
    sw.laps = [];
    clearInterval(sw.intervalId);
    setStopwatchDisplay(sw.display, 0);
    sw.btnStart.textContent = t('tool.stopwatchTimer.start');
    sw.btnLap.disabled = true;
    sw.btnReset.disabled = true;
    sw.lapsSection.hidden = true;
    while (sw.lapsList.firstChild) sw.lapsList.removeChild(sw.lapsList.firstChild);
  }

  function tickStopwatch() {
    sw.elapsed = performance.now() - sw.startTime;
    setStopwatchDisplay(sw.display, sw.elapsed);
  }

  function addLap() {
    var currentElapsed = performance.now() - sw.startTime;
    var prevLapTime = sw.laps.length > 0 ? sw.laps[sw.laps.length - 1].total : 0;
    var lapTime = currentElapsed - prevLapTime;

    sw.laps.push({ total: currentElapsed, lap: lapTime });
    sw.lapsSection.hidden = false;

    var item = document.createElement('div');
    item.className = 'lap-item';

    var numEl = document.createElement('span');
    numEl.className = 'lap-number';
    numEl.textContent = t('tool.stopwatchTimer.lapNumber', { n: sw.laps.length });

    var timeEl = document.createElement('span');
    timeEl.className = 'lap-time';
    timeEl.textContent = formatMs(lapTime);

    var diffEl = document.createElement('span');
    diffEl.className = 'lap-diff';
    diffEl.textContent = formatMs(currentElapsed);

    item.appendChild(numEl);
    item.appendChild(timeEl);
    item.appendChild(diffEl);

    if (sw.lapsList.firstChild) {
      sw.lapsList.insertBefore(item, sw.lapsList.firstChild);
    } else {
      sw.lapsList.appendChild(item);
    }
  }

  /* ===== Timer =============================================== */
  var tm = {
    display: null,
    btnStart: null,
    btnReset: null,
    inputRow: null,
    hoursInput: null,
    minutesInput: null,
    secondsInput: null,
    running: false,
    targetTime: 0,
    remainingMs: 0,
    intervalId: null
  };

  function initTimer() {
    tm.display      = document.getElementById('tm-display');
    tm.btnStart     = document.getElementById('tm-start');
    tm.btnReset     = document.getElementById('tm-reset');
    tm.inputRow     = document.getElementById('tm-input-row');
    tm.hoursInput   = document.getElementById('tm-hours');
    tm.minutesInput = document.getElementById('tm-minutes');
    tm.secondsInput = document.getElementById('tm-seconds');

    [tm.hoursInput, tm.minutesInput, tm.secondsInput].forEach(function (input) {
      input.addEventListener('input', updateTimerDisplay);
    });

    tm.btnStart.addEventListener('click', function () {
      ensureAudioCtx();
      if (tm.running) {
        pauseTimer();
      } else {
        startTimer();
      }
    });

    tm.btnReset.addEventListener('click', resetTimer);
    updateTimerDisplay();
  }

  function getTimerMs() {
    var h = parseInt(tm.hoursInput.value, 10) || 0;
    var m = parseInt(tm.minutesInput.value, 10) || 0;
    var s = parseInt(tm.secondsInput.value, 10) || 0;
    return (h * 3600 + m * 60 + s) * 1000;
  }

  function updateTimerDisplay() {
    var ms = getTimerMs();
    tm.display.textContent = formatTimer(ms);
  }

  function startTimer() {
    if (!tm.running && tm.remainingMs <= 0) {
      tm.remainingMs = getTimerMs();
    }
    if (tm.remainingMs <= 0) {
      if (window.YMT && window.YMT.showNotification) {
        window.YMT.showNotification(t('tool.stopwatchTimer.setTimeWarning'), 'warning');
      }
      return;
    }

    tm.running = true;
    tm.targetTime = Date.now() + tm.remainingMs;
    tm.btnStart.textContent = t('tool.stopwatchTimer.pause');
    tm.btnReset.disabled = false;
    tm.intervalId = setInterval(tickTimer, TICK_MS);
  }

  function pauseTimer() {
    tm.running = false;
    tm.remainingMs = Math.max(0, tm.targetTime - Date.now());
    clearInterval(tm.intervalId);
    tm.btnStart.textContent = t('tool.stopwatchTimer.resume');
  }

  function tickTimer() {
    var remaining = tm.targetTime - Date.now();
    if (remaining <= 0) {
      remaining = 0;
      clearInterval(tm.intervalId);
      tm.running = false;
      tm.remainingMs = 0;
      tm.btnStart.textContent = t('tool.stopwatchTimer.start');
      playAlarm();
      if (window.YMT && window.YMT.showNotification) {
        window.YMT.showNotification(t('tool.stopwatchTimer.timerComplete'), 'success');
      }
    }
    tm.display.textContent = formatTimer(remaining);
  }

  function resetTimer() {
    tm.running = false;
    tm.remainingMs = 0;
    clearInterval(tm.intervalId);
    tm.btnStart.textContent = t('tool.stopwatchTimer.start');
    tm.btnReset.disabled = true;
    updateTimerDisplay();
  }

  /* ===== Pomodoro ============================================ */
  var pm = {
    display: null,
    status: null,
    btnStart: null,
    btnReset: null,
    sessionsEl: null,
    totalTimeEl: null,
    isWork: true,
    running: false,
    targetTime: 0,
    remainingMs: POMODORO_WORK_MS,
    sessions: 0,
    totalWorkMs: 0,
    intervalId: null
  };

  function initPomodoro() {
    pm.display     = document.getElementById('pm-display');
    pm.status      = document.getElementById('pm-status');
    pm.btnStart    = document.getElementById('pm-start');
    pm.btnReset    = document.getElementById('pm-reset');
    pm.sessionsEl  = document.getElementById('pm-sessions');
    pm.totalTimeEl = document.getElementById('pm-total-time');

    pm.btnStart.addEventListener('click', function () {
      ensureAudioCtx();
      if (pm.running) {
        pausePomodoro();
      } else {
        startPomodoro();
      }
    });

    pm.btnReset.addEventListener('click', resetPomodoro);
    updatePomodoroDisplay();
  }

  function startPomodoro() {
    pm.running = true;
    pm.targetTime = Date.now() + pm.remainingMs;
    pm.btnStart.textContent = t('tool.stopwatchTimer.pause');
    pm.btnReset.disabled = false;
    pm.intervalId = setInterval(tickPomodoro, TICK_MS);
  }

  function pausePomodoro() {
    pm.running = false;
    pm.remainingMs = Math.max(0, pm.targetTime - Date.now());
    clearInterval(pm.intervalId);
    pm.btnStart.textContent = t('tool.stopwatchTimer.resume');
  }

  function tickPomodoro() {
    var remaining = pm.targetTime - Date.now();
    if (remaining <= 0) {
      clearInterval(pm.intervalId);
      pm.running = false;
      playAlarm();

      if (pm.isWork) {
        pm.sessions++;
        pm.totalWorkMs += POMODORO_WORK_MS;
        pm.sessionsEl.textContent = pm.sessions;
        pm.totalTimeEl.textContent = Math.round(pm.totalWorkMs / 60000) + ' ' + t('tool.stopwatchTimer.minutes').toLowerCase();
        pm.isWork = false;
        pm.remainingMs = POMODORO_BREAK_MS;
        if (window.YMT && window.YMT.showNotification) {
          window.YMT.showNotification(t('tool.stopwatchTimer.pomodoroSessionDone'), 'success');
        }
      } else {
        pm.isWork = true;
        pm.remainingMs = POMODORO_WORK_MS;
        if (window.YMT && window.YMT.showNotification) {
          window.YMT.showNotification(t('tool.stopwatchTimer.pomodoroBreakDone'), 'info');
        }
      }

      pm.btnStart.textContent = t('tool.stopwatchTimer.start');
      updatePomodoroDisplay();
      return;
    }
    pm.display.textContent = formatTimer(remaining);
  }

  function updatePomodoroDisplay() {
    pm.display.textContent = formatTimer(pm.remainingMs);
    var statusLabel = pm.isWork ? t('tool.stopwatchTimer.pomodoroWork') : t('tool.stopwatchTimer.pomodoroBreak');
    pm.status.textContent = statusLabel + ' \u2014 ' + formatTimer(pm.isWork ? POMODORO_WORK_MS : POMODORO_BREAK_MS);
  }

  function resetPomodoro() {
    pm.running = false;
    pm.isWork = true;
    pm.remainingMs = POMODORO_WORK_MS;
    pm.sessions = 0;
    pm.totalWorkMs = 0;
    clearInterval(pm.intervalId);
    pm.btnStart.textContent = t('tool.stopwatchTimer.start');
    pm.btnReset.disabled = true;
    pm.sessionsEl.textContent = '0';
    pm.totalTimeEl.textContent = '0 ' + t('tool.stopwatchTimer.minutes').toLowerCase();
    updatePomodoroDisplay();
  }

  /* ===== Visibility change (background tab drift) ============ */
  function initVisibility() {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        if (sw.running) tickStopwatch();
        if (tm.running) tickTimer();
        if (pm.running) tickPomodoro();
      }
    });
  }
})();
