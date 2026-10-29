'use client';
import { useEffect } from 'react';
import { syncCellar } from '@/lib/sync-manager';

export default function ClientInit() {
  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const result = await syncCellar();
        if (active) window.dispatchEvent(new CustomEvent('viniq-sync-status', { detail: result }));
      } catch {
        if (active) window.dispatchEvent(new CustomEvent('viniq-sync-status', { detail: 'error' }));
      }
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') void run(); };
    const onCloudUpdated = () => { window.location.reload(); };
    window.addEventListener('viniq-cloud-updated', onCloudUpdated);
    const onStorage = (event: StorageEvent) => { if (event.key === 'viniq-cellar-v1') window.location.reload(); };
    window.addEventListener('viniq-cellar-changed', run);
    window.addEventListener('online', run);
    window.addEventListener('focus', run);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(run, 45000);
    void run();
    return () => {
      active = false;
      window.removeEventListener('viniq-cellar-changed', run);
      window.removeEventListener('online', run);
      window.removeEventListener('focus', run);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('viniq-cloud-updated', onCloudUpdated);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, []);
  return null;
}
