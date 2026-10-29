'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const GuestContext = createContext<{ guest: boolean; setGuest: (value: boolean) => void }>({
  guest: false, setGuest: () => {},
});
const KEY = 'viniq-guest-view';

export function useGuestView() {
  return useContext(GuestContext);
}

export function GuestViewProvider({ children }: { children: ReactNode }) {
  const [guest, setGuestState] = useState<boolean | null>(null);
  useEffect(() => {
    try { setGuestState(window.sessionStorage.getItem(KEY) === 'true'); } catch { /* private mode */ }
  }, []);
  function setGuest(value: boolean) {
    setGuestState(value);
    try { window.sessionStorage.setItem(KEY, String(value)); } catch { /* private mode */ }
  }
  // Render no private data until this tab's privacy preference has been read.
  if (guest === null) return null;
  return <GuestContext.Provider value={{ guest, setGuest }}>
    <div className="mx-auto flex max-w-md justify-end px-5 pt-2">
      <button type="button" aria-pressed={guest} aria-label={guest ? 'Gastweergave uitschakelen' : 'Gastweergave inschakelen'}
        onClick={() => setGuest(!guest)}
        title={guest ? "Gastweergave uitschakelen" : "Gastweergave inschakelen: verberg prijzen"}
        className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium ${guest ? 'border-gold-500 bg-gold-500/20 text-gold-300' : 'border-gold-500/20 text-cream-300/60'}`}>
        {guest ? <EyeOff size={14} /> : <Eye size={14} /> }
        {guest ? 'Gast aan' : 'Gastweergave'}
      </button>
    </div>
    {children}
  </GuestContext.Provider>;
}
