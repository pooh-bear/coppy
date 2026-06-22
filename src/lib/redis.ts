import Redis from 'ioredis';
import type { Clip } from './types';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CLIPS_SET = 'coppy:clips';
const CLIP_PREFIX = 'coppy:clip:';

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });
  }
  return client;
}

export async function connect(): Promise<void> {
  await getClient().connect();
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

export async function setClip(
  id: string,
  title: string,
  content: string,
  ttl: number
): Promise<void> {
  const r = getClient();
  const now = Date.now();
  const data = JSON.stringify({
    id,
    title,
    content,
    createdAt: now,
    expiresAt: now + ttl * 1000,
  });

  const multi = r.multi();
  multi.set(`${CLIP_PREFIX}${id}`, data, 'EX', ttl);
  multi.sadd(CLIPS_SET, id);
  await multi.exec();
}

export async function getClip(id: string): Promise<Clip | null> {
  const r = getClient();
  const raw = await r.get(`${CLIP_PREFIX}${id}`);
  if (!raw) return null;
  return JSON.parse(raw) as Clip;
}

export async function deleteClip(id: string): Promise<boolean> {
  const r = getClient();
  const multi = r.multi();
  multi.del(`${CLIP_PREFIX}${id}`);
  multi.srem(CLIPS_SET, id);
  const results = await multi.exec();
  return results?.[0]?.[1] === 1;
}

export async function listClips(): Promise<Clip[]> {
  const r = getClient();
  const ids = await r.smembers(CLIPS_SET);
  if (ids.length === 0) return [];

  // Fetch all clips in one pipeline
  const pipeline = r.pipeline();
  for (const id of ids) {
    pipeline.get(`${CLIP_PREFIX}${id}`);
  }
  const results = await pipeline.exec();
  if (!results) return [];

  const clips: Clip[] = [];
  const staleIds: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const [err, raw] = results[i];
    if (err || !raw) {
      staleIds.push(ids[i]);
      continue;
    }
    clips.push(JSON.parse(raw as string) as Clip);
  }

  // Clean up stale IDs from the set
  if (staleIds.length > 0) {
    const r2 = getClient();
    await r2.srem(CLIPS_SET, ...staleIds);
  }

  // Sort by createdAt descending (newest first)
  clips.sort((a, b) => b.createdAt - a.createdAt);
  return clips;
}
