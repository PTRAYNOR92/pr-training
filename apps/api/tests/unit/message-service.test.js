import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * DB-003 Acceptance Criteria (server side):
 * - Last 20 messages displayed on return.
 * - The frontend reads via /api/conversations/recent, which delegates to
 *   listRecentMessages(uid, limit). This service mocks the Firestore admin
 *   SDK at the `db` singleton boundary; rule-engine behaviour is covered
 *   by DB-005.
 */

const docs = [
  {
    id: 'm-1',
    data: () => ({
      userId: 'alice',
      conversationId: 'c-1',
      role: 'user',
      message: 'hi',
      tokensUsed: 0,
      timestamp: { toDate: () => new Date('2026-04-27T10:00:00Z') },
      provider: 'p',
      model: 'm',
    }),
  },
  {
    id: 'm-2',
    data: () => ({
      userId: 'alice',
      conversationId: 'c-1',
      role: 'assistant',
      message: 'hello',
      tokensUsed: 5,
      timestamp: { toDate: () => new Date('2026-04-27T10:00:01Z') },
      provider: 'p',
      model: 'm',
    }),
  },
];

const query = {
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  get: vi.fn(),
};
query.where.mockReturnValue(query);
query.orderBy.mockReturnValue(query);
query.limit.mockReturnValue(query);

vi.mock('../../src/services/firestore.js', () => ({
  db: {
    collection: vi.fn(() => query),
  },
}));

const { db } = await import('../../src/services/firestore.js');
const { listRecentMessages } = await import('../../src/services/messageService.js');

describe('DB-003: messageService.listRecentMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.get.mockResolvedValue({ docs });
  });

  it('queries the messages collection scoped to the supplied uid', async () => {
    await listRecentMessages('alice', 20);

    expect(db.collection).toHaveBeenCalledWith('messages');
    expect(query.where).toHaveBeenCalledWith('userId', '==', 'alice');
  });

  it('orders by timestamp descending and applies the requested limit', async () => {
    await listRecentMessages('alice', 20);

    expect(query.orderBy).toHaveBeenCalledWith('timestamp', 'desc');
    expect(query.limit).toHaveBeenCalledWith(20);
  });

  it('clamps limit to a maximum of 50 (no unbounded reads)', async () => {
    await listRecentMessages('alice', 999);
    expect(query.limit).toHaveBeenCalledWith(50);
  });

  it('clamps non-positive limits to a default of 20', async () => {
    await listRecentMessages('alice', 0);
    expect(query.limit).toHaveBeenCalledWith(20);

    vi.clearAllMocks();
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.get.mockResolvedValue({ docs });

    await listRecentMessages('alice', -5);
    expect(query.limit).toHaveBeenCalledWith(20);
  });

  it('returns plain objects with id + content fields and timestamp serialised to ISO', async () => {
    const result = await listRecentMessages('alice', 20);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'm-1',
      role: 'user',
      message: 'hi',
      conversationId: 'c-1',
      tokensUsed: 0,
    });
    // ISO string so the wire format is stable; client recreates Date if needed.
    expect(result[0].timestamp).toBe('2026-04-27T10:00:00.000Z');
    expect(result[1].timestamp).toBe('2026-04-27T10:00:01.000Z');
  });

  it('returns the messages newest-first (matches Firestore order)', async () => {
    // Service should NOT silently re-sort. The DB query orders desc; the
    // frontend reverses for chronological rendering. Keeping it explicit
    // here means we can rely on the API surface.
    query.get.mockResolvedValue({
      docs: [
        { id: 'newest', data: () => ({ userId: 'alice', timestamp: { toDate: () => new Date('2026-04-27T11:00:00Z') }, message: 'newest', role: 'user', conversationId: 'c', tokensUsed: 0, provider: 'p', model: 'm' }) },
        { id: 'older', data: () => ({ userId: 'alice', timestamp: { toDate: () => new Date('2026-04-27T10:00:00Z') }, message: 'older', role: 'user', conversationId: 'c', tokensUsed: 0, provider: 'p', model: 'm' }) },
      ],
    });

    const result = await listRecentMessages('alice', 20);
    expect(result[0].id).toBe('newest');
    expect(result[1].id).toBe('older');
  });
});
