'use client';

import { useState } from 'react';
import { IconCopy, IconCheck } from './Icons';

interface CopyButtonProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CopyButton({ content, className, style }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleCopy(); }}
      className={`item-copy-btn${copied ? ' copied' : ''}${className ? ' ' + className : ''}`}
      style={style}
    >
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
