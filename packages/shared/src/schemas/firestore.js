// Document shapes per SDD §3.6 / SAD §2.3.1

/**
 * @typedef {Object} UserDoc
 * @property {string} uid
 * @property {string=} email
 * @property {number} tokenQuota
 * @property {number} totalTokensUsed
 * @property {boolean=} isAdmin
 */

/**
 * @typedef {Object} ConversationDoc
 * @property {string} userId
 * @property {Date} startedAt
 * @property {string=} title
 */

/**
 * @typedef {Object} MessageDoc
 * @property {string} conversationId
 * @property {string} userId
 * @property {Date} timestamp
 * @property {'user'|'assistant'} role
 * @property {string} message
 * @property {number} tokensUsed
 * @property {string} provider
 * @property {string} model
 */

/**
 * @typedef {Object} UsageDailyDoc
 * @property {string} uid
 * @property {number} tokens
 * @property {Date} updatedAt
 */

export {};
