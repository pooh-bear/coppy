export const MIN_TTL = 60; // seconds
export const DEFAULT_TTL = parseInt(process.env.COPPY_DEFAULT_TTL || '3600', 10);
export const MAX_TTL = parseInt(process.env.COPPY_MAX_TTL || '86400', 10);

/** Keep a requested lifespan (seconds) within [MIN_TTL, MAX_TTL]. Shared by create and update. */
export const clampTtl = (ttl: number) => Math.min(Math.max(ttl, MIN_TTL), MAX_TTL);
