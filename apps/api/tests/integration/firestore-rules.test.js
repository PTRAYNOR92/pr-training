import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';

/**
 * DB-005 Acceptance Criteria:
 * - Security rules pass unit tests.
 * - Cross-user read is rejected with permission-denied.
 *
 * Strategy: load infra/firebase/firestore.rules into the @firebase/rules-unit-testing
 * harness and exercise the rule engine against in-memory Firestore. The suite
 * auto-skips when the Firestore emulator isn't reachable on 127.0.0.1:8080 so
 * `npm test` stays green for contributors who don't have the emulator
 * running. CI (or `npm run emulators` in another shell) brings the suite live.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RULES_PATH = resolve(__dirname, '../../../../infra/firebase/firestore.rules');
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;
const PROJECT_ID = 'pr-training-rules-test';

async function emulatorReachable() {
  return new Promise((resolveProbe) => {
    const socket = createConnection({ host: EMULATOR_HOST, port: EMULATOR_PORT });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.end();
      resolveProbe(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolveProbe(false);
    });
    socket.once('error', () => resolveProbe(false));
  });
}

const reachable = await emulatorReachable();

const describeIfEmulator = reachable ? describe : describe.skip;

if (!reachable) {
  console.warn(
    `[DB-005] Skipping rules tests: Firestore emulator not reachable at ${EMULATOR_HOST}:${EMULATOR_PORT}. ` +
      `Run \`npm run emulators\` in another shell to enable.`,
  );
}

describeIfEmulator('DB-005: firestore.rules deny cross-user reads', () => {
  let testEnv;
  let initializeTestEnvironment;
  let assertFails;
  let assertSucceeds;

  beforeAll(async () => {
    ({ initializeTestEnvironment, assertFails, assertSucceeds } = await import(
      '@firebase/rules-unit-testing'
    ));

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: EMULATOR_HOST,
        port: EMULATOR_PORT,
        rules: readFileSync(RULES_PATH, 'utf8'),
      },
    });
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('users/{uid}', () => {
    it('lets a signed-in user read their own profile', async () => {
      // Seed via the unauthenticated admin context so the write itself isn't gated by rules.
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc('users/alice').set({ email: 'alice@test.com' });
      });

      const aliceDb = testEnv.authenticatedContext('alice').firestore();
      await assertSucceeds(aliceDb.doc('users/alice').get());
    });

    it('rejects reads of another user\'s profile with permission-denied', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc('users/bob').set({ email: 'bob@test.com' });
      });

      const aliceDb = testEnv.authenticatedContext('alice').firestore();
      await assertFails(aliceDb.doc('users/bob').get());
    });

    it('rejects unauthenticated reads', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc('users/alice').set({ email: 'alice@test.com' });
      });

      const anonDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(anonDb.doc('users/alice').get());
    });

    it('rejects client writes to user docs (server-only)', async () => {
      const aliceDb = testEnv.authenticatedContext('alice').firestore();
      await assertFails(aliceDb.doc('users/alice').set({ email: 'alice@test.com' }));
    });
  });

  describe('conversations/, messages/, usage_daily/ are server-admin only', () => {
    it.each([
      ['conversations/conv-1', { userId: 'alice', startedAt: new Date() }],
      ['messages/msg-1', { conversationId: 'c', userId: 'alice', message: 'hi' }],
      ['usage_daily/alice_2026-04-27', { uid: 'alice', tokens: 10 }],
    ])('rejects authenticated client reads of %s', async (path) => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc(path).set({ seed: true });
      });

      const aliceDb = testEnv.authenticatedContext('alice').firestore();
      await assertFails(aliceDb.doc(path).get());
    });

    it.each([
      ['conversations/conv-1', { userId: 'alice' }],
      ['messages/msg-1', { conversationId: 'c', userId: 'alice', message: 'hi' }],
      ['usage_daily/alice_2026-04-27', { uid: 'alice', tokens: 10 }],
    ])('rejects authenticated client writes to %s', async (path, payload) => {
      const aliceDb = testEnv.authenticatedContext('alice').firestore();
      await assertFails(aliceDb.doc(path).set(payload));
    });

    it('rejects cross-user reads of conversations even if the doc has matching userId', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc('conversations/conv-bob').set({ userId: 'bob' });
      });

      const bobDb = testEnv.authenticatedContext('bob').firestore();
      // Even the owner cannot read their own conversation client-side — server-only.
      await assertFails(bobDb.doc('conversations/conv-bob').get());
    });
  });
});
