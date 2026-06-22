'use client';

import { useState, useEffect, useCallback } from 'react';

interface TimeRemainingProps {
  expiresAt: number;
}

export default function TimeRemaining({ expiresAt }: TimeRemainingProps) {
  const calcRemaining = useCallback(() => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return { total: 0, minutes: 0, seconds: 0 };
    return {
      total: diff,
      minutes: Math.floor(diff / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  }, [expiresAt]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(calcRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, [calcRemaining]);

  if (remaining.total <= 0) {
    return <span className="text-red-400 text-xs">Expired</span>;
  }

  return (
    <span className="text-coppy-muted text-xs">
      {remaining.minutes > 0 ? `${remaining.minutes}m ` : ''}
      {remaining.seconds}s remaining
    </span>
  );
}
