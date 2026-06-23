import { NextRequest, NextResponse } from 'next/server';
import { getClip, deleteClip } from '@/lib/redis';
import { validateApiToken } from '@/lib/auth';

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
