'use client';

import { useState, useEffect, useMemo, use } from 'react';
import Receipt from '@/components/Receipt';
import Tagline from '@/components/Tagline';
import type { Clip } from '@/lib/types';
import { TYPES, copyText, toView } from '@/lib/clipView';

export default function ClipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [raw, setRaw] = useState<Clip | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clips/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((data) => setRaw(data.clip))
      .catch(() => setRaw(null))
      .finally(() => setLoading(false));
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [id]);

  const clip = useMemo(() => (raw ? toView(raw) : null), [raw]);
  const gone = !loading && (!clip || clip.expiresAt <= now);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-side">
          <a href="/" className="brand">coppy<span className="brand-cursor" /></a>
          <Tagline />
        </div>
        <div className="topbar-side topbar-stats">
          <a href="/">← all clips</a>
        </div>
      </header>

      {loading ? (
        <main className="status-line">warming up the printer…</main>
      ) : gone || !clip ? (
        <main className="empty-main">
          <div className="receipt paper-tear empty-receipt">
            <div className="receipt-top"><span>coppy / clip {id}</span><span>void</span></div>
            <h1 className="empty-title">Already evaporated.</h1>
            <p className="empty-copy">
              This clip was shredded or its time ran out. Either way, it’s not coming back.
            </p>
            <p className="empty-fine"><a href="/">back to the counter</a></p>
          </div>
        </main>
      ) : (
        <main className="standalone">
          <div className="standalone-scroll">
            <Receipt clip={clip} now={now} />
          </div>
          <div className="reader-actions standalone-actions">
            <button
              className="btn-primary"
              onClick={() => { copyText(clip.url || clip.content); flash(clip.type === 'link' ? 'URL COPIED.' : 'COPIED. IT’S YOURS NOW.'); }}
            >
              {TYPES[clip.type].copy}
            </button>
            <button
              className="btn-outline"
              onClick={() => { copyText(window.location.href); flash('LINK COPIED. IT EXPIRES TOO.'); }}
            >
              Share link
            </button>
          </div>
        </main>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
