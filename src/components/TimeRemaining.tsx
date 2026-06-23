'use client';

import { useState, useEffect } from 'react';
import { IconCheck } from './Icons';

interface TimeRemainingProps {
  expiresAt: number;
}

export default function TimeRemaining({ expiresAt }: TimeRemainingProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = Math.max(0, expiresAt - now);
  const total = expiresAt - (now - remaining); // approximate for progress
  // We estimate total from expiresAt and a rough age: use 1h default fallback
  const totalSec = 3600; // default TTL fallback
  const remainingSec = Math.ceil(remaining / 1000);
  const ratio = Math.max(0, Math.min(1, remaining / (3600 * 1000)));

  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;

  let label: string;
  let statusClass = 'fresh';
  if (remainingSec <= 0) {
    label = 'Expired';
    statusClass = 'danger';
  } else if (remainingSec <= 60) {
    label = `${remainingSec}s`;
    statusClass = 'danger';
  } else if (remainingSec <= 600) {
    label = `${minutes}m ${seconds}s`;
    statusClass = 'warning';
  } else if (minutes < 60) {
    label = `${minutes}m`;
  } else {
    label = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  const barClass = remainingSec <= 60 ? 'danger' : remainingSec <= 600 ? 'warning' : 'fresh';

  return (
    <div className="item-ttl" title={`${minutes}m ${seconds}s remaining`}>
      <IconCheck />
      {label}
    </div>
  );
}

export function TtlBar({ expiresAt, className }: { expiresAt: number; className?: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = Math.max(0, expiresAt - now);
  const remainingSec = Math.ceil(remaining / 1000);
  const totalSec = 3600; // default TTL
  const ratio = Math.max(0, Math.min(1, remaining / (totalSec * 1000)));

  const barClass = remainingSec <= 60 ? 'danger' : remainingSec <= 600 ? 'warning' : 'fresh';

  return (
    <div className={`ttl-bar${className ? ' ' + className : ''}`}>
      <div className={`ttl-bar-fill ${barClass}`} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}
