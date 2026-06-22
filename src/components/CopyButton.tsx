'use client';

import { useState } from 'react';

interface CopyButtonProps {
  content: string;
}

export default function CopyButton({ content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
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
      onClick={handleCopy}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-coppy-primary/20 text-coppy-secondary border border-coppy-primary/30 hover:bg-coppy-primary/30 hover:border-coppy-primary/50'
      }`}
    >
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  );
}
