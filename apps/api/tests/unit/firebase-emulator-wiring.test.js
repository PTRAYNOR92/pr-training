import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../..');

/**
 * AUTH-005 Acceptance Criteria:
 * - `firebase emulators:start` works.
 * - Local tests use emulated auth (opt-in via VITE_FIREBASE_USE_EMULATOR=true).
 *
 * The "works" part requires firebase-tools + config. This test is a static
 * guard that the config and emulator-hooks are in place, so a future refactor
 * can't silently drop them.
 */
describe('AUTH-005: Firebase emulator suite is wired up', () => {
  it('firebase.json declares the auth and firestore emulators', () => {
    const p = resolve(REPO_ROOT, 'firebase.json');
    expect(existsSync(p)).toBe(true);

    const cfg = JSON.parse(readFileSync(p, 'utf8'));
    expect(cfg.emulators).toBeDefined();
    expect(cfg.emulators.auth?.port).toBe(9099);
    expect(cfg.emulators.firestore?.port).toBe(8080);
  });

  it('.firebaserc exists with a default project', () => {
    const p = resolve(REPO_ROOT, '.firebaserc');
    expect(existsSync(p)).toBe(true);
    const rc = JSON.parse(readFileSync(p, 'utf8'));
    expect(rc.projects?.default).toBeTruthy();
  });

  it('root package.json exposes an `emulators` script backed by firebase-tools', () => {
    const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.emulators).toMatch(/firebase emulators:start/);
    expect(pkg.devDependencies['firebase-tools']).toBeTruthy();
  });

  it('modular firebase.js wires connectAuthEmulator behind VITE_FIREBASE_USE_EMULATOR', () => {
    const src = readFileSync(resolve(REPO_ROOT, 'apps/web/src/firebase.js'), 'utf8');
    expect(src).toMatch(/connectAuthEmulator/);
    expect(src).toMatch(/VITE_FIREBASE_USE_EMULATOR/);
  });

  it('compat firebase-compat-init.js wires useEmulator behind VITE_FIREBASE_USE_EMULATOR', () => {
    const src = readFileSync(
      resolve(REPO_ROOT, 'apps/web/src/firebase-compat-init.js'),
      'utf8',
    );
    expect(src).toMatch(/useEmulator/);
    expect(src).toMatch(/VITE_FIREBASE_USE_EMULATOR/);
  });

  it('.env.example documents the emulator opt-in flag', () => {
    const env = readFileSync(resolve(REPO_ROOT, '.env.example'), 'utf8');
    expect(env).toMatch(/VITE_FIREBASE_USE_EMULATOR/);
  });
});
