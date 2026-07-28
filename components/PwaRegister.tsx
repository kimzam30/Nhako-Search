'use client';
import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In development a service worker only causes confusion: it serves stale
    // chunks after an edit and survives restarts, which looks like a broken
    // build. Actively unregister any worker left behind by a previous run.
    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }, []);

  return null;
}
