'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Hl from '@/components/Hl';
import Receipt from '@/components/Receipt';
import Tagline from '@/components/Tagline';
import type { Clip } from '@/lib/types';
import {
  FILTERS, SORTS, TYPES, URGENT_MS, copyText, fmtAgo, fmtLeft, fmtSize, hay, hitCount,
  previewText, snippet, sortClips, toView, typeOk, type ClipView, type FilterKey, type SortKey,
} from '@/lib/clipView';

interface Strip { d: number; r: string; o: number }

const SORT_STORAGE_KEY = 'coppy:sort';

const TYPE_ALIASES: Record<string, FilterKey> = {
  text: 'text', txt: 'text', md: 'md', markdown: 'md', code: 'code', json: 'code', link: 'link', url: 'link',
};

/** Pull a `type:xyz` token out of a palette query. */
function parseQuery(raw: string, fallback: FilterKey): { q: string; t: FilterKey } {
  let q = raw;
  let t = fallback;
  const m = q.match(/\btype:(\w+)/i);
  if (m) {
    t = TYPE_ALIASES[m[1].toLowerCase()] || t;
    q = q.replace(m[0], '');
  }
  return { q: q.trim(), t };
}

export default function Home({ apiToken }: { apiToken: string | null }) {
  const [raw, setRaw] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  const [sel, setSel] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [activeQuery, setActiveQuery] = useState('');
  const [pal, setPal] = useState(false);
  const [palQ, setPalQ] = useState('');
  const [palType, setPalType] = useState<FilterKey>('all');
  const [palIdx, setPalIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmShred, setConfirmShred] = useState<string | null>(null);
  const [shredding, setShredding] = useState<string | null>(null);

  const palRef = useRef<HTMLInputElement>(null);
  const palListRef = useRef<HTMLDivElement>(null);
  const strips = useRef<Strip[]>([]);
  const shreddingRef = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchClips = useCallback(async () => {
    try {
      const res = await fetch('/api/clips');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Don't yank the receipt out from under the shredder.
      if (!shreddingRef.current) setRaw(data.clips);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClips();
    const poll = setInterval(fetchClips, 15000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      window.removeEventListener('resize', onResize);
    };
  }, [fetchClips]);

  // Remember the sort per browser; storage may be unavailable, which is fine.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SORT_STORAGE_KEY);
      if (saved && SORTS.some(([k]) => k === saved)) setSort(saved as SortKey);
    } catch {}
  }, []);
  const changeSort = (k: SortKey) => {
    setSort(k);
    setSel(null);
    try { localStorage.setItem(SORT_STORAGE_KEY, k); } catch {}
  };

  useEffect(() => {
    if (pal) setTimeout(() => palRef.current?.focus(), 20);
  }, [pal]);

  useEffect(() => {
    palListRef.current?.querySelector('[data-act]')?.scrollIntoView({ block: 'nearest' });
  }, [palIdx]);

  // ── Derived ──────────────────────────────────────────────
  const clips = useMemo(() => raw.map(toView), [raw]);
  const live = clips.filter((c) => c.expiresAt > now || c.id === shredding);

  const isPhone = w < 640;
  const inFlow = w >= 900;
  const aq = activeQuery;
  const matchesAq = (c: ClipView) => !aq || hay(c).includes(aq.toLowerCase());

  const visible = sortClips(live.filter((c) => typeOk(c, filter) && matchesAq(c)), sort);
  const selId =
    sel && visible.some((c) => c.id === sel) ? sel
    : inFlow && visible[0] ? visible[0].id
    : sel && live.some((c) => c.id === sel) ? sel
    : null;
  const selClip = live.find((c) => c.id === selId) || null;
  const overlayOpen = !inFlow && readerOpen && !!selClip;

  const { q: pq, t: pt } = parseQuery(palQ, palType);
  let palRes = live.filter((c) => typeOk(c, pt) && (!pq || hay(c).includes(pq.toLowerCase())));
  if (pq) {
    const score = (c: ClipView) => (c.title.toLowerCase().includes(pq.toLowerCase()) ? 100 : 0) + hitCount(c, pq);
    palRes = [...palRes].sort((a, b) => score(b) - score(a));
  }
  const results = palRes.slice(0, 20);
  const activeIdx = Math.min(palIdx, Math.max(0, results.length - 1));

  const soonest = live.reduce((m, c) => Math.min(m, c.expiresAt - now), Infinity);

  // ── Actions ──────────────────────────────────────────────
  const showToast = (msg: string) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const copyClip = (c: ClipView) => {
    copyText(c.url || c.content);
    showToast(c.type === 'link' ? 'URL COPIED.' : 'COPIED. IT’S YOURS NOW.');
  };

  const copyLink = (c: ClipView) => {
    copyText(window.location.origin + '/clip/' + c.id);
    showToast('LINK COPIED. IT EXPIRES TOO.');
  };

  const openClip = (id: string) => {
    setSel(id);
    setReaderOpen(true);
  };

  const openPal = () => {
    setPal(true);
    setPalQ(activeQuery);
    setPalIdx(0);
  };
  const closePal = () => setPal(false);

  const openFromPal = (id: string) => {
    setPal(false);
    setSel(id);
    setReaderOpen(true);
    setActiveQuery(pq);
    setFilter(pt);
  };
  const applyAll = () => {
    setPal(false);
    setActiveQuery(pq);
    setFilter(pt);
    setSel(null);
  };

  const askShred = (id: string) => {
    if (shredding) return;
    clearTimeout(confirmTimer.current);
    clearTimeout(toastTimer.current);
    setToast(null);
    setConfirmShred(id);
    confirmTimer.current = setTimeout(() => setConfirmShred(null), 6000);
  };
  const cancelShred = () => {
    clearTimeout(confirmTimer.current);
    setConfirmShred(null);
  };
  const doShred = async () => {
    const id = confirmShred;
    if (!id) return;
    clearTimeout(confirmTimer.current);
    setConfirmShred(null);

    let status = 0;
    try {
      const res = await fetch(`/api/clips/${id}`, { method: 'DELETE' });
      status = res.status;
    } catch {
      // network failure; status stays 0
    }
    if (status !== 200 && status !== 404) {
      showToast(status === 401 || status === 403 ? 'SHRED REFUSED. API TOKEN REQUIRED.' : 'SHREDDER JAMMED. TRY AGAIN.');
      return;
    }

    strips.current = Array.from({ length: 22 }, () => ({
      d: Math.random() * 180,
      r: (Math.random() * 16 - 8).toFixed(1) + 'deg',
      o: Math.random() * 12,
    }));
    shreddingRef.current = id;
    setShredding(id);
    setSel(id);
    setTimeout(() => {
      setRaw((prev) => prev.filter((c) => c.id !== id));
      shreddingRef.current = null;
      setShredding(null);
      setSel(null);
      setReaderOpen(false);
      showToast('SHREDDED. IT WAS LEAVING ANYWAY.');
    }, 1700);
  };

  const onPalKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPalIdx(Math.min(results.length - 1, activeIdx + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPalIdx(Math.max(0, activeIdx - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) return applyAll();
      const c = results[activeIdx];
      if (!c) return;
      if (e.metaKey || e.ctrlKey) {
        copyClip(c);
        closePal();
        return;
      }
      openFromPal(c.id);
    }
  };

  // Global shortcuts read the latest render's state through this ref.
  const onGlobalKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onGlobalKey.current = (e) => {
    const k = e.key;
    if (confirmShred && !pal) {
      if (k === 'Enter') { e.preventDefault(); doShred(); return; }
      if (k === 'Escape') { e.preventDefault(); cancelShred(); return; }
    }
    if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'k') {
      e.preventDefault();
      if (pal) closePal(); else openPal();
      return;
    }
    const tag = document.activeElement?.tagName || '';
    if (k === '/' && !pal && !/INPUT|TEXTAREA/.test(tag)) { e.preventDefault(); openPal(); return; }
    if (k === 'Escape') {
      if (pal) closePal();
      else if (readerOpen) setReaderOpen(false);
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => onGlobalKey.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ── Render ───────────────────────────────────────────────
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const curlLines = [
    `curl -X POST ${origin}/api/clips`,
    ...(apiToken ? [`-H "Authorization: Bearer ${apiToken}"`] : []),
    `-H "Content-Type: application/json"`,
    `-d '{"title":"Hello","content":"From my agent, with love"}'`,
  ];
  // Same text as curlLines, but the token is wrapped so CSS can blur it.
  const curlShown = curlLines.map((line, i) => {
    const text = (i ? '  ' : '') + line + (i < curlLines.length - 1 ? ' \\\n' : '');
    if (!apiToken || !line.includes(apiToken)) return <span key={i}>{text}</span>;
    const [before, after] = text.split(apiToken);
    return (
      <span key={i}>
        {before}<span className="secret" title="Hover to reveal">{apiToken}</span>{after}
      </span>
    );
  });

  const chips = (cur: FilterKey, pick: (k: FilterKey) => void, counts: boolean) =>
    FILTERS.map(([k, label]) => (
      <button key={k} className={`chip${cur === k ? ' on' : ''}`} onClick={() => pick(k)}>
        {label}
        {counts && <span className="chip-n">{live.filter((c) => typeOk(c, k) && matchesAq(c)).length}</span>}
      </button>
    ));

  const aqBar = aq && (
    <div className="aq-bar">
      <span className="aq-text">
        {visible.length === 1 ? '1 RESULT' : visible.length + ' RESULTS'} · “{aq}”
      </span>
      <button onClick={openPal}>refine</button>
      <button onClick={() => { setActiveQuery(''); setSel(null); }}>clear</button>
    </div>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-side">
          <span className="brand">coppy<span className="brand-cursor" /></span>
          <Tagline />
        </div>
        <button className="search-trigger hide-phone" onClick={openPal}>
          <span className="prompt">&gt;</span>
          <span className="search-trigger-text">search every clip, word for word</span>
          <kbd>⌘K</kbd>
        </button>
        <div className="topbar-side topbar-stats">
          {error && <span className="offline">offline</span>}
          <span>{String(live.length).padStart(2, '0')} live</span>
          {live.length > 0 && (
            <span className="hide-phone">next exit <b>{fmtLeft(soonest)}</b></span>
          )}
        </div>
      </header>
      <div className="phone-search show-phone">
        <button className="search-trigger" onClick={openPal}>
          <span className="prompt">&gt;</span>
          <span className="search-trigger-text">search every clip</span>
        </button>
      </div>

      {loading ? (
        <main className="status-line">warming up the printer…</main>
      ) : live.length === 0 ? (
        <main className="empty-main">
          <div className="receipt paper-tear empty-receipt">
            <div className="receipt-top">
              <span>coppy / receipt</span>
              <span>{new Date(now).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <h1 className="empty-title">{error ? 'Can’t reach the counter.' : 'Nothing to copy. Yet.'}</h1>
            <div className="leaders tally">
              {[['CLIPS', '0'], ['REGRETS', '0'], ['TOTAL', '0.00']].map(([k, v]) => (
                <div key={k} className="leader">
                  <span>{k}</span><span className="leader-dots" /><span>{v}</span>
                </div>
              ))}
            </div>
            <p className="empty-copy">
              {error
                ? 'The clipboard API isn’t answering. Check that Redis is up; this page will keep trying every 15 seconds.'
                : 'Clips arrive over the API and leave on their own schedule. Point your agent here and the next good thing it writes lands on this counter instead of drowning in chat history.'}
            </p>
            <div className="curl-box">
              <div className="curl-head">
                <span>push your first clip</span>
                <button onClick={() => { copyText(curlLines.join(' ')); showToast('COPIED. GO ON, SEND ONE.'); }}>COPY</button>
              </div>
              <pre>{curlShown}</pre>
            </div>
            <p className="empty-fine">default lifespan 1h · max 24h · no refunds</p>
          </div>
        </main>
      ) : (
        <main className="main">
          <section className="list">
            <div className="chips">{chips(filter, (k) => { setFilter(k); setSel(null); }, true)}</div>
            {aqBar}
            <div className="tickets">
              {visible.map((c) => {
                const left = c.expiresAt - now;
                const urgent = left < URGENT_MS;
                const isSel = c.id === selId && (inFlow || readerOpen);
                const fade = 0.5 + 0.5 * Math.max(0, Math.min(1, left / c.ttl));
                return (
                  <div
                    key={c.id}
                    className={`ticket${isSel ? ' sel' : ''}`}
                    onClick={() => openClip(c.id)}
                  >
                    <div className="ticket-stub">
                      <span>{c.ext}</span>
                      <span className={`ticket-left${urgent && !isSel ? ' urgent' : ''}`}>{fmtLeft(left)}</span>
                    </div>
                    <div className="ticket-body">
                      <div className="ticket-head">
                        <span className="ticket-title"><Hl text={c.title} q={aq} /></span>
                        {urgent && <span className="stamp">LAST CALL</span>}
                      </div>
                      <div className="ticket-prev" style={{ opacity: fade }}>
                        <Hl text={snippet(previewText(c), aq, 120)} q={aq} />
                      </div>
                      <span className="ticket-meta">
                        No.{c.no} · {fmtSize(c.bytes)} · {fmtAgo(now - c.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {visible.length === 0 && (
                <div className="no-items">
                  <span>{aq ? `No clips mention “${aq}”` : 'Nothing of that type here'}</span>
                  <span>It may have already evaporated. They do that.</span>
                </div>
              )}
            </div>
            <div className="list-foot">
              <label className="sort">
                <span className="sort-label">sort</span>
                <select value={sort} onChange={(e) => changeSort(e.target.value as SortKey)}>
                  {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
                <span className="sort-caret" aria-hidden>▾</span>
              </label>
            </div>
          </section>

          {overlayOpen && !isPhone && <div className="scrim" onClick={() => setReaderOpen(false)} />}

          {(inFlow || overlayOpen) && (
            <article className={`reader ${inFlow ? 'in-flow' : 'overlay'}`}>
              {selClip ? (
                <>
                  {!inFlow && (
                    <div className="reader-bar">
                      <button className="btn-close" onClick={() => setReaderOpen(false)} aria-label="Close">
                        {isPhone ? '←' : '×'}
                      </button>
                      <span className="spacer" />
                      <span className="hint">esc to close</span>
                    </div>
                  )}
                  <div className="reader-stage">
                    <div className={`reader-scroll${shredding ? ' shredding' : ''}`}>
                      <Receipt
                        key={selClip.id}
                        clip={selClip}
                        q={aq}
                        now={now}
                        style={shredding === selClip.id
                          ? { transform: 'translateY(95vh)', transition: 'transform 1.55s cubic-bezier(.55,0,.75,.4)' }
                          : undefined}
                      />
                    </div>
                    {shredding && (
                      <div className="shred-fx">
                        <div className="shred-slot"><div /></div>
                        <div className="shred-strips">
                          {strips.current.map((s, i) => (
                            <div
                              key={i}
                              style={{
                                '--r': s.r,
                                background: `repeating-linear-gradient(180deg,var(--paper) 0 ${8 + s.o}px,oklch(40% 0.014 70 / .55) ${8 + s.o}px ${10 + s.o}px,var(--paper) ${10 + s.o}px 24px)`,
                                animationDelay: Math.round(s.d) + 'ms',
                              } as React.CSSProperties}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="reader-actions">
                    <button className="btn-primary" onClick={() => copyClip(selClip)}>{TYPES[selClip.type].copy}</button>
                    <button className="btn-outline" onClick={() => copyLink(selClip)}>Share link</button>
                    <span className="spacer" />
                    <button className="btn-danger" onClick={() => askShred(selClip.id)}>Shred</button>
                  </div>
                </>
              ) : (
                <div className="reader-empty">Pick a clip. Any clip. They won’t wait forever.</div>
              )}
            </article>
          )}
        </main>
      )}

      {pal && (
        <>
          <div className="pal-scrim" onClick={closePal} />
          <div className="pal" role="dialog" aria-label="Search clips">
            <div className="pal-inner">
              <div className="pal-input-row">
                <span className="prompt">&gt;</span>
                <input
                  ref={palRef}
                  value={palQ}
                  onChange={(e) => { setPalQ(e.target.value); setPalIdx(0); }}
                  onKeyDown={onPalKey}
                  placeholder="search titles and contents"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button onClick={closePal}>{isPhone ? 'CLOSE' : 'ESC'}</button>
              </div>
              <div className="chips pal-chips">
                {chips(pt, (k) => { setPalType(k); setPalQ((q) => q.replace(/\btype:\w+\s*/i, '')); setPalIdx(0); }, false)}
              </div>
              <div className="pal-results" ref={palListRef}>
                <div className="pal-heading">
                  {pq
                    ? `${palRes.length} ${palRes.length === 1 ? 'match' : 'matches'} · best first`
                    : 'recent — try a word, or type:code'}
                </div>
                {results.map((c, i) => {
                  const act = i === activeIdx;
                  const n = hitCount(c, pq);
                  const prev = c.url ? c.content : previewText(c);
                  const left = c.expiresAt - now;
                  return (
                    <div
                      key={c.id}
                      data-act={act || undefined}
                      className={`pal-row${act ? ' act' : ''}`}
                      onClick={() => openFromPal(c.id)}
                      onMouseMove={() => { if (palIdx !== i) setPalIdx(i); }}
                    >
                      <div className="pal-tile">{c.ext}</div>
                      <div className="pal-text">
                        <span className="pal-title"><Hl text={c.title} q={pq} /></span>
                        <span className="pal-prev"><Hl text={snippet(prev, pq, 140)} q={pq} /></span>
                      </div>
                      <div className="pal-meta">
                        <span className={left < URGENT_MS ? 'urgent' : undefined}>{fmtLeft(left)}</span>
                        <span>{pq ? (n === 1 ? '1 MATCH' : n + ' MATCHES') : fmtAgo(now - c.createdAt).toUpperCase()}</span>
                      </div>
                    </div>
                  );
                })}
                {palRes.length === 0 && (
                  <div className="no-items">
                    <span>Nothing matches “{pq || palQ}”</span>
                    <span>Either it never existed or it already made its exit.</span>
                  </div>
                )}
                {!!pq && palRes.length > 1 && (
                  <div className="pal-all" onClick={applyAll}>
                    <span>show all {palRes.length} in the list</span>
                    <kbd>⇧↵</kbd>
                  </div>
                )}
              </div>
              <div className="pal-help hide-phone">
                <span>↑↓ move</span><span>↵ open</span><span>⌘↵ copy</span><span>type:code narrows</span>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmShred && (
        <div className="confirm">
          <div className="confirm-text">
            <span>SHRED No.{live.find((c) => c.id === confirmShred)?.no}?</span>
            <span>No undo. It was leaving anyway.</span>
          </div>
          <div className="confirm-btns">
            <button className="keep" onClick={cancelShred}>KEEP</button>
            <button className="shred" onClick={doShred}>SHRED{isPhone ? '' : ' ↵'}</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
