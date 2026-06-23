'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import CopyButton from '@/components/CopyButton';
import TimeRemaining, { TtlBar } from '@/components/TimeRemaining';
import { detectTypeFromTitle, type ClipType } from '@/lib/detectType';
import {
  IconClip, IconSearch, IconCopy, IconCheck,
  IconTrash, IconBack,
  IconEmptySearch, IconSelectClip
} from '@/components/Icons';

interface ClipItem {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  expiresAt: number;
}

type FilterType = 'all' | ClipType;

export default function Home() {
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const fetchClips = useCallback(async () => {
    try {
      const res = await fetch('/api/clips');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setClips(data.clips);
      setError(null);
    } catch {
      setError('Could not load clips');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClips();
    const interval = setInterval(fetchClips, 15000);
    return () => clearInterval(interval);
  }, [fetchClips]);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await fetch(`/api/clips/${id}`, { method: 'DELETE' });
      setClips((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId(null);
      showToast('Deleted');
    } catch {
      // ignore
    }
  };



  // Content type badge and preview helpers
  const getClipType = (clip: ClipItem): ClipType => detectTypeFromTitle(clip.title, clip.content);

  const getPreviewHtml = (clip: ClipItem) => {
    const type = getClipType(clip);
    const preview = clip.content.slice(0, 300);

    if (type === 'code' || type === 'json') {
      return <pre className="item-preview code">{preview}</pre>;
    }

    return <div className="item-preview">{preview}</div>;
  };

  // Determine if card is selected
  const isSelected = (id: string) => selectedId === id;

  // Filtering and search
  const filteredClips = clips.filter((clip) => {
    // Filter by type
    if (activeFilter !== 'all') {
      const clipType = getClipType(clip);
      if (clipType !== activeFilter) return false;
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        clip.title.toLowerCase().includes(q) ||
        clip.content.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const countByType = (type: ClipType): number =>
    clips.filter((c) => getClipType(c) === type).length;

  // Select clip
  const selectClip = (id: string) => {
    setSelectedId(id);
    // On mobile, open the overlay
    if (window.innerWidth < 1024) {
      setOverlayOpen(true);
    }
  };

  const selectedClip = clips.find((c) => c.id === selectedId);

  const relativeTime = (ms: number) => {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatSize = (content: string) => {
    const bytes = new TextEncoder().encode(content).length;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Auto-detect type for mobile overlay
  const selectedType = selectedClip ? getClipType(selectedClip) : 'text';

  return (
    <div className="app" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">
            <span className="brand-icon"><IconClip /></span>
            Coppy
  
          </span>

          <div className="search-wrap">
            <span className="search-icon"><IconSearch /></span>
            <input
              ref={searchInputRef}
              className="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clipboard…"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className={`search-clear${searchQuery ? ' visible' : ''}`}
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
              aria-label="Clear search"
            >×</button>
          </div>

          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button className="btn-icon" title="Refresh" onClick={fetchClips} aria-label="Refresh">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>

          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="main-layout" style={{ flex: 1 }}>

        {/* List pane */}
        <div className="list-pane">
          {/* Filter chips */}
          <div className="filter-row">
            <button className={`chip${activeFilter === 'all' ? ' active' : ''}`} onClick={() => setActiveFilter('all')}>
              All <span className="chip-count">{clips.length}</span>
            </button>
            <button className={`chip${activeFilter === 'code' ? ' active' : ''}`} onClick={() => setActiveFilter('code')}>
              Code <span className="chip-count">{countByType('code')}</span>
            </button>
            <button className={`chip${activeFilter === 'json' ? ' active' : ''}`} onClick={() => setActiveFilter('json')}>
              JSON <span className="chip-count">{countByType('json')}</span>
            </button>
            <button className={`chip${activeFilter === 'text' ? ' active' : ''}`} onClick={() => setActiveFilter('text')}>
              Text <span className="chip-count">{countByType('text')}</span>
            </button>
            <button className={`chip${activeFilter === 'link' ? ' active' : ''}`} onClick={() => setActiveFilter('link')}>
              Links <span className="chip-count">{countByType('link')}</span>
            </button>
            <span className="filter-spacer" />
            <span className="result-count">{filteredClips.length} items</span>
          </div>



          {/* Loading state */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-muted)' }}>
              <div style={{ animation: 'pulse 2s infinite' }}>Loading clips…</div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div style={{
              background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-md)', padding: 16, color: 'var(--color-danger-fg)', fontSize: 14
            }}>
              {error}
            </div>
          )}

          {/* Empty state (no clips at all OR all filtered out) */}
          {!loading && !error && clips.length === 0 && (
            <div className="empty-state">
              <p style={{ fontSize: 48, marginBottom: 16 }}>📋</p>
              <h3>Your clipboard is empty</h3>
              <p>Send a POST to /api/clips to create one. Items auto-destruct after their TTL.</p>
            </div>
          )}

          {!loading && !error && clips.length > 0 && filteredClips.length === 0 && (
            <div className="empty-state">
              <IconEmptySearch style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.4 }} />
              <h3>No matching items</h3>
              <p>Try a different search term or filter. Items may have already self-destructed.</p>
            </div>
          )}

          {/* Item list */}
          {!loading && filteredClips.length > 0 && (
            <div className="item-list">
              {filteredClips.map((clip) => {
                const type = getClipType(clip);
                const isExpiringSoon = (clip.expiresAt - Date.now()) < 600000; // 10 min

                return (
                  <div
                    key={clip.id}
                    className={`item-card${isSelected(clip.id) ? ' selected' : ''}${isExpiringSoon ? ' expiring-soon' : ''}`}
                    onClick={() => selectClip(clip.id)}
                  >
                    <div className="item-header">
                      <span className={`item-type ${type}`}>{type}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-fg)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {clip.title}
                      </span>
                      <span className="item-header-spacer" />
                      <TimeRemaining expiresAt={clip.expiresAt} />
                    </div>
                    <div className="item-body">
                      {getPreviewHtml(clip)}
                    </div>
                    <div className="item-footer">
                      <CopyButton content={clip.content} />
                      <button className="item-delete-btn" onClick={(e) => handleDelete(clip.id, e)}>
                        <IconTrash />
                        Delete
                      </button>
                      <a
                        href={`/clip/${clip.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="btn-ghost"
                        style={{ height: 30, padding: '0 10px', fontSize: 12, marginLeft: 'auto', textDecoration: 'none' }}
                      >
                        Open
                      </a>
                    </div>
                    <TtlBar expiresAt={clip.expiresAt} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail pane (desktop) */}
        <div className="detail-pane">
          <div className="detail-content">
            {!selectedClip && (
              <div className="detail-empty">
                <IconSelectClip style={{ width: 40, height: 40, marginBottom: 14, opacity: 0.35 }} />
                <h3>Select an item</h3>
                <p>Tap any clip to view full content</p>
              </div>
            )}

            {selectedClip && (
              <div className="detail-card">
                <div className="detail-header">
                  <span className={`item-type ${selectedType}`}>{selectedType}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedClip.title}
                  </span>
                  <TimeRemaining expiresAt={selectedClip.expiresAt} />
                </div>
                <div className="detail-body">
                  <div className={`detail-${selectedType === 'code' || selectedType === 'json' ? 'code' : 'text'}`}>
                    {selectedClip.content}
                  </div>
                  <div className="detail-info">
                    <div className="detail-info-row">
                      <span className="detail-info-label">Size</span>
                      <span className="detail-info-value">{formatSize(selectedClip.content)}</span>
                    </div>
                    <div className="detail-info-row">
                      <span className="detail-info-label">Created</span>
                      <span className="detail-info-value">{relativeTime(selectedClip.createdAt)}</span>
                    </div>
                    <div className="detail-info-row">
                      <span className="detail-info-label">Expires</span>
                      <span className="detail-info-value"><TimeRemaining expiresAt={selectedClip.expiresAt} /></span>
                    </div>
                    <div className="detail-info-row">
                      <span className="detail-info-label">ID</span>
                      <span className="detail-info-value" style={{ fontSize: 11 }}>{selectedClip.id}</span>
                    </div>
                  </div>
                </div>
                <div className="detail-actions">
                  <CopyButton content={selectedClip.content} />
                  <button className="item-delete-btn" onClick={(e) => handleDelete(selectedClip.id, e)}>
                    <IconTrash />
                    Delete
                  </button>
                  <button className="btn-ghost" style={{ height: 30, padding: '0 10px', fontSize: 12 }} onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + '/clip/' + selectedClip.id);
                    showToast('Link copied!');
                  }}>
                    <IconCopy />
                    Copy Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile detail overlay */}
      <div className={`detail-overlay${overlayOpen ? ' open' : ''}`}>
        <div className="detail-overlay-header">
          <button className="btn-back" onClick={() => setOverlayOpen(false)} aria-label="Back">
            <IconBack />
          </button>
          <span className="detail-title">{selectedClip?.title || 'Item'}</span>
          {selectedClip && (
            <>
              <CopyButton content={selectedClip.content} className="btn-ghost" style={{ width: 38, height: 38, padding: 0, display: 'grid', placeItems: 'center' }} />
              <button
                className="btn-back"
                onClick={() => { navigator.clipboard.writeText(window.location.origin + '/clip/' + selectedClip.id); showToast('Link copied!'); }}
                aria-label="Copy link"
                style={{ width: 38, height: 38, display: 'grid', placeItems: 'center' }}
              >
                <IconCopy />
              </button>
            </>
          )}
        </div>
        <div id="overlay-body" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {selectedClip && (
            <>
              <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className={`item-type ${selectedType}`}>{selectedType}</span>
                <TimeRemaining expiresAt={selectedClip.expiresAt} />
              </div>
              <div style={{
                fontFamily: (selectedType === 'code' || selectedType === 'json') ? 'var(--font-mono)' : 'var(--font-body)',
                fontSize: selectedType === 'code' ? 13 : 15,
                lineHeight: 1.65,
                background: (selectedType === 'code' || selectedType === 'json') ? 'var(--color-code-bg)' : 'transparent',
                color: (selectedType === 'code' || selectedType === 'json') ? 'var(--color-code-fg)' : 'var(--color-fg)',
                padding: (selectedType === 'code' || selectedType === 'json') ? 16 : 0,
                borderRadius: 'var(--radius-md)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowX: 'auto',
              }}>
                {selectedClip.content}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      <div className={`toast${toastMsg ? ' show' : ''}`}>
        <IconCheck />
        <span>{toastMsg || 'Copied'}</span>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
