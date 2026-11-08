/**
 * Edge-safe constants. This module must stay free of node:crypto / pg imports
 * so that Next.js middleware can import it.
 */
export const SESSION_COOKIE = 'aria_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
