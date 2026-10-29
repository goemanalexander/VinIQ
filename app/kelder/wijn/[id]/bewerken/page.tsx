'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { getWine, setWineDrinkWindow } from '@/lib/storage';
import { getDrinkWindow } from '@/lib/utils';
import { useGuestView } from '@/components/GuestView';
import type { Wine } from '@/lib/types';

export default function BewerkPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { guest } = useGuestView();
  const [wine, setWine] = useState<Wine | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getWine(params.id).then(w => {
      setWine(w);
      setFrom(w?.drinkFrom?.toString() ?? '');
      setTo(w?.drinkTo?.toString() ?? '');
    }).catch(e => setError(String(e)));
  }, [params.id]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || guest) return;
    setBusy(true); setError('');
    try {
      await setWineDrinkWindow(params.id, from.trim() ? Number(from) : undefined, to.trim() ? Number(to) : undefined);
      router.push('/kelder/wijn/' + params.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
      setBusy(false);
    }
  }
  const suggestion = wine ? getDrinkWindow({ ...wine, drinkFrom: undefined, drinkTo: undefined }) : null;
  return <>
    <PageHeader title="Drinkvenster bewerken" back backHref={`/kelder/wijn/${params.id}`} />
    <div className="space-y-4 px-5 pt-5 pb-12">
      {guest ? <Card><p className="text-sm text-cream-100">Schakel de gastweergave uit om je wijngegevens te wijzigen.</p></Card> :
      wine ? <form onSubmit={save} className="space-y-4">
        <Card className="space-y-4">
          <div><p className="font-display text-lg text-cream-100">{wine.producer} — {wine.wineName}</p><p className="text-sm text-cream-300/60">{wine.vintage ?? 'N.V.'}</p></div>
          <p className="text-sm text-cream-300/70">Stel zelf in wanneer deze wijn het best gedronken wordt. Laat beide velden leeg om de indicatieve periode te gebruiken.</p>
          {suggestion?.from && suggestion.to && <p className="text-sm text-gold-300">Stijlindicatie: {suggestion.from}–{suggestion.to} (niet door producent bevestigd)</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="drinkFrom" className="mb-1 block text-xs text-cream-300/60">Drinken vanaf</label><input id="drinkFrom" type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="Bijv. 2026" value={from} onChange={e => setFrom(e.target.value)} className="w-full rounded-lg bg-navy-800 p-3 text-base text-cream-100" /></div>
            <div><label htmlFor="drinkTo" className="mb-1 block text-xs text-cream-300/60">Drinken tot</label><input id="drinkTo" type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="Bijv. 2032" value={to} onChange={e => setTo(e.target.value)} className="w-full rounded-lg bg-navy-800 p-3 text-base text-cream-100" /></div>
          </div>
          <p className="text-xs text-cream-300/50">Indicaties zijn een algemene inschatting op basis van wijnstijl en jaargang, geen zekerheid over deze fles.</p>
        </Card>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-full bg-gold-500 p-3 text-sm font-semibold text-navy-950 disabled:opacity-50">{busy ? 'Opslaan…' : 'Drinkvenster opslaan'}</button>
      </form> : <p className="text-sm text-cream-300/60">Wijn laden…</p>}
    </div>
  </>;
}
