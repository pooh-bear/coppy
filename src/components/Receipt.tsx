import Hl from './Hl';
import {
  TYPES, URGENT_MS, blocks, domain, fmtAgo, fmtDuration, fmtLeft, fmtSize, type ClipView,
} from '@/lib/clipView';

const FUSE_LEN = 28;

interface ReceiptProps {
  clip: ClipView;
  q?: string;
  now: number;
  style?: React.CSSProperties;
}

/** A clip rendered as a torn-off paper receipt. */
export default function Receipt({ clip, q = '', now, style }: ReceiptProps) {
  const left = clip.expiresAt - now;
  const urgent = left < URGENT_MS;
  const frac = Math.max(0, Math.min(1, left / clip.ttl));
  const filled = Math.round(frac * FUSE_LEN);
  const isCode = clip.type === 'code' || clip.type === 'json';

  const leaders: [string, string][] = [
    ['TYPE', TYPES[clip.type].label.toUpperCase() + ' / ' + clip.ext],
    ['RECEIVED', fmtAgo(now - clip.createdAt).toUpperCase()],
    ['SIZE', fmtSize(clip.bytes)],
    ['LIFESPAN', fmtDuration(clip.ttl)],
  ];

  return (
    <div className="receipt paper-tear" style={style}>
      <div className="receipt-top">
        <span>coppy / clip <span className="receipt-id">{clip.id}</span></span>
        <span>No.{clip.no}</span>
      </div>
      <h2 className="receipt-title"><Hl text={clip.title} q={q} /></h2>
      <div className="leaders">
        {leaders.map(([k, v]) => (
          <div key={k} className="leader">
            <span className="leader-k">{k}</span>
            <span className="leader-dots" />
            <span className="leader-v">{v}</span>
          </div>
        ))}
      </div>

      {(clip.type === 'text' || clip.type === 'md') && (
        <div className="prose">
          {blocks(clip).map((b, i) => {
            if (b.kind === 'h') return <h3 key={i}><Hl text={b.text} q={q} /></h3>;
            if (b.kind === 'p') return <p key={i}><Hl text={b.text} q={q} /></p>;
            if (b.kind === 'pre') return <pre key={i} className="prose-pre"><Hl text={b.text} q={q} /></pre>;
            return (
              <div key={i} className={`li${b.done ? ' done' : ''}`}>
                <span className="li-mark">{b.mark}</span>
                <span className="li-text"><Hl text={b.text} q={q} /></span>
              </div>
            );
          })}
        </div>
      )}

      {isCode && (
        <div className="code-block">
          {clip.content.split('\n').map((l, i) => (
            <div key={i} className="code-line">
              <span className="code-n">{i + 1}</span>
              <span className="code-t"><Hl text={l || ' '} q={q} /></span>
            </div>
          ))}
        </div>
      )}

      {clip.type === 'link' && clip.url && (
        <>
          <a className="link-card" href={clip.url} target="_blank" rel="noopener noreferrer">
            <span className="link-domain">{domain(clip.url)} ↗</span>
            <span className="link-url"><Hl text={clip.url} q={q} /></span>
          </a>
          {clip.note && <p className="receipt-note"><Hl text={clip.note} q={q} /></p>}
        </>
      )}

      <div className="receipt-foot">
        <div
          className="fuse-row"
          title={'Self-destructs at ' + new Date(clip.expiresAt).toLocaleTimeString()}
        >
          <span>self-destructs in</span>
          <span className={urgent ? 'urgent' : undefined}>{fmtLeft(left)}</span>
        </div>
        <div className={`fuse${urgent ? ' urgent' : ''}`}>
          {'█'.repeat(filled) + '░'.repeat(FUSE_LEN - filled)}
        </div>
        <span className="receipt-footer">{clip.footer}</span>
      </div>
    </div>
  );
}
