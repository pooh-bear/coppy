export interface Clip {
  id: string;
  title: string;
  content: string;
  createdAt: number;  // Unix ms
  expiresAt: number;  // Unix ms
}

export interface CreateClipInput {
  title?: string;
  content: string;
  ttl?: number;  // seconds, defaults to COPPY_DEFAULT_TTL
}
