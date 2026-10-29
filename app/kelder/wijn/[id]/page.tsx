'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import WineLabelPhoto from '@/components/WineLabelPhoto';
import { getWineWithCount, getBottles, getAcquisitions, addBottleToCellar, moveCellarBottle, removeCellarBottle, getRackGrid } from '@/lib/storage';
import {
  formatCurrency, formatCurrencyExact, formatLocation,
  DRINK_WINDOW_LABEL, DRINK_WINDOW_COLOR
} from '@/lib/utils';
import type { WineWithCount, Bottle, Acquisition } from '@/lib/types';
import { useGuestView } from '@/components/GuestView';
import { getDrinkWindow, getPersonalDrinkMoment } from '@/lib/utils';

const COLOR_NL: Record<string, string> = {
  red: 'Rood', white: 'Wit', rosé: 'Rosé', sparkling: 'Mousseux', other: 'Overig',
};

export default function WijnDetailPage({ params }: { params: { id: string } }) {
  const { guest } = useGuestView();
  const router = useRouter();
  const [wine, setWine] = useState<WineWithCount | null>(null);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);


  const [selectedBottle, setSelectedBottle] = useState('');
  const [position, setPosition] = useState('outside');
  const [price, setPrice] = useState('');
  const [gift, setGift] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [freePositions, setFreePositions] = useState<string[]>([]);
  async function refresh() {
    const [w, b, a, grid] = await Promise.all([getWineWithCount(params.id), getBottles(params.id), getAcquisitions(params.id), getRackGrid()]);
    setWine(w); setBottles(b); setAcquisitions(a);
    setSelectedBottle(previous => b.some(x => x.id === previous) ? previous : (b[0]?.id ?? ''));
    setFreePositions(['A','B','C','D'].flatMap(row => [1,2,3,4,5,6].filter(col => !grid[row as 'A'|'B'|'C'|'D']?.[col as 1|2|3|4|5|6]).map(col => row+col)));
  }
  function location(value: string) {
    return value === 'outside' ? { type: 'outside' as const } : { type: 'rack' as const, row: value[0] as 'A'|'B'|'C'|'D', col: Number(value.slice(1)) as 1|2|3|4|5|6 };
  }
  async function action(kind: 'add'|'move'|'drank'|'gifted_away') {
    if (busy || guest) return;
    if (kind !== 'add' && !selectedBottle) return;
    if (kind !== 'add' && !window.confirm(kind === 'move' ? 'Deze fles verplaatsen?' : 'Deze fles uit de voorraad halen?')) return;
    setBusy(true); setError('');
    try {
      if (kind === 'add') await addBottleToCellar(params.id, location(position), Number(price.trim().replace(',', '.') || 0), gift);
      else if (kind === 'move') await moveCellarBottle(selectedBottle, location(position));
      else await removeCellarBottle(selectedBottle, kind);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Er ging iets mis'); }
    finally { setBusy(false); }
  }

  useEffect(() => { refresh().catch(e => setError(String(e))); }, [params.id]);

  if (!wine) return null;

  const personalMoment = getPersonalDrinkMoment(wine);
  const locationCounts = new Map<string, number>();
  const bottleLabels = bottles.map(b => {
    const name = formatLocation(b.location);
    const count = (locationCounts.get(name) ?? 0) + 1;
    locationCounts.set(name, count);
    const duplicates = bottles.filter(other => formatLocation(other.location) === name).length > 1;
    return duplicates ? `${name} · fles ${count}` : name;
  });
  const totalPurchaseValue = wine.avgPurchasePrice * wine.bottleCount;
  const totalMarketValue = (wine.latestMarketValue ?? wine.avgPurchasePrice) * wine.bottleCount;

  return (
    <>
      <PageHeader title={wine.wineName} subtitle={wine.producer} back backHref="/kelder" />
      <div className="px-5 pb-8 pt-4 space-y-4">

        {/* Identity card */}
        <Card>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-display text-xl text-cream-100">{wine.producer}</p>
              <p className="text-base text-gold-300">{wine.wineName} {wine.vintage ?? 'N.V.'}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl text-cream-100">×{wine.bottleCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-cream-300/40">flessen</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {wine.region && <div><span className="text-cream-300/50">Regio </span><span className="text-cream-200">{wine.region}</span></div>}
            {wine.appellation && <div><span className="text-cream-300/50">Appellatie </span><span className="text-cream-200">{wine.appellation}</span></div>}
            {wine.grapes.length > 0 && <div><span className="text-cream-300/50">Druif </span><span className="text-cream-200">{wine.grapes.join(', ')}</span></div>}
            <div><span className="text-cream-300/50">Type </span><span className="text-cream-200">{COLOR_NL[wine.color] ?? wine.color}</span></div>
            {wine.bottleSizeML !== 750 && <div><span className="text-cream-300/50">Formaat </span><span className="text-cream-200">{wine.bottleSizeML} ml</span></div>}
            {wine.personalRating > 0 && <div><span className="text-cream-300/50">Beoordeling </span><span className="text-gold-300">{wine.personalRating}/10</span></div>}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className={`text-xs ${DRINK_WINDOW_COLOR[wine.drinkWindowStatus]}`}>
              {DRINK_WINDOW_LABEL[wine.drinkWindowStatus]}
              {getDrinkWindow(wine).from && getDrinkWindow(wine).to ? ` (${getDrinkWindow(wine).from}–${getDrinkWindow(wine).to})` : ''}
              {getDrinkWindow(wine).estimated && getDrinkWindow(wine).from ? ' · indicatie' : ''}
            </p>
            {!guest && <Link href={`/kelder/wijn/${params.id}/bewerken`} className="shrink-0 text-xs text-gold-300 underline">Aanpassen</Link>}
          </div>
          {personalMoment && <div className="mt-3 rounded-lg border border-gold-500/20 bg-gold-500/5 p-3">
            <p className="text-xs font-semibold text-gold-300">Voor jouw smaak: {personalMoment.from}{personalMoment.to !== personalMoment.from ? `–${personalMoment.to}` : ''}</p>
            <p className="mt-1 text-xs text-cream-300/70">{personalMoment.reason}</p>
            <p className="mt-1 text-[11px] text-cream-300/50">Persoonlijke inschatting binnen het drinkvenster, geen garantie.</p>
          </div>}
          {wine.notes && (
            <p className="mt-3 whitespace-pre-line text-sm text-cream-300/60 italic">{wine.notes}</p>
          )}
        </Card>

        {!guest && <Card><WineLabelPhoto wineId={wine.id} imageUrl={wine.imageUrl} onSaved={refresh} /></Card>}
        {guest && wine.imageUrl && <Card><img src={wine.imageUrl} alt="Wijnetiket" className="max-h-64 w-full object-contain" /></Card>}
        {!guest && <Link href={`/kelder/wijn/${params.id}/proeven`} className="block rounded-xl bg-gold-500 px-4 py-3 text-center text-sm font-semibold text-navy-950">🍷 Vijf proefvragen beantwoorden</Link>}

        {/* Value card */}
        {!guest && <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold-300">Waarde van je voorraad</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-cream-300/50 mb-0.5">Aankoop/fl.</p>
              <p className="font-display text-2xl text-cream-100">{formatCurrencyExact(wine.avgPurchasePrice)}</p>
              <p className="text-[10px] text-cream-300/40">Totaal {formatCurrency(totalPurchaseValue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-cream-300/50 mb-0.5">Marktwaarde/fl.</p>
              <p className="font-display text-2xl text-gold-300">
                {formatCurrencyExact(wine.latestMarketValue ?? wine.avgPurchasePrice)}
              </p>
              <p className="text-[10px] text-cream-300/40">Totaal {formatCurrency(totalMarketValue)}</p>
            </div>
          </div>
        </Card>}

        {/* Bottle locations */}
        {bottles.length > 0 && (
          <Card>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-cream-300/40">
              Flessen ({bottles.length})
            </p>
            <div className="space-y-1.5">
              {bottles.map((b, i) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="text-cream-300/60">Fles {i + 1}</span>
                  <span className="text-cream-200">{formatLocation(b.location)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Acquisition history */}
        {acquisitions.length > 0 && (
          <Card>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-cream-300/40">
              Aankoophistoriek
            </p>
            {acquisitions.map(a => (
              <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-gold-500/10 last:border-0 text-sm">
                <div>
                  <span className="text-cream-200">{a.date}</span>
                  {a.retailer && <span className="text-cream-300/50 ml-2">· {a.retailer}</span>}
                  <span className="text-cream-300/40 ml-2">× {a.quantity}</span>
                </div>
                <span className="text-gold-300">
                  {a.type === 'gift' ? 'Geschenk' : guest ? 'Aangekocht' : formatCurrencyExact(a.pricePerBottle)}
                </span>
              </div>
            ))}
          </Card>
        )}


        {!guest && <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-cream-300/60">Voorraad beheren</p>
          <label className="block text-xs text-cream-300/60">Fles kiezen</label>
          <select value={selectedBottle} onChange={e => setSelectedBottle(e.target.value)} className="w-full rounded-lg bg-navy-800 p-3 text-sm text-cream-100">
            {bottles.map((b, i) => <option key={b.id} value={b.id}>{bottleLabels[i]}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy || !selectedBottle} onClick={() => action('drank')} className="rounded-lg bg-burgundy-700 p-3 text-sm text-white disabled:opacity-40">🍷 Opgedronken</button>
            <button disabled={busy || !selectedBottle} onClick={() => action('gifted_away')} className="rounded-lg border border-gold-500/30 p-3 text-sm text-cream-100 disabled:opacity-40">🎁 Weggegeven</button>
          </div>
          <label className="block text-xs text-cream-300/60">Nieuwe positie (verplaatsen of toevoegen)</label>
          <select value={position} onChange={e => setPosition(e.target.value)} className="w-full rounded-lg bg-navy-800 p-3 text-sm text-cream-100">
            <option value="outside">Buiten rek</option>
            {freePositions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button disabled={busy || !selectedBottle} onClick={() => action('move')} className="w-full rounded-lg border border-gold-500/30 p-3 text-sm text-cream-100 disabled:opacity-40">Fles verplaatsen</button>
          <div className="border-t border-gold-500/20 pt-3">
            <p className="mb-2 text-sm text-cream-100">Extra fles van deze wijn toevoegen</p>
            <label className="flex items-center gap-2 text-sm text-cream-200"><input type="checkbox" checked={gift} onChange={e => setGift(e.target.checked)} /> Geschenk</label>
            {!gift && <input type="text" inputMode="decimal" autoComplete="off" placeholder="Aankoopprijs per fles (€)" value={price} onChange={e => setPrice(e.target.value)} className="mt-2 w-full rounded-lg bg-navy-800 p-3 text-sm text-cream-100" />}
            <button disabled={busy || (!gift && (!price.trim() || !Number.isFinite(Number(price.trim().replace(',', '.'))) || Number(price.trim().replace(',', '.')) < 0))} onClick={() => action('add')} className="mt-2 w-full rounded-lg bg-gold-600 p-3 text-sm font-semibold text-navy-950 disabled:opacity-40">+ Fles toevoegen</button>
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <p className="text-xs text-cream-300/40">Wijzigingen worden voorlopig alleen op dit toestel opgeslagen.</p>
        </Card>}
      </div>
    </>
  );
}
