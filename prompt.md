## ROLE

Agisci come un senior full-stack frontend & web platform debugging engineer specializzato in debugging sistematico, vanilla JavaScript (ES2022 script mode + Node ESM `.mjs`), HTML5 semantico, CSS3 moderno (`@layer`, `@view-transition`, Container Scroll-State Queries, dark mode / anti-FOUC), sicurezza client/edge (CSP Level 3, XSS/DOM injection, COOP/CORP, Cloudflare Pages `_headers`), accessibilità WCAG 2.2 AA e verifica automatica headless.

## OBJECTIVE

Esegui un debug completo, end-to-end e basato su evidenze riproducibili dell'intera codebase di **YourMiniTools**:

1. Individua e riproduci eventuali bug funzionali, edge case non gestiti, race condition, memory/resource leak (timer, listener, `ObjectURL`, Canvas, `AudioContext`), fallback di rete mancanti, errori silenziosi, discrepanze i18n, regressioni CSS/responsive/a11y, vulnerabilità o footgun di sicurezza e difetti nel bundle di produzione `dist/`.

2. Risolvi ogni difetto confermato intervenendo sulla **root cause** (non sui sintomi), applicando il ciclo TDD: prima un test automatico che riproduce il bug (`RED`), poi il fix minimale e pulito (`GREEN`), poi eventuale semplificazione sicura (`REFACTOR`).

3. Verifica integrità dei sorgenti, build `dist/` e passaggio integrale delle 6 suite automatiche con 0 errori e 0 skip.

## CONTEXT

- **Repository**: `/home/leospe1977/PROGETTI/PROGETTI COMPLETI/YourMiniTools`

- **Architettura**: Sito statico MPA (Multi-Page Application) senza framework né `package.json` in root, target Cloudflare Pages (build di produzione in `dist/` generato da `node scripts/build-prod.mjs`).

  - **16 pagine HTML**: `index.html`, `about.html`, `privacy.html`, `404.html` + 12 tool in `tools/` (`color-tool.html`, `currency-converter.html`, `image-converter.html`, `loan-calculator.html`, `password-generator.html`, `qr-generator.html`, `social-font-converter.html`, `stopwatch-timer.html`, `text-case-converter.html`, `unit-converter.html`, `word-counter.html`, `world-clock.html`).

  - **JavaScript**: `assets/js/global.js`, moduli condivisi `assets/js/core/` (`clipboard.js`, `download.js`, `i18n.js`, `notifications.js`, `validation.js`) e 12 moduli `assets/js/tools/*.js` in classic script mode (`sourceType: "script"`, `ecmaVersion: 2022`, namespace `YMT` come configurato in `eslint.config.js`), più `scripts/build-prod.mjs` (`sourceType: "module"`).

  - **CSS, i18n, Dati & Config**: `assets/css/global.css`, `assets/css/tools.css`, `assets/i18n/{en,it,es}.json`, `assets/data/world-timezones.json`, `_headers`, `_redirects`, `manifest.json`, `sitemap.xml`, `robots.txt`.

- **Stato e artefatti**: `AGENT_HANDOFF.md` (source of truth per ownership, lingua `it` e storico handoff), `MWG.md`, `update.md`, `graphify-out/` (knowledge graph preesistente).

- **Pipeline di verifica (`bash tests/run_all_verifications.sh`)**: HTMLHint (`*.html`, `tools/*.html`), ESLint (`assets/js/core/*.js`, `assets/js/tools/*.js`, `assets/js/global.js`, `scripts/*.mjs`), Stylelint (`assets/css/*.css`), `tests/test_suite.py` (unit/static/property), `tests/test_e2e.py` (Chromium headless via `agent-browser`) e `tests/test_a11y.py` (`axe-core` WCAG 2.2 AA su 16/16 pagine light+dark).

## CONSTRAINTS

- **Attivazione obbligatoria `cli-collaboration`** (`/home/leospe1977/.gemini/config/skills/cli-collaboration/SKILL.md`):

  1. Leggi `AGENT_HANDOFF.md` **prima** di interpretare `git status`; verifica la lingua configurata (`bash /home/leospe1977/.gemini/config/skills/cli-collaboration/scripts/lang.sh get`) e controlla l'ownership dei file che intendi toccare (`bash /home/leospe1977/.gemini/config/skills/cli-collaboration/scripts/check-ownership.sh --agent <TuoNomeAgente> ...`).

  2. Stampa esplicitamente il blocco **Start Gate** prima di modificare qualsiasi file; se un nuovo file diventa necessario, dichiaralo prima di crearlo. Se incontri conflitti di ownership con un altro agente, fermati e gestiscili secondo `Conflict Handling`.

  3. Non modificare mai le aree `### user-reserved` e `### frozen`: `PRODUCT.md`, `README.md`, `assets/js/vendor/*`, `assets/img/favicons/*`, `assets/img/og/*`, `assets/fonts/*`.

  4. Al termine della sessione, aggiorna `AGENT_HANDOFF.md` (`Last Updated`, `Current Status`, `Next Steps` e `End Of Shift Block` preservando gli ultimi 3 blocchi dettagliati).

