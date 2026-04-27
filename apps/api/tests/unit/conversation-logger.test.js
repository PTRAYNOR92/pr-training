import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * DB-002 Acceptance Criteria:
 * - Each AI request and response is written to Firestore.
 * - Each message carries user_id, timestamp, content (`message`), and token_count.
 * - Daily usage is incremented when tokens are reported.
 *
 * The logger is a thin adapter over the Firestore admin SDK; we mock the `db`
 * singleton (see services/firestore.js) and assert the shape of the writes
 * rather than booting the emulator. DB-005 covers rules behaviour against the
 * emulator separately.
 */

const conversationDocRef = { set: vi.fn() };
const messageDocRef = { id: 'auto-id' };
const batch = { set: vi.fn(), commit: vi.fn() };

const collections = {
  conversations: {
    doc: vi.fn(() => conversationDocRef),
  },
  messages: {
    doc: vi.fn(() => messageDocRef),
  },
};

vi.mock('../../src/services/firestore.js', () => ({
  db: {
    collection: vi.fn((name) => collections[name]),
    batch: vi.fn(() => batch),
  },
}));

vi.mock('../../src/services/quotaService.js', () => ({
  incrementDailyUsage: vi.fn().mockResolvedValue(undefined),
}));

const { logConversation } = await import('../../src/services/conversationLogger.js');
const { incrementDailyUsage } = await import('../../src/services/quotaService.js');

describe('DB-002: conversationLogger writes both messages with the SDD schema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conversationDocRef.set.mockResolvedValue(undefined);
    batch.set.mockReturnValue(batch);
    batch.commit.mockResolvedValue(undefined);
  });

  it('writes a user message and an assistant message in the same batch', async () => {
    await logConversation({
      conversationId: 'conv-1',
      userId: 'user-abc',
      prompt: 'hello there',
      response: 'general kenobi',
      tokensUsed: 42,
      provider: 'azure-openai',
      model: 'gpt-4o-mini',
    });

    expect(batch.set).toHaveBeenCalledTimes(2);
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it('records userId, timestamp, content, and tokensUsed on every message', async () => {
    const before = Date.now();
    await logConversation({
      conversationId: 'conv-1',
      userId: 'user-abc',
      prompt: 'hello',
      response: 'world',
      tokensUsed: 7,
      provider: 'azure-openai',
      model: 'gpt-4o-mini',
    });
    const after = Date.now();

    const writes = batch.set.mock.calls.map(([, doc]) => doc);
    for (const doc of writes) {
      expect(doc.userId).toBe('user-abc');
      expect(doc.conversationId).toBe('conv-1');
      expect(doc.timestamp).toBeInstanceOf(Date);
      expect(doc.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(doc.timestamp.getTime()).toBeLessThanOrEqual(after);
      expect(typeof doc.message).toBe('string');
      expect(typeof doc.tokensUsed).toBe('number');
      expect(doc.provider).toBe('azure-openai');
      expect(doc.model).toBe('gpt-4o-mini');
    }
  });

  it('tags the user message with role=user and tokensUsed=0 (prompt cost lives on the assistant turn)', async () => {
    await logConversation({
      conversationId: 'conv-1',
      userId: 'u',
      prompt: 'hi',
      response: 'hello',
      tokensUsed: 10,
      provider: 'p',
      model: 'm',
    });

    const userWrite = batch.set.mock.calls.find(([, d]) => d.role === 'user')[1];
    expect(userWrite.role).toBe('user');
    expect(userWrite.message).toBe('hi');
    expect(userWrite.tokensUsed).toBe(0);
  });

  it('tags the assistant message with role=assistant and the reported token count', async () => {
    await logConversation({
      conversationId: 'conv-1',
      userId: 'u',
      prompt: 'hi',
      response: 'hello there',
      tokensUsed: 13,
      provider: 'p',
      model: 'm',
    });

    const assistantWrite = batch.set.mock.calls.find(([, d]) => d.role === 'assistant')[1];
    expect(assistantWrite.role).toBe('assistant');
    expect(assistantWrite.message).toBe('hello there');
    expect(assistantWrite.tokensUsed).toBe(13);
  });

  it('upserts the parent conversation doc with userId, startedAt, and a derived title', async () => {
    await logConversation({
      conversationId: 'conv-xyz',
      userId: 'user-1',
      prompt: 'a'.repeat(200),
      response: 'short',
      tokensUsed: 1,
      provider: 'p',
      model: 'm',
    });

    expect(collections.conversations.doc).toHaveBeenCalledWith('conv-xyz');
    expect(conversationDocRef.set).toHaveBeenCalledTimes(1);
    const [doc, opts] = conversationDocRef.set.mock.calls[0];
    expect(doc.userId).toBe('user-1');
    expect(doc.startedAt).toBeInstanceOf(Date);
    expect(typeof doc.title).toBe('string');
    expect(doc.title.length).toBeLessThanOrEqual(80);
    expect(opts).toEqual({ merge: true });
  });

  it('generates a conversationId when none is supplied (so first-turn calls still log)', async () => {
    const id = await logConversation({
      userId: 'u',
      prompt: 'hi',
      response: 'yo',
      tokensUsed: 1,
      provider: 'p',
      model: 'm',
    });

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(collections.conversations.doc).toHaveBeenCalledWith(id);
  });

  it('returns the conversationId so the route can echo it back to the client', async () => {
    const id = await logConversation({
      conversationId: 'conv-echo',
      userId: 'u',
      prompt: 'hi',
      response: 'yo',
      tokensUsed: 1,
      provider: 'p',
      model: 'm',
    });
    expect(id).toBe('conv-echo');
  });

  it('increments daily usage with the assistant token count', async () => {
    await logConversation({
      conversationId: 'c',
      userId: 'user-quota',
      prompt: 'x',
      response: 'y',
      tokensUsed: 99,
      provider: 'p',
      model: 'm',
    });

    expect(incrementDailyUsage).toHaveBeenCalledWith('user-quota', 99);
  });

  it('skips the usage increment when tokensUsed is 0 (e.g. provider returned no usage report)', async () => {
    await logConversation({
      conversationId: 'c',
      userId: 'u',
      prompt: 'x',
      response: 'y',
      tokensUsed: 0,
      provider: 'p',
      model: 'm',
    });

    expect(incrementDailyUsage).not.toHaveBeenCalled();
  });
});
