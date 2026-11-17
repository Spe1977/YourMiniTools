# AGENT_HANDOFF.md

## Project: YourMiniTools

- **Path**: `/home/leospe1977/PROGETTI/PROGETTI COMPLETI/YourMiniTools`
- **Stack**: Vanilla HTML5, CSS3, ES6+ JavaScript, Cloudflare Pages MPA
- **Language Mode**: `it` (Italian)
- **Last Updated**: 2026-11-17T22:42:17+01:00

---

## File ownership

### agent-owned
- MWG.md: Gemini — Audit e piano di adeguamento Modern Web Guidance
- prompt.md: Gemini — Prompt ottimizzato (R-O-C-V-F) per debug completo e audit multi-skill
- assets/js/*: Gemini — Core logic, tool scripts, utilities
- assets/css/*: Gemini — Design system tokens and tool styles (v2.0.0 Pastel Modern)
- assets/i18n/*: Gemini — Translation dictionaries (EN, IT, ES)
- _headers: Gemini — Security headers and caching policies
- index.html: Gemini — Homepage HTML and speculation rules
- tools/*: Gemini — Tool HTML pages
- scripts/*: Gemini — Production build and CSS minification scripts
- .gitignore: Gemini — Ignore generated output directories (dist/)
- tests/*: Gemini — Automated unit, property, E2E, and accessibility test suites
- update.md: Gemini — Roadmap of future improvements and test strategies
- eslint.config.js: Gemini — Linter configuration
- .stylelintrc.json: Gemini — CSS linter configuration
- graphify-out/*: Gemini — Project Knowledge Graph and navigation artifacts

### user-reserved
- PRODUCT.md: User — Product specification and brand guidelines
- README.md: User — Main project documentation

### frozen
- assets/fonts/*: Protected — Self-hosted font assets (InterVariable.woff2)
- assets/js/vendor/*: Protected — Third-party vendor libraries (jspdf.umd.min.js, qrcode.min.js)
- assets/img/favicons/*: Protected — App favicons and touch icons
- assets/img/og/*: Protected — Social graph images

---

## Current Status

- **Status**: full-debug-hardening-completed
- **Debug completo end-to-end (`prompt.md`)**: Completato audit multi-dimensionale con fix root-cause in TDD (test `RED` -> fix `GREEN` -> refactor sicuro) su HTML, CSS, dizionari i18n, core JS e tutti i 12 tool senza aggiungere feature extra rispetto alla roadmap:
  - **Core JS & i18n**: [`assets/js/core/i18n.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/core/i18n.js) (guardia anti-race `requestSeq` su `setLocale`/`init` con rollback `localStorage`/`<select>` su errore rete, replacer funzionale sicuro per `$` in `t()`, rilevamento `data-page-name="404"` e trailing slash su route clean, traduzione ricorsiva dei nodi `[data-i18n]` dentro `data-i18n-param`), [`assets/js/global.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/global.js) (fallback inglesi pre-idratazione, aggiornamento in-place di header/footer senza perdita focus e senza sovrascrivere label dinamiche nei tool su `languagechange`, guardia in `updatePrivacyContact()`), [`assets/js/core/clipboard.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/core/clipboard.js) (ripristino focus in `fallbackCopy`), [`assets/js/core/notifications.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/core/notifications.js) (letture `offsetHeight` raggruppate prima delle scritture `--toast-offset`, check element visibile/abilitato in `restoreFocusAfterDismiss`), [`assets/js/core/validation.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/core/validation.js) (distinzione `error: true` per immagini illeggibili in `validateImageDimensions`).
  - **Tool JS**: [`currency-converter.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/currency-converter.js) (rimossa valuta dismessa `BGN` da Frankfurter, validazione schema cache, `AbortController` timeout 8s + `fetchSeq`, parsing numerico rigoroso, ripristino da `isManualMode`, sync banner/importi su `languagechange`), [`loan-calculator.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/loan-calculator.js) (parsing stretto e helper condiviso piano ammortamento, colori `var(--accent)`/`var(--color-danger)` sul grafico a torta, sync `languagechange` silenzioso e `resetAll` `aria-label`, cleanup `loadJsPDF`), [`qr-generator.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/qr-generator.js) (validazione colori HEX con `YMT.showFieldError`, pulizia `title` e `alt=""` su `<img>`/`<canvas>`, escaping vCard e virgole WiFi, aggiornamento hint/errori su `languagechange`), [`image-converter.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/image-converter.js) (scarto immagini corrotte `dimResult.error`, lock `#ic-clear`/remove durante conversione + `conversionRunId`/`queueEpoch`, conteggio successi/errori, resize minimo `>= 1px`), [`password-generator.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/password-generator.js) (rimosso `data-i18n` su `#pw-output-display` generato + refresh forza su `languagechange`), [`stopwatch-timer.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/stopwatch-timer.js) (`resume()` `AudioContext`, blocco e validazione input timer, sync bottoni/giri/Pomodoro su `languagechange`), [`text-case-converter.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/text-case-converter.js) (`\p{L}` Unicode su `toSentenceCase`/`toCapitalize`/`toAlternate`, reset `fileInput.value`, sync `languagechange`), [`word-counter.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/word-counter.js) (`formatTime` senza `"1 h 60 min"`, `clearTimeout` e reset `fileInput.value`), [`unit-converter.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/unit-converter.js) (rifiuto suffissi non numerici e `Infinity`), [`color-tool.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/color-tool.js) (validazione HEX/RGB/HSL con `aria-invalid`, guardie canvas `rect.width`/`height`, reset `fileInput.value`, sync swatch `aria-label` su `languagechange`), [`world-clock.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/world-clock.js) (`Intl.DateTimeFormat().formatToParts` + `Date.UTC` per offset fusi orari inclusi quarti d'ora/mezz'ore, messaggio inline persistente in `#wc-clocks` se fetch fallisce), [`social-font-converter.js`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/assets/js/tools/social-font-converter.js) (skip `\t` e sync `languagechange`).
  - **HTML, i18n, CSS WCAG 2.2 AA**: aggiunte 6 chiavi simmetriche (`en/it/es.json`: 5 `page.about.philosophy.*Label` + `tool.qrGenerator.invalidColor`), aggiornati `about.html`, `tools/{color-tool,loan-calculator,qr-generator,world-clock}.html`, calibrati `--color-success-text`/`--color-warning-text`/`--color-danger-text` (light/dark >= 4.5:1), accenti `[data-tool-color]` >= 4.9:1 su `#fff`, `.btn-success`, `.error-code` su `@media (forced-colors: active)`, e aggiunto `--yes` a `npx` in [`tests/run_all_verifications.sh`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/tests/run_all_verifications.sh).
- **Verifiche automatiche & live `dist/`**: HTMLHint 16/16 (0 errori), ESLint 0 errori, Stylelint 0 errori (sorgenti + `dist/assets/css/*.css`), Unit/Property `tests/test_suite.py` 22/22, E2E Chromium `tests/test_e2e.py` 21/21, WCAG 2.2 AA `tests/test_a11y.py` 17/17 (`light` + `dark`, inclusi stati attivi dei tool). Verifica live di `dist/` in Chromium headless su 16 route clean-URL + `_headers` CSP/sicurezza + rotta 404 (1280x900 desktop & 375x812 mobile): 0 overflow, 0 errori locali/JS/console.
- **Note ambientali**: Chrome DevTools MCP (`chrome-devtools-plugin` v0.21.0) continua a esporre solo le skill senza `mcp_config.json`; test headless eseguiti via `agent-browser` + Chromium. Nessuna feature evolutiva da `update.md` è stata introdotta in questo ciclo di bugfix.

---

## Next Steps
- Per pubblicare su Cloudflare Pages con CSS minificato eseguire `node scripts/build-prod.mjs` e deployare `dist/`.
- Se si desidera utilizzare anche **Chrome DevTools MCP** nelle future sessioni `agy`, configurare `"chrome-devtools"` in `~/.gemini/config/mcp_config.json` prima di avviare il CLI.
- Eventuali nuove feature pianificate (SW/PWA, `#qr-copy-image`, `#st-sound-toggle`, scorciatoie tastiera) restano documentate in [`update.md`](file:///home/leospe1977/PROGETTI/PROGETTI%20COMPLETI/YourMiniTools/update.md).
- Rieseguire sempre `bash tests/run_all_verifications.sh` dopo ogni modifica futura.

---

## End Of Shift Block

```text
Agent: Gemini CLI
Date/time: 2026-11-17T22:42:17+01:00
Task: Esecuzione completa del debug & hardening end-to-end descritto in prompt.md (audit multi-skill, TDD RED->GREEN, fix HTML/CSS/i18n/core JS/12 tool JS, rebuild dist/ e verifica live Chromium headless + 6 suite automatiche)
Status: done
Files changed: about.html, tools/color-tool.html, tools/loan-calculator.html, tools/qr-generator.html, tools/world-clock.html, assets/css/global.css, assets/css/tools.css, assets/i18n/en.json, assets/i18n/it.json, assets/i18n/es.json, assets/js/global.js, assets/js/core/i18n.js, assets/js/core/clipboard.js, assets/js/core/notifications.js, assets/js/core/validation.js, assets/js/tools/color-tool.js, assets/js/tools/currency-converter.js, assets/js/tools/image-converter.js, assets/js/tools/loan-calculator.js, assets/js/tools/password-generator.js, assets/js/tools/qr-generator.js, assets/js/tools/social-font-converter.js, assets/js/tools/stopwatch-timer.js, assets/js/tools/text-case-converter.js, assets/js/tools/unit-converter.js, assets/js/tools/word-counter.js, assets/js/tools/world-clock.js, tests/run_all_verifications.sh, tests/test_suite.py, tests/test_e2e.py, tests/test_a11y.py, AGENT_HANDOFF.md
Tests red: None
Tests green: HTMLHint (16/16), ESLint (0 errors), Stylelint (src + dist/assets/css/*.css), Unit/Property test_suite.py (22/22), E2E Browser test_e2e.py (21/21), WCAG 2.2 AA test_a11y.py (17/17 light+dark+active states), live dist/ headless Chromium (16 clean routes, desktop 1280x900 & mobile 375x812, 0 overflows, 0 local/CSP errors)
Open concerns: Nessuno. chrome-devtools MCP resta non configurato in ~/.gemini/config/mcp_config.json (solo skill presenti).
Next agent starts from: Tutti i bug funzionali, accessibilità, i18n, sicurezza e resilienza trovati nell'audit sono risolti e verificati. Procedere con deploy dist/ su Cloudflare Pages oppure implementare le feature future di update.md.
Do not touch: PRODUCT.md, README.md, assets/js/vendor/*, assets/img/favicons/*, assets/img/og/*, assets/fonts/*
```

```text
Agent: Gemini CLI
Date/time: 2026-11-12T20:31:42+01:00
Task: Creazione del file prompt.md con prompt ottimizzato R-O-C-V-F per debug completo multi-skill della codebase e aggiornamento ownership/handoff in AGENT_HANDOFF.md
Status: done
Files changed: prompt.md, AGENT_HANDOFF.md
Tests red: None
Tests green: HTMLHint (16/16), ESLint (0 errors incl. scripts/*.mjs), Stylelint (passed), Unit/Property (20/20), E2E Browser (18/18), WCAG 2.2 AA (16/16 light+dark)
Open concerns: Nessuno.
Next agent starts from: Eseguire il prompt definito in prompt.md per l'audit/debug completo multi-skill (oppure procedere con deploy dist/ / feature di update.md).
Do not touch: PRODUCT.md, README.md, assets/js/vendor/*, assets/img/favicons/*, assets/img/og/*, assets/fonts/*
```

```text
Agent: Gemini CLI
Date/time: 2026-11-12T20:25:18+01:00
Task: Test HTTP locale live su build dist/ (clean URL, _headers CSP/COOP/CORP, fallback 404, Chromium headless su 16/16 route + interazioni tool), spegnimento server temporaneo e riallineamento completo della documentazione (AGENT_HANDOFF.md, MWG.md, update.md)
Status: done
Files changed: AGENT_HANDOFF.md, MWG.md, update.md
Tests red: None
Tests green: HTMLHint (16/16), ESLint (0 errors incl. scripts/*.mjs), Stylelint (passed), Unit/Property (20/20), E2E Browser (18/18), WCAG 2.2 AA (16/16 light+dark), verifica HTTP locale live su dist/ (16/16 clean routes, 0 console/JS/CSP errors)
Open concerns: Nessuno. Nota ambientale: chrome-devtools-plugin v0.21.0 non include mcp_config.json (solo skill); su Arch è presente /usr/bin/chromium (verificato via agent-browser CDP).
Next agent starts from: Tutti i punti MWG 1-9, il tuning WCAG 2.2 AA 16/16 light/dark e il test live su dist/ sono completati; procedere eventualmente con i punti aperti di update.md (1, 3, 4-UI, 5) o con il deploy di dist/.
Do not touch: PRODUCT.md, README.md, assets/js/vendor/*, assets/img/*, assets/fonts/*
```

```text
Agent: Gemini CLI
Date/time: 2026-11-12T20:09:45+01:00
Task: Calibrazione contrasto WCAG 2.2 AA su token CSS light/dark (--color-primary, --color-primary-text, --color-text-muted e --accent-strong/--accent-soft per-tool su [data-tool-color] in global.css/tools.css) ed estensione di tests/test_a11y.py a 16/16 pagine in light + dark mode (32 scansioni axe-core)
Status: done
Files changed: assets/css/global.css, assets/css/tools.css, tests/test_a11y.py, MWG.md, AGENT_HANDOFF.md
Tests red: None
Tests green: HTMLHint (16/16), ESLint (0 errors incl. scripts/*.mjs), Stylelint (passed su sorgenti e CSS minificato dist/), Unit/Property (20/20), E2E Browser (18/18), WCAG 2.2 AA (16/16 pagine in light + dark mode = 32 scansioni, 0 violazioni)
Open concerns: Nessuno. Tutti i 16 documenti HTML e tutti i 12 tool superano WCAG 2.2 AA sia in light sia in dark mode preservando la palette Soft Pastel Flat Modern.
Next agent starts from: Tutti i punti 1-9 di MWG.md e le verifiche WCAG 2.2 AA light/dark 16/16 sono completi; deploy `dist/` tramite `node scripts/build-prod.mjs` o nuove feature.
Do not touch: PRODUCT.md, README.md, assets/js/vendor/*, assets/img/*, assets/fonts/*
```