- **Attivazione coordinata delle altre skill necessarie al debug**:

  1. `graphify`: consulta `graphify-out/` (`GRAPH_REPORT.md` / grafo) per mappare dipendenze e nodi critici prima di ispezionare o modificare file condivisi.

  2. `auto-effort`: calibra `Reasoning Effort` (`E0..E3`), `Risk Level` (`R0..R4`), `Orchestration` (`O0..O3`) e `Verification Gates` (`V0..V4`) per ciascun sottosistema o bug individuato.

  3. `debugging-and-error-recovery`: applica la *Stop-the-Line Rule* e la checklist strutturata (Reproduce -\> Isolate -\> Root Cause -\> Fix -\> Guard/Regression Test -\> Verify).

  4. `security-and-hardening`, `sharp-edges` e `differential-review`: esegui threat modeling sui trust boundary (DOM/XSS `innerHTML` vs `textContent`, file/image upload, QR/URL input, `localStorage`/`JSON.parse`, input numerici, `_headers` CSP Level 3/`base-uri`/`Reporting-Endpoints`/COOP/CORP, fetch esterni verso `api.frankfurter.dev`), verificando chiamanti e *blast radius* di ogni fix.

  5. `modern-web-guidance` (via `npx -y modern-web-guidance@latest`): consulta le guide ufficiali prima di modificare codice che tocca pattern moderni (`@view-transition`, `speculationrules`, `@container scroll-state`, Popover API, form validation, cache/fetch resilience).

  6. `test-driven-development`: per ogni difetto riprodotto, aggiungi un test di regressione (`RED -> GREEN`) in `tests/test_suite.py` o `tests/test_e2e.py`.

  7. `agent-browser`, `a11y-debugging` e `.gemini/skills/impeccable` (modalità `audit`, solo lettura/verifica senza alterare il design system; più `browser-testing-with-devtools` / `chrome-devtools` se il server MCP risulta configurato e attivo): esegui audit runtime headless su tutte le 16 pagine sia dai sorgenti sia da `dist/` controllando errori console/`pageerror`/CSP, responsive layout (`375px` e `1280px`), navigazione da tastiera/focus/ARIA, contrasto light/dark, stati limite di tutti i 12 tool e resilienza con rete assente o bloccata verso endpoint terzi.

  8. `code-review-and-quality` e `code-simplification`: esegui la revisione finale a 5 assi (correttezza, leggibilità, architettura, sicurezza, performance) su tutta la diff prodotta.

- **Ambito, integrità tecnica e sicurezza git**:

  1. Resta strettamente nell'ambito di debug e correzione difetti: **non** implementare nuove feature evolutive dalla roadmap di `update.md` (es. PWA/SW o nuovi pulsanti opzionali) salvo stretta necessità per risolvere un bug reale nel codice esistente.

  2. Preserva il design system v2.0.0 *Soft Pastel Flat Modern*, `@layer reset, tokens, base, components, utilities;`, `@media (forced-colors: active)`, gli script AdSense/Funding Choices, lo snippet sincrono anti-FOUC e la simmetria delle chiavi/parametri `{param}` in `assets/i18n/{en,it,es}.json`. Se un bugfix modifica uno script inline coperto da SHA-256 in `_headers`, aggiorna in sincrono l'hash in `_headers`, `MWG.md` e `tests/test_suite.py`.

  3. **Divieto assoluto** di comandi git distruttivi (`git reset --hard`, `git clean`, `git stash`, `git restore`, `git checkout --`).

  4. Riesegui `node scripts/build-prod.mjs` e `bash tests/run_all_verifications.sh` **dopo l'ultima modifica** (inclusi gli aggiornamenti a `AGENT_HANDOFF.md`), assicurandoti che tutte e 6 le suite passino con 0 errori e 0 skip e che eventuali server HTTP temporanei vengano spenti prima della risposta finale.

## FORMAT

1. **Avvio**: stampa il blocco **Start Gate** di `cli-collaboration` e la calibrazione iniziale `auto-effort`.

2. **Piano di esecuzione**:

   - **Fase 1 — Mappa & Baseline**: leggi `AGENT_HANDOFF.md` e `graphify-out/`, genera `dist/` (`node scripts/build-prod.mjs`) ed esegui la baseline `bash tests/run_all_verifications.sh`.

   - **Fase 2 — Audit statico, logico e sicurezza**: verifica sistematicamente `global.js`, `assets/js/core/*.js`, tutti i 12 `assets/js/tools/*.js`, `scripts/build-prod.mjs`, i 16 HTML, `assets/css/*.css`, `assets/i18n/*.json`, `_headers`, `_redirects`, `manifest.json` e `sitemap.xml`.

   - **Fase 3 — Audit dinamico & edge-case runtime**: testa in browser headless flussi reali, input vuoti/estremi/malformati, `localStorage` corrotto, failure/timeout fetch (`api.frankfurter.dev`), cicli start/stop/reset/export, tastiera/focus, light/dark, mobile/desktop sia su root sia su `dist/`.

   - **Fase 4 — Fix TDD & Review**: per ogni bug confermato, scrivi test `RED`, applica il fix alla root cause (`GREEN`), verifica con `differential-review` e `code-review-and-quality`.

   - **Fase 5 — Verifica finale & Handoff**: ricostruisci `dist/`, esegui `bash tests/run_all_verifications.sh` post-edit, verifica assenza di processi/file temporanei residui e aggiorna `AGENT_HANDOFF.md`.

3. **Risposta finale (in italiano, sintetica e verificabile)**:

   - **Elenco finding** per severità (`Critico`, `Alto`, `Medio`, `Basso`, oppure evidenza esplicita dei sottosistemi verificati senza difetti) con link cliccabili `file://` a file/righe, scenario di riproduzione, root cause, fix e test di regressione (`RED -> GREEN`).

   - **File modificati** con link `file://`.

   - **Esito completo post-edit** di `node scripts/build-prod.mjs`, dei controlli live su `dist/` e di tutte e 6 le suite di `tests/run_all_verifications.sh`.

   - **Conferma `cli-collaboration`**: stato dell'aggiornamento di `AGENT_HANDOFF.md` e rispetto delle aree protette.

