'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wine, Grid3X3, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { getCellarSummary, getAllWinesWithCount } from '@/lib/storage';
import { formatCurrency, DRINK_WINDOW_COLOR, DRINK_WINDOW_LABEL } from '@/lib/utils';
import type { CellarSummary, WineWithCount } from '@/lib/types';
import { APP_VERSION } from '@/lib/version';

export default function DashboardPage() {
  const [summary, setSummary] = useState<CellarSummary | null>(null);
  const [wines, setWines] = useState<WineWithCount[]>([]);

  useEffect(() => {
    getCellarSummary().then(setSummary);
    getAllWinesWithCount().then(setWines);
  }, []);

  const activeWines = wines.filter(w => w.bottleCount > 0);

  return (
    <>
      <PageHeader />
      <div className="px-5 pt-4 pb-8">

        {/* Summary cards */}
        {summary && (
          <section className="mb-6">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Card className="text-center py-4">
                <p className="font-display text-3xl text-cream-100">{summary.totalBottles}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-cream-300/50">Flessen</p>
              </Card>
              <Card className="text-center py-4">
                <p className="font-display text-3xl text-cream-100">{summary.uniqueWines}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-cream-300/50">Wijnen</p>
              </Card>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Card className="text-center py-4">
                <p className="font-display text-2xl text-gold-300">{formatCurrency(summary.purchaseValue)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-cream-300/50">Aankoopwaarde</p>
              </Card>
              <Card className="text-center py-4">
                <p className="font-display text-2xl text-gold-300">{formatCurrency(summary.marketValue)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-cream-300/50">Marktwaarde</p>
                {summary.valueDifference !== 0 && (
                  <p className={`mt-1 text-xs ${summary.valueDifference > 0 ? 'text-green-400' : 'text-burgundy-400'}`}>
                    {summary.valueDifference > 0 ? '+' : ''}{formatCurrency(summary.valueDifference)}
                  </p>
                )}
              </Card>
            </div>
            {/* Rack occupancy */}
            <Card className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-sm text-cream-300/60">
                <Grid3X3 size={14} className="text-gold-400/70" />
                <span>Rekbezetting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 rounded-full bg-navy-700">
                  <div
                    className="h-full rounded-full bg-gold-500"
                    style={{ width: `${Math.min(100, (summary.bottlesInRack / summary.rackCapacity) * 100)}%` }}
                  />
                </div>
                <span className="text-sm text-cream-200">
                  {summary.bottlesInRack}/{summary.rackCapacity}
                </span>
              </div>
            </Card>
          </section>
        )}

        {/* Quick actions */}
        <section className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            {/* Stub: toevoegen is Phase 2 */}
            <div title="Beschikbaar in fase 2" className="cursor-not-allowed">
              <Card className="flex flex-col gap-2 p-3.5 opacity-40">
                <Plus size={18} strokeWidth={1.6} className="text-cream-300/50" />
                <span className="font-display text-sm text-cream-200">Fles toevoegen</span>
                <span className="text-[10px] text-cream-300/50 uppercase tracking-wide">Binnenkort</span>
              </Card>
            </div>
            <Link href="/kelder/rek">
              <Card className="flex flex-col gap-2 p-3.5 transition-transform active:scale-[0.98]">
                <Grid3X3 size={18} strokeWidth={1.6} className="text-gold-400/70" />
                <span className="font-display text-sm text-cream-100">Bekijk rek</span>
              </Card>
            </Link>
          </div>
        </section>

        {/* Wine list */}
        {activeWines.length > 0 && (
          <section className="mb-6">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wine size={14} className="text-gold-400" />
                <h2 className="font-display text-sm font-medium uppercase tracking-wide text-gold-400/80">
                  Mijn Kelder
                </h2>
              </div>
              <Link href="/kelder" className="text-xs text-cream-300/40 hover:text-cream-200">
                Alles bekijken →
              </Link>
            </div>
            <Card className="divide-y divide-gold-500/10 p-1">
              {activeWines.slice(0, 6).map((wine) => (
                <Link
                  key={wine.id}
                  href={`/kelder/wijn/${wine.id}`}
                  className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-cream-100/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-cream-100">
                      {wine.producer} — {wine.wineName}
                    </p>
                    <p className="text-xs text-cream-300/50">
                      {wine.vintage ?? 'N.V.'} · {wine.region}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="font-display text-base text-cream-100">×{wine.bottleCount}</span>
                    <span className={`text-[10px] ${DRINK_WINDOW_COLOR[wine.drinkWindowStatus]}`}>
                      {wine.drinkWindowStatus !== 'unknown'
                        ? DRINK_WINDOW_LABEL[wine.drinkWindowStatus].split(' — ')[0]
                        : ''}
                    </span>
                  </div>
                </Link>
              ))}
            </Card>
          </section>
        )}

        {/* Empty state */}
        {activeWines.length === 0 && (
          <Card className="py-10 text-center">
            <p className="font-display text-3xl">🍾</p>
            <p className="mt-3 font-display text-base text-cream-100">Kelder is leeg</p>
            <p className="mt-1 text-sm text-cream-300/60">Voeg je eerste fles toe om te beginnen.</p>
            <Link
              href="/kelder/toevoegen"
              className="mt-4 inline-block rounded-full bg-gold-500 px-6 py-2.5 text-sm font-semibold text-navy-950"
            >
              Fles toevoegen
            </Link>
          </Card>
        )}

        <p className="text-center text-[10px] text-cream-300/20 mt-4">{APP_VERSION}</p>
      </div>
    </>
  );
}
