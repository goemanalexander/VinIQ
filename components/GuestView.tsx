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
  const [guest, setGuestState] = useState(false);
  useEffect(() => {
    try { setGuestState(window.sessionStorage.getItem(KEY) === 'true'); } catch { /* private mode */ }
  }, []);
  function setGuest(value: boolean) {
    setGuestState(value);
    try { window.sessionStorage.setItem(KEY, String(value)); } catch { /* private mode */ }
  }
  return <GuestContext.Provider value={{ guest, setGuest }}>
    <div className="mx-auto max-w-md px-5 pt-2">
      <button type="button" aria-pressed={guest} aria-label={guest ? 'Gastweergave uitschakelen' : 'Gastweergave inschakelen'}
        onClick={() => setGuest(!guest)}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${guest ? 'border-gold-500 bg-gold-500/20 text-gold-300' : 'border-gold-500/20 text-cream-300/60'}`}>
        {guest ? <EyeOff size={15} /> : <Eye size={15} />}
        {guest ? 'Gastweergave aan · prijzen verborgen · tik om te stoppen' : 'Gastweergave · verberg prijzen'}
      </button>
    </div>
    {children}
  </GuestContext.Provider>;
}
