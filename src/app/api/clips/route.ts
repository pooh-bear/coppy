import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { setClip, listClips } from '@/lib/redis';
import { validateApiToken } from '@/lib/auth';

const DEFAULT_TTL = parseInt(process.env.COPPY_DEFAULT_TTL || '3600', 10);
const MAX_TTL = parseInt(process.env.COPPY_MAX_TTL || '86400', 10);

export async function POST(request: NextRequest) {
  // Check API token
  const auth = validateApiToken(request);
  if (!auth.valid) return auth.error;

  try {
    const body = await request.json();
    const { content, title, ttl } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const clipTtl = Math.min(
      Math.max(typeof ttl === 'number' ? ttl : DEFAULT_TTL, 60), // min 1 minute
      MAX_TTL
    );
    const clipTitle =
      typeof title === 'string' && title.trim().length > 0
        ? title.trim()
        : `Clip ${new Date().toLocaleString()}`;

    const id = nanoid(12);
    await setClip(id, clipTitle, content.trim(), clipTtl);

    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

    return NextResponse.json(
      {
        id,
        url: `${appUrl}/clip/${id}`,
        expiresIn: clipTtl,
        message: 'Clip created successfully',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/clips error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const clips = await listClips();
    return NextResponse.json({ clips });
  } catch (err) {
    console.error('GET /api/clips error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
