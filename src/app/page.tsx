'use client';

import { useState, useEffect, useCallback } from 'react';
import CopyButton from '@/components/CopyButton';
import TimeRemaining from '@/components/TimeRemaining';

interface ClipItem {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  expiresAt: number;
}

export default function Home() {
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchClips = useCallback(async () => {
    try {
      const res = await fetch('/api/clips');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setClips(data.clips);
      setError(null);
    } catch (err) {
      setError('Could not load clips');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClips();
    // Poll every 15 seconds for new items
    const interval = setInterval(fetchClips, 15000);
    return () => clearInterval(interval);
  }, [fetchClips]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/clips/${id}`, { method: 'DELETE' });
      setClips((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const relativeTime = (ms: number) => {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-coppy-border bg-coppy-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📎</span>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Coppy</h1>
              <p className="text-xs text-coppy-muted">Expiring clipboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-coppy-muted">
              {clips.length} {clips.length === 1 ? 'item' : 'items'}
            </span>
            <button
              onClick={fetchClips}
              className="text-xs text-coppy-secondary hover:text-white transition-colors"
              title="Refresh"
            >
              ↻
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-pulse text-coppy-muted">Loading clips...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && clips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-6xl mb-4">📋</span>
            <h2 className="text-xl font-semibold text-coppy-muted mb-2">Your clipboard is empty</h2>
            <p className="text-sm text-coppy-muted/60 max-w-sm">
              When I send you something via Coppy, it&apos;ll show up here with an auto-expiry timer.
            </p>
            <div className="mt-8 bg-coppy-card border border-coppy-border rounded-xl p-4 text-left w-full max-w-sm">
              <p className="text-xs text-coppy-muted mb-2">Quick start — add a clip via curl:</p>
              <code className="text-xs text-coppy-secondary break-all block whitespace-pre-wrap">
{`curl -X POST https://coppy.your.domain/api/clips \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello from Coppy!"}'`}
              </code>
            </div>
          </div>
        )}

        {!loading && clips.length > 0 && (
          <div className="space-y-3">
            {clips.map((clip) => {
              const isExpanded = expandedId === clip.id;
              const preview = isExpanded ? clip.content : clip.content.slice(0, 200);

              return (
                <div
                  key={clip.id}
                  className="bg-coppy-card border border-coppy-border rounded-xl overflow-hidden hover:border-coppy-primary/30 transition-colors"
                >
                  {/* Card header */}
                  <div className="px-4 py-3 flex items-center justify-between border-b border-coppy-border/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-coppy-secondary text-sm">📌</span>
                      <h3 className="text-sm font-medium truncate">{clip.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <TimeRemaining expiresAt={clip.expiresAt} />
                      <span className="text-xs text-coppy-muted/50">{relativeTime(clip.createdAt)}</span>
                    </div>
                  </div>

                  {/* Card content */}
                  <div className="px-4 py-3">
                    {clip.content.length > 200 && (
                      <div className="mb-2">
                        <button
                          onClick={() => toggleExpand(clip.id)}
                          className="text-xs text-coppy-secondary hover:text-white transition-colors"
                        >
                          {isExpanded ? '▲ Show less' : '▼ Show more'}
                        </button>
                      </div>
                    )}
                    <pre className="text-sm leading-relaxed whitespace-pre-wrap break-words font-sans text-coppy-text/90">
                      {preview}
                      {!isExpanded && clip.content.length > 200 && (
                        <span className="text-coppy-muted">...</span>
                      )}
                    </pre>
                  </div>

                  {/* Card actions */}
                  <div className="px-4 py-2.5 flex items-center gap-2 border-t border-coppy-border/50 bg-black/10">
                    <CopyButton content={clip.content} />
                    <button
                      onClick={() => handleDelete(clip.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400/70 border border-red-400/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/30 transition-all"
                    >
                      Remove
                    </button>
                    <a
                      href={`/clip/${clip.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-coppy-muted border border-coppy-border hover:text-coppy-text hover:border-coppy-muted/30 transition-all ml-auto"
                    >
                      Open
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pb-8 text-center">
          <p className="text-xs text-coppy-muted/40">
            Coppy — like Clippy, but less unhinged. Items auto-expire. Built with 💖
          </p>
        </footer>
      </main>
    </div>
  );
}
