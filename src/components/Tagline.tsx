'use client';

import { useEffect, useState } from 'react';

const TAGLINES = [
  'Win9X noncompatible',
  'Lab tested on GLaDOS',
  'Not peeking, swearsies!',
  'It’s like ASCII Snapchat',
  'Assistant to the assistant',
  'Ctrl+C, Ctrl+Gone',
  'Best before: idk',
  '100% paper free',
];

/** Byline under the logo; a fresh one on every page load. */
export default function Tagline() {
  // Picked after mount so server and client markup agree.
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    setLine(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
  }, []);
  return <span className="tagline">{line}</span>;
}
