// Ensures import.meta.env.VITE_API_BASE_URL has a value during tests.
// Individual tests can override via vi.stubEnv in a beforeEach.
import.meta.env.VITE_API_BASE_URL = 'http://api.test';
