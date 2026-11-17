#!/usr/bin/env node
/**
 * YourMiniTools — Zero-Dependency Production Build & CSS Minifier
 *
 * Preserves readable source stylesheets (assets/css/global.css, assets/css/tools.css)
 * in the repository while producing a Cloudflare Pages-ready output directory
 * (default: dist/) with minified CSS at the exact same asset paths.
 *
 * Usage:
 *   node scripts/build-prod.mjs [--out <dir>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const ROOT_FILES = [
  'index.html',
  'about.html',
  'privacy.html',
  '404.html',
  '_headers',
  '_redirects',
  'ads.txt',
  'manifest.json',
  'robots.txt',
  'sitemap.xml',
];

const COPY_DIRS = ['tools', 'assets'];
const MINIFY_CSS_FILES = new Set([
  path.join('assets', 'css', 'global.css'),
  path.join('assets', 'css', 'tools.css'),
]);

function isIdentChar(ch) {
  return /[a-zA-Z0-9_-]/.test(ch);
}

/**
 * Token-aware CSS minifier without external dependencies.
 * Preserves strings, url(...) payloads, calc() operator spacing,
 * and modern CSS at-rules (@layer, @view-transition, @container scroll-state).
 */
export function minifyCss(input) {
  const out = [];
  const len = input.length;
  let i = 0;
  let pendingSpace = false;

  const lastChar = () => (out.length ? out[out.length - 1] : '');
  const pushChar = (ch) => {
    out.push(ch);
  };

  while (i < len) {
    const ch = input[i];

    // Strip /* ... */ comments outside strings
    if (ch === '/' && input[i + 1] === '*') {
      i += 2;
      while (i < len && !(input[i] === '*' && input[i + 1] === '/')) {
        i += 1;
      }
      i += 2;
      if (out.length && isIdentChar(lastChar()) && i < len && isIdentChar(input[i])) {
        pendingSpace = true;
      }
      continue;
    }

    // Preserve quoted strings verbatim
    if (ch === '"' || ch === "'") {
      if (pendingSpace) {
        const prev = lastChar();
        if (prev && !'{};:,('.includes(prev)) {
          pushChar(' ');
        }
        pendingSpace = false;
      }
      const quote = ch;
      pushChar(ch);
      i += 1;
      while (i < len) {
        const c = input[i];
        pushChar(c);
        i += 1;
        if (c === '\\' && i < len) {
          pushChar(input[i]);
          i += 1;
        } else if (c === quote) {
          break;
        }
      }
      continue;
    }

    // Preserve unquoted url(...) verbatim
    if (
      (ch === 'u' || ch === 'U') &&
      input.slice(i, i + 4).toLowerCase() === 'url(' &&
      (i === 0 || !isIdentChar(input[i - 1]))
    ) {
      let j = i + 4;
      while (j < len && /\s/.test(input[j])) j += 1;
      if (input[j] !== '"' && input[j] !== "'") {
        if (pendingSpace) {
          const prev = lastChar();
          if (prev && !'{};:,('.includes(prev)) {
            pushChar(' ');
          }
          pendingSpace = false;
        }
        pushChar('u');
        pushChar('r');
        pushChar('l');
        pushChar('(');
        i = j;
        let urlContent = '';
        while (i < len && input[i] !== ')') {
          urlContent += input[i];
          i += 1;
        }
        for (const uc of urlContent.trim()) {
          pushChar(uc);
        }
        if (i < len && input[i] === ')') {
          pushChar(')');
          i += 1;
        }
        continue;
      }
    }

    // Collapse whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f') {
      pendingSpace = true;
      i += 1;
      continue;
    }

    // Punctuation where preceding space can always be dropped
    if (ch === '{' || ch === '}' || ch === ';' || ch === ',' || ch === ')') {
      pendingSpace = false;
      if (ch === '}' && lastChar() === ';') {
        out.pop();
      }
      pushChar(ch);
      i += 1;
      continue;
    }

    // Space BEFORE ':' can be significant in selectors (e.g. "div :hover"),
    // so only skip space AFTER ':' (handled when pendingSpace evaluates next char).
    if (ch === ':' || ch === '(') {
      if (pendingSpace) {
        const prev = lastChar();
        if (prev && !'{};:,('.includes(prev)) {
          pushChar(' ');
        }
        pendingSpace = false;
      }
      pushChar(ch);
      i += 1;
      continue;
    }

    // Normal character: emit pending space unless preceded by punctuators where trailing space is redundant
    if (pendingSpace) {
      const prev = lastChar();
      if (prev && !'{};:,('.includes(prev)) {
        pushChar(' ');
      }
      pendingSpace = false;
    }

    pushChar(ch);
    i += 1;
  }

  return out.join('').trim() + '\n';
}

function copyTree(srcDir, destDir, relPrefix, stats) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    const relPath = path.join(relPrefix, entry.name);

    if (entry.isDirectory()) {
      copyTree(srcPath, destPath, relPath, stats);
    } else if (entry.isFile()) {
      if (MINIFY_CSS_FILES.has(relPath)) {
        const raw = fs.readFileSync(srcPath, 'utf8');
        const min = minifyCss(raw);
        fs.writeFileSync(destPath, min, 'utf8');
        stats.push({
          file: relPath,
          rawBytes: Buffer.byteLength(raw, 'utf8'),
          minBytes: Buffer.byteLength(min, 'utf8'),
        });
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

export function buildProduction(outDirArg = 'dist') {
  const outDir = path.isAbsolute(outDirArg)
    ? outDirArg
    : path.resolve(ROOT_DIR, outDirArg);

  if (outDir === ROOT_DIR) {
    throw new Error('Output directory must not be the repository root (source files must remain readable).');
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  for (const file of ROOT_FILES) {
    const src = path.join(ROOT_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(outDir, file));
    }
  }

  const cssStats = [];
  for (const dir of COPY_DIRS) {
    const src = path.join(ROOT_DIR, dir);
    if (fs.existsSync(src)) {
      copyTree(src, path.join(outDir, dir), dir, cssStats);
    }
  }

  return { outDir, cssStats };
}

function parseOutArg(argv) {
  const idx = argv.indexOf('--out');
  if (idx !== -1 && argv[idx + 1]) {
    return argv[idx + 1];
  }
  return 'dist';
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const outArg = parseOutArg(process.argv.slice(2));
  const { outDir, cssStats } = buildProduction(outArg);
  const rel = path.relative(ROOT_DIR, outDir);
  const displayOut = rel && !rel.startsWith('..') ? rel : outDir;
  console.log(`Built production bundle in ${displayOut}`);
  for (const item of cssStats) {
    const pct = (((item.rawBytes - item.minBytes) / item.rawBytes) * 100).toFixed(1);
    console.log(`  ${item.file}: ${item.rawBytes} B -> ${item.minBytes} B (-${pct}%)`);
  }
}
