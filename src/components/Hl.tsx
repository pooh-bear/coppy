import { segments } from '@/lib/clipView';

/** Text with every occurrence of `q` highlighted. */
export default function Hl({ text, q }: { text: string; q: string }) {
  return (
    <>
      {segments(text, q).map((s, i) =>
        s.hit ? <mark key={i} className="hl">{s.t}</mark> : <span key={i}>{s.t}</span>
      )}
    </>
  );
}
