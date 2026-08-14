# Piano di Aggiornamenti, Ottimizzazioni e Strategia di Testing

Questo documento raccoglie le proposte di evoluzione tecnica e funzionale per la suite **YourMiniTools**, indicando per ciascun intervento l'architettura prevista, i file coinvolti, i **nuovi test da realizzare** e i **test esistenti da aggiornare**.

---

## 📋 Indice delle Migliorie

1. [PWA & Service Worker Offline Caching](#1-pwa--service-worker-offline-caching)
2. [Ottimizzazione Preconnect & DNS-Prefetch](#2-ottimizzazione-preconnect--dns-prefetch)
3. [Copia Diretta del QR Code negli Appunti](#3-copia-diretta-del-qr-code-negli-appunti)
4. [Segnale Acustico Web Audio API per Timer e Pomodoro](#4-segnale-acustico-web-audio-api-per-timer-e-pomodoro)
5. [Scorciatoie da Tastiera Ergonomiche](#5-scorciatoie-da-tastiera-ergonomiche)

---

## 1. PWA & Service Worker Offline Caching

### Descrizione
Attualmente il file `manifest.json` definisce l'applicazione come `standalone`, ma l'assenza di un Service Worker registrato non consente l'installazione nativa su alcuni browser e impedisce l'utilizzo degli strumenti senza connessione internet.

### Implementazione Proposta
- Creare il file `/sw.js` nella root del progetto.
- Implementare una strategia di caching **Stale-While-Revalidate** per gli asset statici (HTML, CSS, JS, immagini e dizionari i18n `/assets/i18n/*.json`) e **Network-First con fallback su cache** per le richieste dati.
- Registrare il Service Worker in `assets/js/global.js` in modalità non bloccante (`window.addEventListener('load', ...)`).
- Aggiungere la regola di caching per `/sw.js` in `_headers` (`Cache-Control: no-cache, no-store, must-revalidate`).

### File Coinvolti
- `sw.js` *(nuovo file)*
- `assets/js/global.js`
- `_headers`
- `manifest.json`

### Impatto sui Test
* **Test Esistenti da Aggiornare**:
  - `tests/test_suite.py`: Aggiungere un assertion in `TestAssetAndHeaderIntegrity` che verifica l'esistenza di `sw.js` nella root e la corretta direttiva di cache `no-cache` in `_headers`.
* **Nuovi Test da Realizzare**:
  - `test_service_worker_registration`: Test E2E in `tests/test_e2e.py` per verificare che `navigator.serviceWorker.controller` risulti attivo dopo il primo caricamento.
  - `test_offline_availability`: Test headless con `agent-browser` / CDP in cui viene simulata la modalità offline (`Network.emulateNetworkConditions({ offline: true })`) e si naviga su tutti i 12 tool per verificare che rispondano con codice 200 dalla cache.

---

## 2. Ottimizzazione Preconnect & DNS-Prefetch

### Descrizione
L'unico tool che effettua chiamate verso un'API esterna è il Convertitore Valute (`https://api.frankfurter.dev`). L'avvio anticipato dell'handshake TLS consente di risparmiare tra 100 e 200 ms alla prima interazione.

### Implementazione Proposta
- Aggiungere nel tag `<head>` di `tools/currency-converter.html`:
  ```html
  <link rel="preconnect" href="https://api.frankfurter.dev" crossorigin>
  <link rel="dns-prefetch" href="https://api.frankfurter.dev">
  ```

### File Coinvolti
- `tools/currency-converter.html`

### Impatto sui Test
* **Test Esistenti da Aggiornare**:
  - `tests/test_suite.py`: Aggiungere un controllo in `TestAssetAndHeaderIntegrity` per validare la presenza e la corretta sintassi dei tag `preconnect` e `dns-prefetch`.
* **Nuovi Test da Realizzare**:
  - Nessun nuovo test dedicato necessario; coperto dall'aggiornamento della suite di integrità.

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
    - Aggiornamento di `TestDomBindings` per includere il nuovo ID `#qr-copy-image`.
    - Verifica della simmetria delle nuove chiavi i18n su `en.json`, `it.json`, `es.json`.
  - `tests/test_e2e.py`:
    - Aggiornamento del test del QR Generator per verificare la presenza e lo stato di abilitazione del nuovo pulsante.
  - `tests/test_a11y.py`:
    - Verifica che il nuovo pulsante soddisfi i requisiti di `aria-label`, contrasto e focus ring WCAG 2.2 AA.
* **Nuovi Test da Realizzare**:
  - `test_qr_clipboard_blob_export`: Test unitario in JS/Python che convalida la corretta generazione del Blob MIME `image/png` e la gestione degli errori di permesso clipboard.

---

## 4. Segnale Acustico Web Audio API per Timer e Pomodoro

### Descrizione
Nel tool Cronometro / Timer (`stopwatch-timer.html`), al completamento del countdown viene visualizzata una notifica a schermo. Se l'utente si trova su un'altra scheda o programma, il completamento del timer rischia di passare inosservato.

### Implementazione Proposta
- Creare un modulo audio leggero basato esclusivamente su `Web Audio API` (`AudioContext` con oscillatore sinusoidale A5 a 880 Hz / inviluppo esponenziale morbido).
- Nessun file audio esterno (MP3/WAV) scaricato, nessun impatto sul payload e piena conformità con le direttive CSP (`media-src 'self'`).
- Inizializzare l'AudioContext a seguito della prima interazione dell'utente (click su "Avvia") per rispettare le policy di autoplay dei browser.
- Aggiungere un toggle accessibile per abilitare/disabilitare l'avviso sonoro (`#st-sound-toggle`).

### File Coinvolti
- `tools/stopwatch-timer.html`
- `assets/js/tools/stopwatch-timer.js`
- `assets/i18n/en.json`, `assets/i18n/it.json`, `assets/i18n/es.json`

### Impatto sui Test
* **Test Esistenti da Aggiornare**:
  - `tests/test_suite.py`: Verifica dei nuovi ID DOM (`#st-sound-toggle`) e delle nuove stringhe i18n per le impostazioni sonore.
  - `tests/test_a11y.py`: Verifica del contrasto e dell'accessibilità dell'interruttore sonoro (stato `aria-pressed` o `aria-checked`).
* **Nuovi Test da Realizzare**:
  - `test_timer_sound_trigger`: Test E2E con timer ridotto (es. 1 secondo) per verificare che la callback di completamento scateni la riproduzione sonora e la notifica toast.

---

## 5. Scorciatoie da Tastiera Ergonomiche

### Descrizione
Per gli utenti che utilizzano intensamente il cronometro, il generatore di password o il convertitore di testo, l'accesso tramite tastiera rapida aumenta la produttività e migliora l'ergonomia d'uso.

### Implementazione Proposta
- **Cronometro / Timer**:
  - `Spazio`: Avvia / Metti in pausa.
  - `L` o `G`: Registra giro (Lap).
  - `R`: Reimposta (Reset con conferma o pressione prolungata).
- **Generatore Password**:
  - `Spazio` o `G` (quando il focus non è in un campo di testo): Genera nuova password.
  - `C`: Copia password generata.
- Disabilitare i listener globali quando il focus si trova all'interno di elementi `<input>`, `<textarea>` o `<select>` modificabili.

### File Coinvolti
- `assets/js/tools/stopwatch-timer.js`
- `assets/js/tools/password-generator.js`
- `assets/js/tools/text-case-converter.js`

### Impatto sui Test
* **Test Esistenti da Aggiornare**:
  - `tests/test_e2e.py`:
    - Aggiornamento dei test interattivi per simulare la pressione dei tasti (`agent-browser press Space`, `agent-browser press KeyL`) e verificare che il timer parta e registri i giri.
* **Nuovi Test da Realizzare**:
  - `test_keyboard_shortcuts_ignored_in_input`: Verifica che la digitazione della barra spaziatrice o di lettere dentro una `<textarea>` (es. Word Counter o Text Case) non attivi scorciatoie globali involontarie.

---

## 📊 Matrice di Riepilogo Test

| Miglioria | Test da Aggiornare | Nuovi Test da Creare |
| :--- | :--- | :--- |
| **1. Service Worker & PWA** | `test_suite.py` (check `sw.js` & headers) | `test_service_worker_registration`, `test_offline_availability` (E2E) |
| **2. Preconnect DNS** | `test_suite.py` (check tag `<head>`) | *Nessuno (incluso in static check)* |
| **3. Copia Immagine QR** | `test_suite.py` (DOM & i18n), `test_e2e.py`, `test_a11y.py` | `test_qr_clipboard_blob_export` |
| **4. Web Audio Timer** | `test_suite.py` (DOM & i18n), `test_a11y.py` | `test_timer_sound_trigger` (E2E) |
| **5. Scorciatoie Tastiera** | `test_e2e.py` | `test_keyboard_shortcuts_ignored_in_input` |
