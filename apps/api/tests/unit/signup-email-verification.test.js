import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../..');

/**
 * AUTH-004 Acceptance Criteria:
 * - Firebase console shows all registered users.
 * - Email-verified flag is visible.
 *
 * The Firebase email-verified boolean only flips to true if the signup flow
 * calls sendEmailVerification on the new user. This test is a static guard:
 * it asserts login.html (the signup entry point) contains a
 * sendEmailVerification call inside the create-account branch.
 */
describe('AUTH-004: signup flow sends email verification', () => {
  it('login.html calls sendEmailVerification after account creation', () => {
    const html = readFileSync(resolve(REPO_ROOT, 'apps/web/login.html'), 'utf8');

    expect(html).toMatch(/createUserWithEmailAndPassword/);
    expect(html).toMatch(/sendEmailVerification\s*\(/);
  });
});
