import { NextRequest, NextResponse } from 'next/server';
import { getClip, deleteClip, setClipTtl } from '@/lib/redis';
import { validateApiToken } from '@/lib/auth';
import { clampTtl } from '@/lib/ttl';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clip = await getClip(id);
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found or expired' }, { status: 404 });
    }
    return NextResponse.json({ clip });
  } catch (err) {
    console.error(`GET /api/clips/[id] error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Reset a clip's lifespan: it now expires `ttl` seconds from this moment. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateApiToken(request);
  if (!auth.valid) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (typeof body?.ttl !== 'number' || !Number.isFinite(body.ttl)) {
      return NextResponse.json({ error: 'ttl is required and must be a number of seconds' }, { status: 400 });
    }

    const clip = await setClipTtl(id, Math.round(clampTtl(body.ttl)));
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found or expired' }, { status: 404 });
    }
    return NextResponse.json({ clip });
  } catch (err) {
    console.error(`PATCH /api/clips/[id] error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check API token
  const auth = validateApiToken(request);
  if (!auth.valid) return auth.error;

  try {
    const { id } = await params;
    const deleted = await deleteClip(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Clip deleted' });
  } catch (err) {
    console.error(`DELETE /api/clips/[id] error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
