export const MIN_TTL = 60; // seconds
export const DEFAULT_TTL = parseInt(process.env.COPPY_DEFAULT_TTL || '14400', 10); // 4h
export const MAX_TTL = parseInt(process.env.COPPY_MAX_TTL || '604800', 10); // 1 week

/** Keep a requested lifespan (seconds) within [MIN_TTL, MAX_TTL]. Shared by create and update. */
export const clampTtl = (ttl: number) => Math.min(Math.max(ttl, MIN_TTL), MAX_TTL);
