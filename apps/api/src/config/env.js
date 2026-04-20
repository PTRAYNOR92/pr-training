// Typed env loader — fails fast on missing required vars in production.
// In test mode, required vars fall back to placeholders so unit/integration tests can run.
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

const required = (name, testDefault = 'test-placeholder') => {
  const v = process.env[name];
  if (!v && !isTest) throw new Error(`Missing required env var: ${name}`);
  return v || testDefault;
};

const optional = (name, fallback) => process.env[name] ?? fallback;

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', 3000)),
  logLevel: optional('LOG_LEVEL', 'info'),

  firebase: {
    projectId: required('FIREBASE_PROJECT_ID', 'test-project'),
  },

  aiProvider: optional('AI_PROVIDER', 'azure-openai'),

  azureOpenAI: {
    endpoint: optional('AZURE_OPENAI_ENDPOINT'),
    apiKey: optional('AZURE_OPENAI_API_KEY'),
    deployment: optional('AZURE_OPENAI_DEPLOYMENT', 'gpt-4o-mini'),
    apiVersion: optional('AZURE_OPENAI_API_VERSION', '2024-10-21'),
  },

  openAI: {
    apiKey: optional('OPENAI_API_KEY'),
  },

  elevenLabs: {
    apiKey: optional('ELEVENLABS_API_KEY'),
    defaultVoiceId: optional('ELEVENLABS_DEFAULT_VOICE_ID'),
  },

  quotas: {
    dailyTokensPerUser: Number(optional('DAILY_TOKEN_LIMIT_PER_USER', 10000)),
    ipRatePerMinute: Number(optional('IP_RATE_LIMIT_PER_MINUTE', 100)),
  },

  cors: {
    allowedOrigins: optional('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
};
