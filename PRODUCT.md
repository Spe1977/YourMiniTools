# Product

## Register

product

## Users

Chiunque abbia bisogno di uno strumento rapido: studenti, professionisti, utenti occasionali, sviluppatori. Nessuna registrazione, nessuna barriera. L'utente arriva con un compito specifico (generare una password, convertire un'immagine, calcolare un prestito), lo completa in pochi secondi e se ne va. Il contesto è misto: lavoro, studio, uso personale, spesso da mobile.

## Product Purpose

YourMiniTools è una suite di 12 micro-tool gratuiti, privacy-first, che girano interamente nel browser. Nessun dato lascia il dispositivo (unica eccezione: i tassi di cambio BCE via Frankfurter API). Il sito è già operativo su www.yourminitools.com, deployato su Cloudflare Pages. Il successo si misura in velocità di completamento del task, fiducia nella privacy e piacere nell'uso.

## Brand Personality

Moderno, accattivante, fluido.

Il sito deve comunicare velocità e affidabilità, ma anche cura estetica. Non un tool "brutto ma funzionale": un tool che ti fa piacere usare. Sfumature, transizioni morbide e micro-interazioni danno vita all'interfaccia senza rallentarla.

## Anti-references

- Niente look datato o "sito anni 2010" con bordi pesanti, ombre eccessive e layout piatti.
- Niente estetica corporate/aziendale fredda e anonima.
- Niente effetti esagerati o circensi che distraggono dal task. Il movimento è al servizio della chiarezza, non dello spettacolo.
- Niente interfacce sovraccariche: ogni tool fa una cosa, e bene.
- Niente "SaaS template" generici con card identiche, icone arrotondate e gradiente viola-blu ovunque.

## Design Principles

1. **Speed is respect.** Ogni interazione deve sentirsi istantanea. Il design non deve mai aggiungere latenza percepita. Zero framework pesanti, zero animazioni bloccanti.
2. **Delight without distraction.** Sfumature di colore, hover con personalità, transizioni fluide tra pagine e stati. Ma il tool resta il protagonista, mai il contorno.
3. **Privacy you can see.** L'estetica riflette la filosofia: pulito, trasparente, niente di nascosto. L'utente sente che il sito non ha secondi fini.
4. **One task, done well.** Ogni tool è una superficie focalizzata. L'utente non si perde, non cerca, non indovina. Arriva, usa, esce soddisfatto.
5. **Dark and light, both first-class.** Il tema chiaro e scuro non sono uno "il default" e l'altro "l'adattamento". Entrambi devono essere progettati con la stessa cura e coerenza visiva.

## Accessibility & Inclusion

- WCAG 2.2 AA (livello attuale, da mantenere).
- `prefers-reduced-motion` rispettato: tutte le animazioni si disattivano.
- `prefers-color-scheme` come default, con override manuale via toggle.
- Touch target minimo 44×44px (già implementato).
- Focus-visible con outline chiaro e mai oscurato dall'header fisso.
- i18n attivo: EN, IT, ES. Russo e Cinese pianificati.
