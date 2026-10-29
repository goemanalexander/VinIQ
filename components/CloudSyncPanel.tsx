'use client';
import { useCallback, useEffect, useState } from 'react';
import { currentUser, signIn, signUp, signOut, type SignedInUser } from '@/lib/neon-auth-client';
import { syncCellar, resolveCloudConflict, type CloudStatus } from '@/lib/sync-manager';
import { exportLocalCellarSnapshot } from '@/lib/storage';

export default function CloudSyncPanel() {
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [status, setStatus] = useState<CloudStatus>('signed-out');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [register, setRegister] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const account = await currentUser();
      setUser(account);
      if (account) setStatus(await syncCellar());
      else setStatus('signed-out');
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Synchronisatie mislukt'); setStatus('error'); }
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = () => { void refresh(); };
    window.addEventListener('viniq-cellar-changed', onChanged);
    window.addEventListener('online', onChanged);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(() => { void refresh(); }, 60000);
    return () => {
      window.removeEventListener('viniq-cellar-changed', onChanged);
      window.removeEventListener('online', onChanged);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [refresh]);

  async function authenticate() {
    setBusy(true); setError('');
    try {
      if (register) await signUp(name, email, password);
      else await signIn(email, password);
      setPassword('');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Aanmelden mislukt'); }
    finally { setBusy(false); }
  }

  function backup() {
    const json = JSON.stringify(exportLocalCellarSnapshot(), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'viniq-backup.json'; a.click();
    URL.revokeObjectURL(url);
  }

  async function resolve(choice: 'local' | 'cloud') {
    if (!window.confirm(choice === 'local' ? 'De lokale kelder wordt naar de cloud geschreven. Eerst een back-up downloaden?' : 'De cloudkelder vervangt de lokale kelder. Download eerst een back-up. Doorgaan?')) return;
    setBusy(true);
    try {
      await resolveCloudConflict(choice);
      await refresh();
      if (choice === 'cloud') window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Conflict niet opgelost'); }
    finally { setBusy(false); }
  }

  return (
    <section className="mb-5 rounded-xl border border-gold-500/30 p-4 text-sm text-cream-100">
      <h2 className="mb-2 font-semibold">Cloudsynchronisatie</h2>
      {user ? (
        <>
          <p className="mb-2 text-xs">{user.email} · {status === 'synced' ? 'Gesynchroniseerd' : status === 'conflict' ? 'Kies welke kelder je wilt bewaren' : status === 'offline' ? 'Offline' : status === 'error' ? 'Fout bij synchroniseren' : 'Bezig'}</p>
          {status === 'conflict' && <div className="mb-3 flex flex-wrap gap-2">
            <button disabled={busy} className="rounded border border-gold-500/40 px-3 py-2" onClick={backup}>Download lokale back-up</button>
            <button disabled={busy} className="rounded border border-gold-500/40 px-3 py-2" onClick={() => void resolve('local')}>Lokale kelder behouden</button>
            <button disabled={busy} className="rounded border border-gold-500/40 px-3 py-2" onClick={() => void resolve('cloud')}>Cloudkelder gebruiken</button>
          </div>}
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => void refresh()} className="rounded border border-gold-500/40 px-3 py-2">Nu synchroniseren</button>
            <button disabled={busy} onClick={() => void signOut().then(() => { setUser(null); setStatus('signed-out'); }).catch(e => setError(String(e)))} className="rounded border border-gold-500/40 px-3 py-2">Afmelden</button>
          </div>
        </>
      ) : (
        <form className="space-y-2" onSubmit={e => { e.preventDefault(); void authenticate(); }}>
          {register && <input required value={name} onChange={e => setName(e.target.value)} placeholder="Naam" className="w-full rounded bg-navy-800 p-2" />}
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mailadres" className="w-full rounded bg-navy-800 p-2" />
          <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Wachtwoord" className="w-full rounded bg-navy-800 p-2" />
          <button disabled={busy} className="rounded bg-gold-500 px-4 py-2 text-navy-950">{register ? 'Account aanmaken' : 'Aanmelden'}</button>
          <button type="button" onClick={() => setRegister(!register)} className="ml-3 text-xs underline">{register ? 'Ik heb al een account' : 'Nieuw account'}</button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
    </section>
  );
}
