# Adeguamento Modern Web Guidance (MWG) — YourMiniTools

> **Data audit**: 2026-11-12  
> **Scope**: Verifica di conformità del progetto rispetto alle linee guida **Modern Web Guidance** (HTML, CSS, Accessibilità, Dark Mode, Form, Sicurezza, Performance, Pattern UI).  
> **Vincoli di progetto**: Nessuna modifica a `PRODUCT.md`, `README.md`, `assets/js/vendor/*`, `assets/img/*`, `assets/fonts/*`. Preservare l'identità visiva v2.0.0 *Soft Pastel Flat Modern* e la copertura delle 6 suite di test esistenti.

---

## Sintesi dei punti di forza già presenti

- **Semantica e struttura base**: HTML5 pulito (`<main>`, `<header>`, `<nav>`, `<footer>`, skip link), gerarchia heading complessivamente ordinata, font `InterVariable.woff2` self-hosted con `font-display: swap`.
- **Privacy e sicurezza**: Zero tracking cookie, zero dipendenze CDN runtime obbligatorie per la UI core, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` e `Permissions-Policy` configurati in `_headers`.
- **Accessibilità base**: Supporto `aria-live`, validazione client-side strutturata, controlli di contrasto WCAG 2.2 AA verificati tramite Axe nei test automatici.

---

## Priorità Alta — Accessibilità, Semantica e Dark Mode

### 1. Dark Mode: `color-scheme`, prevenzione FOUC e modello a 3 stati — **[COMPLETATO 2026-11-12]**
**Guide di riferimento**: `dark-mode`, `dark-mode-toggle`

- **Interventi applicati**:
  1. Aggiunto `<meta name="color-scheme" content="light dark">` subito dopo `<meta name="viewport">` in tutte le 16 pagine HTML (`index.html`, `about.html`, `privacy.html`, `404.html`, `tools/*.html`), rimuovendo l'attributo vuoto `data-theme=""`.
  2. Aggiunto `color-scheme: light dark` su `:root`, `color-scheme: dark` su `[data-theme="dark"]` e `color-scheme: light` su `[data-theme="light"]` in `assets/css/global.css`.
  3. Inserito uno snippet sincrono minimale anti-FOUC nel `<head>` delle 16 pagine HTML compatibile con `script-src 'self' 'unsafe-inline'` in `_headers` (AdSense invariato), che sincronizza `data-theme` e `<meta name="color-scheme">` prima del primo paint.
  4. Aggiornato `assets/js/global.js` al modello a 3 stati (`system` / `light` / `dark`) con rimozione di `ymt-theme` al ritorno alla preferenza OS, listener `window.addEventListener('storage', ...)` multi-tab e label testuali accessibili attive (`common.switchToDark` / `common.switchToLight` in `en/it/es.json`, opzione inattiva nascosta via CSS `display: none`).

---

### 2. Indicatori di focus rimossi e supporto Forced Colors Mode — **[COMPLETATO 2026-11-12]**
**Guide di riferimento**: `accessibility`, `color`, `tabs`

- **Interventi applicati**:
  1. Rimosso `outline: none` dai controlli form e range slider in `assets/css/tools.css`, sostituendolo su `:focus-visible` con `outline: 2px solid transparent; outline-offset: 2px;` (e `outline: 3px solid var(--accent-ring)` su `.form-range:focus-visible` e `.file-drop:has(input[type="file"]:focus-visible)`).
  2. Aggiunte sezioni `@media (forced-colors: active)` in `assets/css/global.css` e `assets/css/tools.css` (`Highlight` sui focus ring, bordi `CanvasText` su card/pulsanti/input/output, `appearance: auto` sulle `<select>`, `forced-color-adjust: none` sugli swatch colore).
  3. Aggiunto indicatore strutturale non basato sul solo colore su `.tool-tab[aria-selected="true"]::after` (`border-block-end: 2px solid currentColor`), e calibrato il contrasto WCAG 2.2 AA dei tab (`color-mix` / `--accent-strong`) per light e dark mode.

---

### 3. Pattern interattivi custom: Tabs, File Drop Zone e Output copiabili — **[COMPLETATO 2026-11-12]**
**Guide di riferimento**: `html`, `accessibility`, `tabs`, `copy-button`

- **Interventi applicati**:
  1. **Tabs** (`tools/stopwatch-timer.html`, `tools/color-tool.html` + `YMT.initTabs` in `assets/js/global.js`): aggiunta navigazione da tastiera (`ArrowLeft`, `ArrowRight`, `Home`, `End`) con `tabindex` roving (`"0"` / `"-1"`), rimosso `aria-controls` superfluo, sostituito `data-active="true"` con l'attributo HTML nativo `hidden` fin dal markup iniziale (supportato anche da `[hidden] { display: none !important; }` in `assets/css/global.css`).
  2. **File Drop Zone** (`tools/image-converter.html`, `tools/color-tool.html`, `tools/word-counter.html`, `tools/text-case-converter.html` e rispettivi JS): convertiti i `<div class="file-drop">` in `<label class="file-drop" for="...">` nativi (senza `<p>` dentro `<label>`, e con `fileInput.disabled` durante `isConverting` in `image-converter.js`), sostituendo `clip: rect(0, 0, 0, 0)` in `.file-drop input[type="file"]` e `.sr-only` con `clip-path: inset(50%)`.
  3. **Output copiabili** (`tools/password-generator.html`, `tools/unit-converter.html`, `tools/currency-converter.html`, `assets/js/tools/world-clock.js`): separata l'area informativa `role="status"` dai pulsanti `<button type="button">` nativi dedicati alla copia (`#pw-copy`, `#uc-copy`, `#cc-copy`, `.wc-copy-btn`), rimuovendo `.tool-output-copyable`, `<div role="button">` e i gestori `keydown` su `Space`.

---

### 4. SVG decorativi senza `aria-hidden="true"`, `<label>` orfane e salto di heading — **[COMPLETATO 2026-11-12]**
**Guide di riferimento**: `html`, `accessibility`

- **Interventi applicati**:
  1. Aggiunto `aria-hidden="true"` a tutti gli `<svg>` decorativi nei tool HTML (`.tool-back-home svg`, `.file-drop-icon`, `.tool-banner-icon`, `.btn-swap svg` in tutte le 12 pagine `tools/*.html`) e alle icone SVG in `assets/js/global.js` (`ICONS`). Note: le icone della griglia in `index.html` erano già racchiuse in `<span aria-hidden="true">`.
  2. Convertite in `<span>` semantici le 4 `<label class="form-label">` orfane in `tools/password-generator.html`, `tools/unit-converter.html`, `tools/word-counter.html` e `tools/text-case-converter.html`.
  3. Corretto `<h3 class="tool-section-title">` in `<h2 class="tool-section-title">` in `tools/stopwatch-timer.html`.

---

## Priorità Media — CSS Moderno, Form, Validazione e Notifiche

### 5. Architettura CSS, `prefers-reduced-motion`, tipografia e proprietà logiche — **[COMPLETATO 2026-11-12]**
**Guide di riferimento**: `css`, `motion`, `typography`, `css-layout`, `responsive-design`

- **Interventi applicati**:
  1. Organizzati `assets/css/global.css` e `assets/css/tools.css` con `@layer reset, tokens, base, components, utilities;` (spostando `@media (forced-colors: active)` in `@layer utilities`), sostituendo il reset universale `margin: 0; padding: 0` su `*` con reset mirati per elemento e mantenendo `box-sizing: border-box` e `[hidden] { display: none !important; }` in `@layer reset`.
  2. Migrate le animazioni e transizioni di movimento (`transform`, `scroll-behavior: smooth`, `width` su progress/strength bar, `inset-block-start` su `.skip-link`, `translateX` su toast) in blocchi `@media (prefers-reduced-motion: no-preference)` sui singoli selettori (e rispettato `prefers-reduced-motion` nello scroll-to-top in `assets/js/global.js`), eliminando i blocchi globali `* { transition-duration: 0.01ms !important }` e gli override in `prefers-reduced-motion: reduce`.
  3. Rimosso `font-size: 16px` fisso su `body` per rispettare la dimensione tipografica configurata dall'utente (`1rem` di base).
  4. Sostituito `100vw` in `.notification-container` con `calc(100% - 2 * var(--spacing-md))` ed estesa l'adozione di proprietà logiche CSS (`margin-block*`, `margin-inline*`, `padding-block*`, `padding-inline*`, `inset-block-*`, `inset-inline-*`, `border-block-*`, `border-inline-start`, `inline-size`, `block-size`, `min-block-size`, `min-inline-size`, `max-inline-size`, `max-block-size`, `scroll-margin-block-start`, `text-align: start`) in `global.css` e `tools.css`.

---

### 6. Touch target, form controls, validazione e theming nativo — **[COMPLETATO 2026-11-12]**
**Guide di riferimento**: `forms`, `browser-ui-theming`, `accessibility`

- **Interventi applicati**:
  1. Portata l'area interattiva minima ad almeno `44px × 44px` su `.lang-select` (incluso `< 480px`), `.notification-close` (con margini negativi compensati nel toast), `.btn-sm`, `.form-check` e `.color-swatch` (oltre a `.theme-toggle`, `.tool-tab` e `.tool-back-home`).
  2. Rimosso `user-select: none` da `.form-check` in `assets/css/tools.css`.
  3. Aggiunti attributi `autocomplete` (`tel`, `email`, `name`, `organization`, più `autocapitalize="none"` sui campi email) in `tools/qr-generator.html`.
  4. Sostituito `type="number"` con `type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" spellcheck="false"` sugli input discreti in `tools/stopwatch-timer.html` (aggiungendo anche `validation.js`) e `tools/color-tool.html`, introducendo gli helper condivisi `YMT.parseDiscreteNumber` e `YMT.normalizeDiscreteInput` in `assets/js/core/validation.js` e integrandoli in `assets/js/tools/stopwatch-timer.js` e `assets/js/tools/color-tool.js` (normalizzazione coerente di virgole, punti, stati vuoti, whitespace e clamping su `change`/`blur`).
  5. Aggiornato `assets/js/core/validation.js` (`showFieldError`, `clearFieldError`, `getErrorElement`): rimosso `role="alert"` e passato a `aria-live="polite"`, preservati senza sovrascritture o duplicazioni gli ID preesistenti in `aria-describedby` (rimuovendo solo l'ID dell'errore al clear) e aggiunto stile `:user-invalid` combinato con `[aria-invalid="true"]` su `:is(.form-input, .form-select, .form-textarea)` in `assets/css/tools.css`.
  6. Configurato `scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track)` e `scrollbar-width: auto` su `:root` in `assets/css/global.css` con token adattivi chiaro/scuro (contrasto ≥ 3:1), varianti `@media (prefers-contrast: more)` e fallback `@supports not (scrollbar-color: auto)`.

---

### 7. Toast Notifications con `popover="manual"` — **[COMPLETATO 2026-11-12]**
**Guide di riferimento**: `persistent-toast-notifications`

- **Interventi applicati**:
  1. Inizializzato al caricamento della pagina il container `.notification-container` in `assets/js/core/notifications.js` con `role="region"`, `aria-live="polite"`, `aria-relevant="additions text"`, `data-i18n-aria="common.notificationsRegion"` e `aria-label` localizzato (`common.notificationsRegion` in `assets/i18n/{en,it,es}.json`, aggiornato dinamicamente su `languagechange`).
  2. Migrati i toast a `popover="manual"` (`showPopover()`) con posizionamento nel Top Layer (`--toast-offset` per lo stacking verticale multi-toast), pulsante di chiusura nativo `popovertarget`/`popovertargetaction="hide"` (touch target ≥ 44×44px, icona `\u00d7` con `aria-hidden="true"`), entry/exit Top Layer con `@starting-style` + `transition-behavior: allow-discrete` (e fallback `[data-closing]` + `getAnimations()` / non-popover).
  3. Aggiunta pausa del timer di auto-chiusura su `mouseenter` e `focusin` interni al toast (riprendendo con margine minimo di 1s solo all'uscita di hover e focus) e ripristino automatico del focus al toast successivo o al controllo precedente in caso di chiusura di un toast focalizzato.

---

## Priorità Bassa — Sicurezza Avanzata e Modernizzazione MPA

### 8. Content Security Policy (CSP) e Isolation Headers [COMPLETATO 2026-11-12]
**Guide di riferimento**: `security`

- **Problema osservato** in `_headers:8`:
  - La CSP usa `'unsafe-inline'` in `script-src` e `style-src` (legato all'integrazione Google AdSense) e allowlist basate su domini senza `'nonce-...'`, `'strict-dynamic'` o `'report-sample'`.
  - `base-uri` è impostato a `'self'` anziché `'none'`.
  - Mancano gli header `Reporting-Endpoints` / `report-to`, `Cross-Origin-Opener-Policy: same-origin-allow-popups` e `Cross-Origin-Resource-Policy: same-origin` per i documenti e gli asset interni.
- **Modifiche applicate**:
  1. Aggiornato `_headers` con `base-uri 'none'`, `'report-sample'` in `script-src` e `style-src`, direttiva `report-to csp-endpoint` e header `Reporting-Endpoints: default="https://yourminitools.com/csp-reports", csp-endpoint="https://yourminitools.com/csp-reports"` (endpoint first-party compatibili con W3C Reporting API senza telemetria verso terze parti).
  2. Aggiunti su `/*` gli header `Cross-Origin-Opener-Policy: same-origin-allow-popups` e `Cross-Origin-Resource-Policy: same-origin` (senza `Cross-Origin-Embedder-Policy: require-corp`), preservando la compatibilità con Google AdSense, Funding Choices, Cloudflare Insights e le chiamate CORS a `https://api.frankfurter.dev`.
  3. Calcolati, documentati nei commenti di `_headers` e verificati in `tests/test_suite.py` gli hash SHA-256 deterministici dei due script inline statici: snippet sincrono anti-FOUC su tutte le 16 pagine (`'sha256-k+EOialR44/Efq5ibwlirHBGDx6k2kT+9HpaF1SeMMM='`) e `<script type="speculationrules">` in `index.html` (`'sha256-KM+aHNSIZeRMusQ4pM/uV4QCA+c0SI0hHn6cU/GSnTA='`). **Limite strutturale documentato**: aggiungere `'sha256-...'` o `'strict-dynamic'` in `script-src` porta i browser CSP Level 2/3 a ignorare `'unsafe-inline'`, bloccando gli script/stili inline iniettati dinamicamente da Google AdSense (`adsbygoogle.js`) e Funding Choices su hosting statico Cloudflare Pages privo di nonce dinamici lato server/Worker; `'unsafe-inline'` rimane quindi necessario finché AdSense/Funding Choices sono attivi senza edge Worker.

---

### 9. UX MPA, Preload Speculativo e Scroll State [COMPLETATO 2026-11-12]
**Guide di riferimento**: `cross-document-transitions`, `improve-next-page-load-performance`, `scroll-position-aware-elements`, `performance`

- **Modifiche applicate**:
  1. **Cross-document View Transitions**: integrato `@view-transition { navigation: auto; }` all'interno di `@layer base` → `@media (prefers-reduced-motion: no-preference)` in `assets/css/global.css` per transizioni native multi-page senza JS aggiuntivo.
  2. **Speculation Rules**: aggiunto `<script type="speculationrules">` (`prefetch`, `where` su `href_matches: "/tools/*"` e `selector_matches: ".tool-card"`, `eagerness: "moderate"`) in `index.html`, compatibile con HTMLHint e CSP.
  3. **Bundle/Minificazione CSS**: introdotto lo script Node ESM zero-dipendenze `scripts/build-prod.mjs` (output deployabile Cloudflare Pages in `dist/`, ignorato in `.gitignore`), che genera versioni minificate di `assets/css/global.css` e `assets/css/tools.css` agli stessi URL `/assets/css/*.css`, preservando i sorgenti leggibili e il passaggio di `npx stylelint "assets/css/*.css"`.
  4. **Back-to-top dichiarativo**: aggiunta in `assets/css/global.css` la progressive enhancement protetta da `@supports (container-type: scroll-state)` (`html { container-type: scroll-state; }` e `@container scroll-state(scrollable: top)` su `.back-to-top`, con trasformazione in `@media (prefers-reduced-motion: no-preference)`), e aggiornato `assets/js/global.js` con feature detection `CSS.supports('container-type', 'scroll-state')` mantenendo il fallback JS passivo (listener `scroll` con `requestAnimationFrame` + gestione `prefers-reduced-motion`) per i browser non supportati.

---

## Piano operativo suggerito

1. **[COMPLETATO 2026-11-12] Priorità Alta — Accessibilità, Semantica Core & Dark Mode (punti 1–4)**: `<meta name="color-scheme">`, `color-scheme` CSS, script sincrono anti-FOUC + `toggleTheme()` a 3 stati e sync `storage`; rimozione `outline: none` + `forced-colors` + indicatore strutturale tab attivo; refactor accessibile per Tabs, Drop Zone e Copy Buttons; SVG `aria-hidden="true"`, `<label>` orfane e heading `<h2>`.
2. **[COMPLETATO 2026-11-12] Priorità Media (punti 5–7)**: `@layer`, opt-in `prefers-reduced-motion: no-preference`, rimozione `font-size: 16px` su `body`, proprietà logiche e rimozione `100vw`, touch target ≥ 44px, `user-select` su `.form-check`, `autocomplete` e `inputmode="numeric"` normalizzati, `scrollbar-color`, `validation.js` (`aria-live="polite"`, `aria-describedby` incrementale, `:user-invalid`) e toast `popover="manual"`.
3. **[COMPLETATO 2026-11-12] Priorità Bassa (punti 8–9)**: hardening `_headers` (`base-uri 'none'`, `'report-sample'`, `Reporting-Endpoints`, `report-to`, COOP/CORP e documentazione limiti hash CSP con AdSense/static hosting), `@view-transition`, `<script type="speculationrules">`, minificazione CSS in `scripts/build-prod.mjs` (`dist/`) e `.back-to-top` con `@container scroll-state(scrollable: top)` + fallback JS.
4. **[COMPLETATO 2026-11-12] Verifica finale**: calibrazione contrasto WCAG 2.2 AA (`--color-primary`, `--color-primary-text`, `--color-text-muted` e valutazione per-tool di `--accent-soft` / `--accent-strong` chiaro/scuro in `global.css` e `tools.css`), riesecuzione di tutte e 6 le suite automatiche (`tests/run_all_verifications.sh`, inclusa copertura a11y 16/16 pagine in modalità chiara e scura) e validazione live su build `dist/` tramite server HTTP locale con clean URL e header di `_headers` (0 errori console/JS/CSP su tutte le 16 route in Chromium headless).
