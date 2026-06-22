'use client';

import { useState, useEffect, use } from 'react';
import CopyButton from '@/components/CopyButton';
import TimeRemaining from '@/components/TimeRemaining';

interface ClipItem {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  expiresAt: number;
}

export default function ClipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [clip, setClip] = useState<ClipItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/clips/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((data) => setClip(data.clip))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-coppy-bg">
        <div className="animate-pulse text-coppy-muted">Loading clip...</div>
      </div>
    );
  }

  if (notFound || !clip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-coppy-bg">
        <span className="text-6xl mb-4">💨</span>
        <h1 className="text-xl font-bold mb-2">Clip expired or not found</h1>
        <p className="text-sm text-coppy-muted mb-6">
          This clip may have been deleted or its time ran out.
        </p>
        <a
          href="/"
          className="text-coppy-secondary hover:text-white transition-colors text-sm"
        >
          ← Back to Coppy
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coppy-bg">
      <header className="border-b border-coppy-border bg-coppy-card/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/" className="text-coppy-secondary hover:text-white transition-colors text-sm">
            ← Coppy
          </a>
          <span className="text-coppy-muted/30">|</span>
          <h1 className="text-sm font-medium truncate">{clip.title}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-coppy-card border border-coppy-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-coppy-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-coppy-secondary text-sm">📌</span>
              <h2 className="text-sm font-medium">{clip.title}</h2>
            </div>
            <TimeRemaining expiresAt={clip.expiresAt} />
          </div>

          <div className="px-4 py-4">
            <pre className="text-sm leading-relaxed whitespace-pre-wrap break-words font-sans text-coppy-text/90">
              {clip.content}
            </pre>
          </div>

          <div className="px-4 py-2.5 flex items-center gap-2 border-t border-coppy-border/50 bg-black/10">
            <CopyButton content={clip.content} />
          </div>
        </div>
      </main>
    </div>
  );
}
