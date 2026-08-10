import { describe, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../..');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.vite']);
const SCAN_EXT = new Set(['.html', '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx']);

const SKIP_FILES = [
  /\.test\.js$/,
  /_legacy-.*\.js$/,
  /vitest\.config\.js(?:\.timestamp-.*)?$/,
];

const SECRET_PATTERNS = [
  { name: 'Firebase API key', regex: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'OpenAI sk- key', regex: /\bsk-[A-Za-z0-9]{32,}/ },
];

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

describe('API-005: zero hardcoded secrets in source code', () => {
  it('no shipped source file contains a secret-shaped literal', () => {
    const allFiles = walk(REPO_ROOT);
    const scanned = allFiles.filter((f) => {
      const ext = f.slice(f.lastIndexOf('.'));
      if (!SCAN_EXT.has(ext)) return false;
      const rel = relative(REPO_ROOT, f);
      return !SKIP_FILES.some((re) => re.test(rel));
    });

    const violations = [];
    for (const f of scanned) {
      const content = readFileSync(f, 'utf8');
      for (const { name, regex } of SECRET_PATTERNS) {
        const m = content.match(regex);
        if (!m) continue;
        const line = content.slice(0, m.index).split('\n').length;
        violations.push({
          file: relative(REPO_ROOT, f).replace(/\\/g, '/'),
          line,
          type: name,
          snippet: m[0].slice(0, 10) + '…',
        });
      }
    }

    if (violations.length) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line}  [${v.type}]  ${v.snippet}`)
        .join('\n');
      throw new Error(`Found ${violations.length} hardcoded secret(s):\n${report}`);
    }
  });
});
