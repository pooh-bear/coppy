import type { Clip } from './types';
import { detectClipType, leadingUrl, type ClipType } from './detectType';

export type { ClipType };
export type FilterKey = 'all' | 'text' | 'md' | 'code' | 'link';

export const TYPES: Record<ClipType, { label: string; copy: string }> = {
  text: { label: 'Plain text', copy: 'Copy text' },
  md: { label: 'Markdown', copy: 'Copy markdown' },
  code: { label: 'Code', copy: 'Copy code' },
  json: { label: 'JSON', copy: 'Copy JSON' },
  link: { label: 'Link', copy: 'Copy URL' },
};

export const FILTERS: [FilterKey, string][] = [
  ['all', 'All'],
  ['text', 'Text'],
  ['md', 'Markdown'],
  ['code', 'Code'],
  ['link', 'Links'],
];

export type SortKey = 'newest' | 'expires-asc' | 'expires-desc' | 'az' | 'za';

export const SORTS: [SortKey, string][] = [
  ['newest', 'Newest first'],
  ['expires-asc', 'Expires soonest'],
  ['expires-desc', 'Expires latest'],
  ['az', 'Title A–Z'],
  ['za', 'Title Z–A'],
];

const byTitle = (a: ClipView, b: ClipView) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true });

export function sortClips(list: ClipView[], key: SortKey): ClipView[] {
  const out = [...list];
  switch (key) {
    case 'expires-asc': return out.sort((a, b) => a.expiresAt - b.expiresAt);
    case 'expires-desc': return out.sort((a, b) => b.expiresAt - a.expiresAt);
    case 'az': return out.sort(byTitle);
    case 'za': return out.sort((a, b) => byTitle(b, a));
    default: return out.sort((a, b) => b.createdAt - a.createdAt);
  }
}

const FOOTERS = [
  'Thank you for not screenshotting.',
  'No refunds. No backups. No regrets.',
  'This receipt will self-destruct.',
];

export interface ClipView extends Clip {
  type: ClipType;
  ext: string;
  /** Stable 4-digit receipt number derived from the id. */
  no: string;
  /** Original lifespan in ms. */
  ttl: number;
  bytes: number;
  url: string | null;
  /** Content minus the leading URL, for link clips. */
  note: string;
  footer: string;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const FILE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|mdx|txt|yml|yaml|toml|sh|bash|zsh|py|rb|go|rs|c|cpp|h|hpp|java|kt|swift|css|scss|less|html|xml|sql|graphql|proto|ini|cfg|env|csv|log)$/i;

function extFor(title: string, type: ClipType, content: string): string {
  const m = title.trim().match(FILE_EXT);
  if (m) return m[1].toUpperCase();
  if (type === 'code' && /^(#!|\$\s)/.test(content.trim())) return 'SH';
  return { text: 'TXT', md: 'MD', code: 'CODE', json: 'JSON', link: 'URL' }[type];
}

export function toView(c: Clip): ClipView {
  const type = detectClipType(c.title, c.content);
  const url = type === 'link' ? leadingUrl(c.content) : null;
  const h = hash(c.id);
  return {
    ...c,
    type,
    ext: extFor(c.title, type, c.content),
    no: String(h % 10000).padStart(4, '0'),
    ttl: Math.max(1, c.expiresAt - c.createdAt),
    bytes: new TextEncoder().encode(c.content).length,
    url,
    note: url ? c.content.trim().slice(url.length).trim() : '',
    footer: FOOTERS[h % FOOTERS.length],
  };
}

export const typeOk = (c: ClipView, f: FilterKey) =>
  f === 'all' || (f === 'code' ? c.type === 'code' || c.type === 'json' : c.type === f);

export const hay = (c: ClipView) => (c.title + ' ' + c.content).toLowerCase();

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function hitCount(c: ClipView, q: string): number {
  if (!q) return 0;
  const m = hay(c).match(new RegExp(escRe(q.toLowerCase()), 'g'));
  return m ? m.length : 0;
}

/** Split text into alternating non-hit / hit segments for highlighting. */
export function segments(text: string, q: string): { t: string; hit: boolean }[] {
  if (!q) return [{ t: text, hit: false }];
  const ql = q.toLowerCase();
  return text
    .split(new RegExp('(' + escRe(q) + ')', 'ig'))
    .filter((p) => p !== '')
    .map((t) => ({ t, hit: t.toLowerCase() === ql }));
}

/** Markdown with the syntax stripped, for previews. */
export const plain = (s: string) =>
  s.replace(/\*\*/g, '').replace(/^#+\s|^\s*[-*] \[[ xX]\]\s|^\s*[-*]\s|^```.*$/gm, '');

export function previewText(c: ClipView): string {
  if (c.type === 'md') return plain(c.content);
  return c.content;
}

/** A window of `text` around the first hit of `q`. */
export function snippet(text: string, q: string, len: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const i = q ? flat.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return flat.slice(0, len) + (flat.length > len ? '…' : '');
  const st = Math.max(0, i - 36);
  const en = Math.min(flat.length, st + len);
  return (st > 0 ? '…' : '') + flat.slice(st, en) + (en < flat.length ? '…' : '');
}

export function fmtLeft(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s <= 0) return 'gone';
  const m = Math.floor(s / 60);
  if (s < 600) return m + ':' + String(s % 60).padStart(2, '0');
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ' + String(m % 60).padStart(2, '0') + 'm';
  const d = Math.floor(h / 24);
  return d + 'd ' + (h % 24) + 'h';
}

export function fmtAgo(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  return Math.floor(m / 60) + 'h ago';
}

export function fmtDuration(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return m + 'M';
  if (m < 1440) {
    const h = Math.floor(m / 60);
    return m % 60 ? `${h}H ${m % 60}M` : `${h}H`;
  }
  const d = Math.floor(m / 1440);
  const remH = Math.round((m % 1440) / 60);
  return remH ? `${d}D ${remH}H` : `${d}D`;
}

export const fmtSize = (b: number) => (b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB');

export const URGENT_MS = 10 * 60 * 1000;

export type Block =
  | { kind: 'h'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'li'; mark: string; done: boolean; text: string }
  | { kind: 'pre'; text: string };

/** Minimal block parse for the reader: headings, checklists, bullets, fences, paragraphs. */
export function blocks(c: ClipView): Block[] {
  if (c.type === 'text') {
    return c.content.split(/\n\s*\n+/).map((text) => ({ kind: 'p', text }));
  }
  const out: Block[] = [];
  const lines = c.content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^```/.test(raw)) {
      const body: string[] = [];
      for (i++; i < lines.length && !/^```/.test(lines[i]); i++) body.push(lines[i]);
      out.push({ kind: 'pre', text: body.join('\n') });
      continue;
    }
    const l = raw.replace(/\*\*/g, '');
    if (!l.trim()) continue;
    let m;
    if ((m = l.match(/^#{1,6}\s+(.*)$/))) out.push({ kind: 'h', text: m[1] });
    else if ((m = l.match(/^\s*[-*] \[([ xX])\]\s(.*)$/))) {
      const done = m[1] !== ' ';
      out.push({ kind: 'li', mark: done ? '[x]' : '[ ]', done, text: m[2] });
    } else if ((m = l.match(/^\s*[-*]\s+(.*)$/))) out.push({ kind: 'li', mark: '—', done: false, text: m[1] });
    else if ((m = l.match(/^\s*(\d+)[.)]\s+(.*)$/))) out.push({ kind: 'li', mark: m[1] + '.', done: false, text: m[2] });
    else out.push({ kind: 'p', text: l });
  }
  return out;
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

export const domain = (u: string) => {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
};
