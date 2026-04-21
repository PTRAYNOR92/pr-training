import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../..');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.vite']);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

/**
 * AUTH-001 Acceptance Criteria:
 * - Single firebase.js module; all other files import from it.
 * - No duplicate initializeApp() calls.
 *
 * Enforced here as two invariants:
 *  1. apps/web/**.html contains no firebase.initializeApp call — HTML pages
 *     must delegate to src/firebase-compat-init.js (the one compat-SDK init
 *     module) instead of repeating the config inline.
 *  2. Within apps/web/src/, the only files containing an `initializeApp(`
 *     call are firebase.js (modular SDK entry) and firebase-compat-init.js
 *     (compat SDK entry). Any other match means a new duplicate slipped in.
 */
describe('AUTH-001: Firebase is initialised in exactly one place per SDK', () => {
  const allFiles = walk(REPO_ROOT);

  it('no HTML file under apps/web calls firebase.initializeApp', () => {
    const htmlFiles = allFiles.filter(
      (f) => f.endsWith('.html') && relative(REPO_ROOT, f).replace(/\\/g, '/').startsWith('apps/web/'),
    );

    const offenders = [];
    for (const f of htmlFiles) {
      const content = readFileSync(f, 'utf8');
      if (/\binitializeApp\s*\(/.test(content)) {
        offenders.push(relative(REPO_ROOT, f).replace(/\\/g, '/'));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('only firebase.js and firebase-compat-init.js contain initializeApp in apps/web/src', () => {
    const srcFiles = allFiles.filter((f) => {
      const rel = relative(REPO_ROOT, f).replace(/\\/g, '/');
      return rel.startsWith('apps/web/src/') && /\.(js|mjs|ts)$/.test(f);
    });

    const callers = [];
    for (const f of srcFiles) {
      const content = readFileSync(f, 'utf8');
      if (/\binitializeApp\s*\(/.test(content)) {
        callers.push(relative(REPO_ROOT, f).replace(/\\/g, '/'));
      }
    }

    expect(callers.sort()).toEqual(
      ['apps/web/src/firebase-compat-init.js', 'apps/web/src/firebase.js'].sort(),
    );
  });
});
