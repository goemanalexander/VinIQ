'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { getWineWithCount, getBottles, getAcquisitions } from '@/lib/storage';
import {
  formatCurrency, formatCurrencyExact, formatLocation,
  DRINK_WINDOW_LABEL, DRINK_WINDOW_COLOR
} from '@/lib/utils';
import type { WineWithCount, Bottle, Acquisition } from '@/lib/types';

const COLOR_NL: Record<string, string> = {
  red: 'Rood', white: 'Wit', rosé: 'Rosé', sparkling: 'Mousseux', other: 'Overig',
};

export default function WijnDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [wine, setWine] = useState<WineWithCount | null>(null);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);

  useEffect(() => {
    getWineWithCount(params.id).then(w => {
      if (!w) { router.replace('/kelder'); return; }
      setWine(w);
    });
    getBottles(params.id).then(setBottles);
    getAcquisitions(params.id).then(setAcquisitions);
  }, [params.id, router]);

  if (!wine) return null;

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
          {wine.drinkWindowStatus !== 'unknown' && (
            <p className={`mt-3 text-xs ${DRINK_WINDOW_COLOR[wine.drinkWindowStatus]}`}>
              {DRINK_WINDOW_LABEL[wine.drinkWindowStatus]}
              {wine.drinkFrom && wine.drinkTo ? ` (${wine.drinkFrom}–${wine.drinkTo})` : ''}
            </p>
          )}
          {wine.notes && (
            <p className="mt-3 text-sm text-cream-300/60 italic">{wine.notes}</p>
          )}
        </Card>

        {/* Value card */}
        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-cream-300/40">Waarde</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-cream-300/50 mb-0.5">Aankoop/fl.</p>
              <p className="font-display text-lg text-cream-200">{formatCurrencyExact(wine.avgPurchasePrice)}</p>
              <p className="text-[10px] text-cream-300/40">Totaal {formatCurrency(totalPurchaseValue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-cream-300/50 mb-0.5">Marktwaarde/fl.</p>
              <p className="font-display text-lg text-gold-300">
                {formatCurrencyExact(wine.latestMarketValue ?? wine.avgPurchasePrice)}
              </p>
              <p className="text-[10px] text-cream-300/40">Totaal {formatCurrency(totalMarketValue)}</p>
            </div>
          </div>
        </Card>

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
                  {a.type === 'gift' ? 'Geschenk' : formatCurrencyExact(a.pricePerBottle)}
                </span>
              </div>
            ))}
          </Card>
        )}

        {/* Actions — stubs: disabled until Phase 2 */}
        <Card className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-cream-300/30 mb-3">
            Acties — beschikbaar in fase 2
          </p>
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-full bg-navy-700 py-3 text-sm font-semibold text-cream-300/30 cursor-not-allowed"
            title="Beschikbaar in fase 2"
          >
            🍷 Opdrinken
            <span className="rounded-full border border-cream-300/20 px-2 py-0.5 text-[10px] font-normal tracking-wide">
              Binnenkort
            </span>
          </button>
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gold-500/10 py-3 text-sm font-semibold text-cream-300/30 cursor-not-allowed"
            title="Beschikbaar in fase 2"
          >
            Verplaatsen
            <span className="rounded-full border border-cream-300/20 px-2 py-0.5 text-[10px] font-normal tracking-wide">
              Binnenkort
            </span>
          </button>
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gold-500/10 py-2.5 text-sm text-cream-300/30 cursor-not-allowed"
            title="Beschikbaar in fase 2"
          >
            Bewerken
            <span className="rounded-full border border-cream-300/20 px-2 py-0.5 text-[10px] font-normal tracking-wide">
              Binnenkort
            </span>
          </button>
        </Card>
      </div>
    </>
  );
}
