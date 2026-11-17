# Piano di Aggiornamenti, Ottimizzazioni e Strategia di Testing

Questo documento raccoglie le proposte di evoluzione tecnica e funzionale per la suite **YourMiniTools**, indicando per ciascun intervento l'architettura prevista, i file coinvolti, lo stato attuale nel repository, i **nuovi test da realizzare** e i **test esistenti da aggiornare**.

> **Baseline attuale (2026-11-12)**: Tutti gli interventi di [`MWG.md`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/MWG.md) (Priorità Alta, Media e Bassa 1–9) e la calibrazione WCAG 2.2 AA 16/16 light/dark sono completati; build di produzione CSS minificata tramite `scripts/build-prod.mjs` -> `dist/` (ignorata in `.gitignore`); suite di verifica correnti (`tests/run_all_verifications.sh`): HTMLHint (`16/16`), ESLint (`assets/js/**/*.js` + `scripts/*.mjs`), Stylelint (`assets/css/*.css`), `tests/test_suite.py` (`20` test), `tests/test_e2e.py` (`18` test) e `tests/test_a11y.py` (`16` test in light + dark mode).

---

## 📋 Indice delle Migliorie

1. [PWA & Service Worker Offline Caching *(Aperta)*](#1-pwa--service-worker-offline-caching)
2. [Ottimizzazione Preconnect & DNS-Prefetch *(Già implementata nel markup)*](#2-ottimizzazione-preconnect--dns-prefetch)
3. [Copia Diretta del QR Code negli Appunti *(Aperta)*](#3-copia-diretta-del-qr-code-negli-appunti)
4. [Segnale Acustico Web Audio API per Timer e Pomodoro *(Parzialmente implementata: audio già attivo, manca toggle UI)*](#4-segnale-acustico-web-audio-api-per-timer-e-pomodoro)
5. [Scorciatoie da Tastiera Ergonomiche *(Aperta)*](#5-scorciatoie-da-tastiera-ergonomiche)

---

## 1. PWA & Service Worker Offline Caching

### Descrizione
Attualmente il file `manifest.json` definisce l'applicazione come `standalone`, ma l'assenza di un Service Worker registrato non consente l'installazione nativa su alcuni browser e impedisce l'utilizzo degli strumenti senza connessione internet.

### Implementazione Proposta
- Creare il file `/sw.js` nella root del progetto.
- Implementare una strategia di caching **Stale-While-Revalidate** per gli asset statici (HTML, CSS, JS, immagini e dizionari i18n `/assets/i18n/*.json`) e **Network-First con fallback su cache** per le richieste dati.
- Registrare il Service Worker in `assets/js/global.js` in modalità non bloccante (`window.addEventListener('load', ...)`).
- Aggiungere la regola di caching per `/sw.js` in `_headers` (`Cache-Control: no-cache, no-store, must-revalidate`) e includere `sw.js` in `ROOT_FILES` di `scripts/build-prod.mjs`.

### File Coinvolti
- `sw.js` *(nuovo file)*
- `assets/js/global.js`
- `_headers`
- `manifest.json`
- `scripts/build-prod.mjs`

### Impatto sui Test
* **Test Esistenti da Aggiornare**:
  - `tests/test_suite.py`: Aggiungere un assertion in `TestAssetAndHeaderIntegrity` che verifichi l'esistenza di `sw.js` nella root, la sua copia in `dist/` e la corretta direttiva di cache `no-cache` in `_headers`.
* **Nuovi Test da Realizzare**:
  - `test_service_worker_registration`: Test E2E in `tests/test_e2e.py` per verificare che `navigator.serviceWorker.controller` risulti attivo dopo il primo caricamento.
  - `test_offline_availability`: Test headless con `agent-browser` / CDP in cui viene simulata la modalità offline e si naviga su tutti i 12 tool per verificare che rispondano con codice 200 dalla cache.

---

## 2. Ottimizzazione Preconnect & DNS-Prefetch

### Stato Attuale
**[GIÀ IMPLEMENTATO NEL MARKUP]** — `tools/currency-converter.html` contiene già entrambi i link `<link rel="dns-prefetch" href="https://api.frankfurter.dev">` e `<link rel="preconnect" href="https://api.frankfurter.dev" crossorigin>` nel `<head>`. Resta opzionale il solo controllo di regressione nei test statici.

### Descrizione
L'unico tool che effettua chiamate verso un'API esterna è il Convertitore Valute (`https://api.frankfurter.dev`). L'avvio anticipato dell'handshake TLS consente di risparmiare tra 100 e 200 ms alla prima interazione.

### File Coinvolti
- `tools/currency-converter.html` *(già presente)*

### Impatto sui Test
* **Test Esistenti da Aggiornare**:
  - `tests/test_suite.py`: Eventuale controllo in `TestAssetAndHeaderIntegrity` per evitare regressioni sui tag `preconnect` e `dns-prefetch`.
* **Nuovi Test da Realizzare**:
  - Nessun nuovo test dedicato necessario.

---

## 3. Copia Diretta del QR Code negli Appunti

### Descrizione
Nel generatore QR (`qr-generator.html`), gli utenti attualmente possono solo scaricare l'immagine su disco. L'aggiunta di un'azione rapida per copiare l'immagine PNG generata direttamente negli appunti di sistema velocizza l'incollaggio in documenti di testo, email, WhatsApp Web o software grafici.

### Implementazione Proposta
- Aggiungere un pulsante con icona/testo *"Copia Immagine"* (`#qr-copy-image`) nella sezione risultati di `tools/qr-generator.html`.
- In `assets/js/tools/qr-generator.js`, esportare il canvas come Blob PNG (`canvas.toBlob(...)`) e invocare `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`.
- Prevedere un fallback informativo nel caso in cui il browser dell'utente non supporti la scrittura di immagini negli appunti.
- Aggiungere le rispettive chiavi nei dizionari i18n (`tool.qrGenerator.btnCopyImage`, `tool.qrGenerator.copiedSuccess`, `tool.qrGenerator.copiedError`).

### File Coinvolti
- `tools/qr-generator.html`
- `assets/js/tools/qr-generator.js`
- `assets/i18n/en.json`, `assets/i18n/it.json`, `assets/i18n/es.json`

### Impatto sui Test
* **Test Esistenti da Aggiornare**:
  - `tests/test_suite.py`:
    - Aggiornamento di `TestDomBindings` per includere il nuovo ID `#qr-copy-image` (la simmetria delle chiavi i18n statiche in HTML/JS è già coperta da `TestI18nIntegrity`).
  - `tests/test_e2e.py`:
    - Estendere `test_18_remaining_tools_e2e` (QR generator) per verificare la presenza e lo stato di abilitazione del nuovo pulsante.
  - `tests/test_a11y.py`:
    - `test_a11y_qr_generator` verifica già il contrasto WCAG 2.2 AA (light + dark) della pagina.
* **Nuovi Test da Realizzare**:
  - `test_qr_clipboard_blob_export`: Test unitario/E2E che convalida la corretta generazione del Blob MIME `image/png` e la gestione degli errori di permesso clipboard.

---

## 4. Segnale Acustico Web Audio API per Timer e Pomodoro

### Stato Attuale
**[PARZIALMENTE IMPLEMENTATO]** — `assets/js/tools/stopwatch-timer.js` implementa già il motore Web Audio (`ensureAudioCtx()`, `playBeep(880 Hz sine)`, `playAlarm()`) nel rispetto della CSP (`media-src 'self'`). Resta aperta solo l'aggiunta di un controllo UI opzionale per attivare/disattivare l'audio (`#st-sound-toggle`) con relative traduzioni e test.

### Intervento Residuo Proposto
- Aggiungere un toggle accessibile (`aria-pressed` o checkbox/switch con target ≥ 44×44 px) per abilitare/disabilitare l'avviso sonoro (`#st-sound-toggle`) in `tools/stopwatch-timer.html` e collegarlo a `assets/js/tools/stopwatch-timer.js`.
- Aggiungere le chiavi i18n dedicate in `assets/i18n/{en,it,es}.json`.

### File Coinvolti
- `tools/stopwatch-timer.html`
- `assets/js/tools/stopwatch-timer.js`
- `assets/i18n/en.json`, `assets/i18n/it.json`, `assets/i18n/es.json`

### Impatto sui Test
* **Test Esistenti da Aggiornare**:
  - `tests/test_suite.py`: Verifica del nuovo ID DOM (`#st-sound-toggle`) e della simmetria delle nuove stringhe i18n.
  - `tests/test_a11y.py`: Verifica automatica (light + dark) del contrasto e dell'accessibilità dell'interruttore sonoro su `test_a11y_stopwatch_timer`.
* **Nuovi Test da Realizzare**:
  - `test_timer_sound_trigger`: Estendere `test_17_stopwatch_timer_tabs_and_keyboard_e2e` o aggiungere un test E2E dedicato per verificare lo stato mute/unmute e la notifica toast al termine del timer.

---

## 5. Scorciatoie da Tastiera Ergonomiche

### Stato Attuale
**[APERTA]** — Attualmente sono presenti handler `keydown` su `Enter` nei campi di `loan-calculator.js` e `currency-converter.js`, oltre alla navigazione con frecce sui tab WAI-ARIA in `YMT.initTabs` (`assets/js/global.js`). Non esistono ancora scorciatoie globali di pagina.

### Implementazione Proposta
- **Cronometro / Timer**:
  - `Spazio`: Avvia / Metti in pausa.
  - `L` o `G`: Registra giro (Lap).
  - `R`: Reimposta (Reset con conferma o pressione prolungata).
- **Generatore Password**:
  - `Spazio` o `G` (quando il focus non è in un campo di testo o controllo interattivo): Genera nuova password.
  - `C`: Copia password generata.
- Disabilitare i listener globali quando il focus si trova all'interno di elementi `<input>`, `<textarea>`, `<select>`, `<button>` o `[contenteditable]`, evitando conflitti con `Enter`/`Space` nativi dei bottoni e dei controlli WAI-ARIA.

### File Coinvolti
- `assets/js/tools/stopwatch-timer.js`
- `assets/js/tools/password-generator.js`
- `assets/js/tools/text-case-converter.js`

### Impatto sui Test
* **Test Esistenti da Aggiornare**:
  - `tests/test_e2e.py`:
    - Estendere `test_17_stopwatch_timer_tabs_and_keyboard_e2e` e `test_04_password_generator_e2e` simulando `agent-browser press Space` / `KeyL` e verificando la registrazione dei giri.
* **Nuovi Test da Realizzare**:
  - `test_keyboard_shortcuts_ignored_in_input`: Verifica che la digitazione della barra spaziatrice o di lettere dentro una `<textarea>` o un campo di testo (es. Word Counter, Text Case o Timer inputs) non attivi scorciatoie globali involontarie.

---

## 📊 Matrice di Riepilogo Test

| Miglioria | Stato | Test da Aggiornare | Nuovi Test da Creare |
| :--- | :--- | :--- | :--- |
| **1. Service Worker & PWA** | Aperta | `test_suite.py` (check `sw.js`, `build-prod.mjs` & `_headers`) | `test_service_worker_registration`, `test_offline_availability` (E2E) |
| **2. Preconnect DNS** | Già implementata | `test_suite.py` (opzionale: check regressione `<head>`) | *Nessuno* |
| **3. Copia Immagine QR** | Aperta | `test_suite.py` (DOM), `test_e2e.py` (`test_18`), `test_a11y.py` | `test_qr_clipboard_blob_export` |
| **4. Web Audio Timer** | Parziale (manca `#st-sound-toggle`) | `test_suite.py` (DOM), `test_a11y.py` | `test_timer_sound_trigger` (E2E) |
| **5. Scorciatoie Tastiera** | Aperta | `test_e2e.py` (`test_04`, `test_17`) | `test_keyboard_shortcuts_ignored_in_input` |
