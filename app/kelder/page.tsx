'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { getAllWinesWithCount } from '@/lib/storage';
import { DRINK_WINDOW_COLOR, DRINK_WINDOW_LABEL, formatCurrency } from '@/lib/utils';
import type { WineWithCount } from '@/lib/types';

export default function KelderPage() {
  const [wines, setWines] = useState<WineWithCount[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    getAllWinesWithCount().then(all => setWines(all.filter(w => w.bottleCount > 0)));
  }, []);

  const filtered = query.trim()
    ? wines.filter(w =>
        w.producer.toLowerCase().includes(query.toLowerCase()) ||
        w.wineName.toLowerCase().includes(query.toLowerCase()) ||
        w.region.toLowerCase().includes(query.toLowerCase()) ||
        String(w.vintage ?? '').includes(query) ||
        w.grapes.some(g => g.toLowerCase().includes(query.toLowerCase()))
      )
    : wines;

  const totalBottles = wines.reduce((s, w) => s + w.bottleCount, 0);

  return (
    <>
      <PageHeader title="Mijn Kelder" subtitle={`${totalBottles} fles${totalBottles !== 1 ? 'sen' : ''}`} />
      <div className="px-5 pb-8 pt-4">

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-300/40" />
          <input
            type="text"
            placeholder="Zoek producent, regio, jaargang…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gold-500/20 bg-navy-800/60 py-2.5 pl-9 pr-4 text-sm text-cream-100 placeholder-cream-300/30 outline-none focus:border-gold-500/50"
          />
        </div>

        {/* Add button — stub until Phase 2 */}
        <div className="mb-5">
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-full bg-navy-700 py-2.5 text-sm font-semibold text-cream-300/30 cursor-not-allowed"
            title="Beschikbaar in fase 2"
          >
            <Plus size={15} />
            Fles toevoegen
            <span className="rounded-full border border-cream-300/20 px-2 py-0.5 text-[10px] font-normal">
              Binnenkort
            </span>
          </button>
        </div>

        {/* Wine list */}
        {filtered.length > 0 ? (
          <Card className="divide-y divide-gold-500/10 p-1">
            {filtered.map((wine) => (
              <Link
                key={wine.id}
                href={`/kelder/wijn/${wine.id}`}
                className="flex items-start gap-3 rounded-xl px-3 py-3.5 transition-colors hover:bg-cream-100/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-cream-100">
                    {wine.producer} — {wine.wineName}
                  </p>
                  <p className="text-xs text-cream-300/60">
                    {wine.vintage ?? 'N.V.'} · {wine.region}
                  </p>
                  <p className={`mt-1 text-[11px] ${DRINK_WINDOW_COLOR[wine.drinkWindowStatus]}`}>
                    {DRINK_WINDOW_LABEL[wine.drinkWindowStatus]}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-right shrink-0">
                  <span className="font-display text-xl text-cream-100">×{wine.bottleCount}</span>
                  {wine.avgPurchasePrice > 0 && (
                    <span className="text-[11px] text-cream-300/40">
                      {formatCurrency(wine.avgPurchasePrice)}/fl.
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </Card>
        ) : wines.length === 0 ? (
          <Card className="py-10 text-center">
            <p className="font-display text-3xl">🍾</p>
            <p className="mt-3 font-display text-base text-cream-100">Kelder is leeg</p>
            <p className="mt-1 text-sm text-cream-300/60">Voeg je eerste fles toe om te beginnen.</p>
          </Card>
        ) : (
          <Card className="py-6 text-center">
            <p className="text-sm text-cream-300/60">Geen resultaten voor &ldquo;{query}&rdquo;</p>
          </Card>
        )}
      </div>
    </>
  );
}
