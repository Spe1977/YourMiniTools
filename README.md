# YourMiniTools

Free, privacy-first browser tools. No registration, no tracking, no server processing.

## Tools

1. **Password Generator** — Secure passwords via `crypto.getRandomValues()`
2. **Image Converter** — JPG/PNG/WebP conversion with batch support
3. **Unit Converter** — Length, weight, temperature, volume, area, speed, data
4. **World Clock** — 41 cities across 5 continents with live updates
5. **Word Counter** — Words, characters, sentences, reading time
6. **Text Case Converter** — UPPER, lower, Title, Sentence, aLtErNaTe
7. **QR Code Generator** — URL, text, phone, email, Wi-Fi, vCard
8. **Loan Calculator** — Amortization table with PDF/TXT/MD export
9. **Social Font Converter** — 8 Unicode decorative styles for social media
10. **Stopwatch & Timer** — Stopwatch, countdown, Pomodoro
11. **Color Tool** — HEX/RGB/HSL picker + image color sampling
12. **Currency Converter** — 31 currencies via ECB rates (Frankfurter API)

## Tech Stack

- Vanilla HTML5 + CSS3 + ES6+ JavaScript — no framework, no bundler
- Static MPA, directly deployable to Cloudflare Pages
- Dark mode with system preference detection
- i18n: English, Italian, Spanish (Russian & Chinese planned)
- WCAG 2.2 AA accessible
- CSP strict: no `unsafe-inline`, no `eval`
- Lighthouse: 96-100 all categories

## Privacy

All processing happens in the browser. The only external API call is to [Frankfurter](https://www.frankfurter.dev/) for ECB exchange rates (no API key, no user data transmitted).

## License

All rights reserved.
