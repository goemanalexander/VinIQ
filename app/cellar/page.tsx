'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileUp } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import MatchStars from '@/components/MatchStars';
import { getCellar } from '@/lib/storage';
import type { CellarWine } from '@/lib/types';
import { deriveWindowStatus, WINDOW_STATUS_LABEL, formatCurrency, estimateCellarValue } from '@/lib/utils';

const STATUS_DOT: Record<string, string> = {
  too_young: 'bg-navy-500',
  ready: 'bg-green-500',
  peak: 'bg-gold-400',
  past_peak: 'bg-burgundy-500',
};

function CellarRow({ wine }: { wine: CellarWine }) {
  const kc = wine.koopjeschecker;
  const status = deriveWindowStatus(kc.drinkingWindow);
  const estimatedValue = estimateCellarValue(wine.purchasePrice, status, wine.personalRating);

  return (
    <Link
      href={`/cellar/${wine.id}`}
      className="flex items-start gap-3 rounded-xl px-3 py-3.5 transition-colors hover:bg-cream-100/[0.04]"
    >
      <MatchStars percent={kc.personalScore.matchPercent} size="sm" showLabel={false} className="pt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-cream-100">
          {wine.producer} — {wine.wineName}
        </p>
        <p className="text-xs text-cream-300/60">{wine.vintage} · {kc.general.region}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-cream-300/50">
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
            {WINDOW_STATUS_LABEL[status]}
          </span>
          {kc.decanting.shouldDecant && (
            <span>⏳ Decant {kc.decanting.decantMinutes}m</span>
          )}
          {wine.personalRating > 0 && (
            <span>★ {wine.personalRating.toFixed(1)}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-right shrink-0">
        <span className="font-display text-sm text-cream-100">×{wine.quantity}</span>
        {wine.purchasePrice > 0 && (
          <span className="text-[11px] text-cream-300/40">{formatCurrency(wine.purchasePrice)}/btl</span>
        )}
        {estimatedValue > 0 && estimatedValue !== wine.purchasePrice && (
          <span className="text-[11px] text-gold-400/70">≈ {formatCurrency(estimatedValue)}</span>
        )}
      </div>
    </Link>
  );
}

export default function CellarPage() {
  const [cellar, setCellar] = useState<CellarWine[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setCellar(getCellar());
  }, []);

  const filtered = query.trim()
    ? cellar.filter(
        (w) =>
          w.producer.toLowerCase().includes(query.toLowerCase()) ||
          w.wineName.toLowerCase().includes(query.toLowerCase()) ||
          w.koopjeschecker.general.region.toLowerCase().includes(query.toLowerCase()) ||
          String(w.vintage).includes(query)
      )
    : cellar;

  // Statistics
  const totalBottles = cellar.reduce((s, w) => s + w.quantity, 0);
  const purchaseValue = cellar.reduce((s, w) => s + w.purchasePrice * w.quantity, 0);
  const estimatedTotal = cellar.reduce((s, w) => {
    const status = deriveWindowStatus(w.koopjeschecker.drinkingWindow);
    return s + estimateCellarValue(w.purchasePrice, status, w.personalRating) * w.quantity;
  }, 0);
  const ratedWines = cellar.filter((w) => w.personalRating > 0);
  const avgRating =
    ratedWines.length > 0
      ? ratedWines.reduce((s, w) => s + w.personalRating, 0) / ratedWines.length
      : 0;

  return (
    <>
      <PageHeader
        title="My Cellar"
        subtitle={`${totalBottles} bottle${totalBottles !== 1 ? 's' : ''}`}
      />
      <div className="px-5 pb-8 pt-4">

        {/* Statistics */}
        {cellar.length > 0 && (
          <Card strong className="mb-5 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] uppercase tracking-wide text-cream-300/50">Total Bottles</span>
              <span className="font-display text-2xl text-cream-100">{totalBottles}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] uppercase tracking-wide text-cream-300/50">Avg. Rating</span>
              <span className="font-display text-2xl text-cream-100">
                {avgRating > 0 ? `${avgRating.toFixed(1)}` : '—'}
              </span>
            </div>
            {purchaseValue > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-wide text-cream-300/50">Purchase Value</span>
                <span className="font-display text-lg text-cream-100">{formatCurrency(purchaseValue)}</span>
              </div>
            )}
            {estimatedTotal > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-wide text-cream-300/50">Est. Value</span>
                <span className="font-display text-lg text-gold-300">{formatCurrency(estimatedTotal)}</span>
              </div>
            )}
          </Card>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-300/40" />
          <input
            type="text"
            placeholder="Search producer, region, vintage…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gold-500/20 bg-navy-800/60 py-2.5 pl-9 pr-4 text-sm text-cream-100 placeholder-cream-300/30 outline-none focus:border-gold-500/50"
          />
        </div>

        {/* Add button */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Link
            href="/cellar/import"
            className="flex items-center justify-center gap-2 rounded-full bg-gold-500 py-2.5 text-sm font-medium text-navy-950 transition-colors active:bg-gold-400"
          >
            <FileUp size={15} />
            Import CSV/Excel
          </Link>
          <Link
            href="/cellar/add"
            className="flex items-center justify-center gap-2 rounded-full border border-gold-500/30 py-2.5 text-sm font-medium text-gold-400 transition-colors active:bg-gold-500/10"
          >
            <Plus size={15} />
            Add Manually
          </Link>
        </div>

        {/* Wine list */}
        {filtered.length > 0 ? (
          <Card className="divide-y divide-gold-500/10 p-1">
            {filtered.map((wine) => (
              <CellarRow key={wine.id} wine={wine} />
            ))}
          </Card>
        ) : cellar.length === 0 ? (
          <Card className="py-10 text-center">
            <p className="font-display text-3xl">🍾</p>
            <p className="mt-3 font-display text-base text-cream-100">Empty cellar</p>
            <p className="mt-1 text-sm text-cream-300/60">Scan a bottle or add one manually to get started.</p>
          </Card>
        ) : (
          <Card className="py-6 text-center">
            <p className="text-sm text-cream-300/60">No results for "{query}"</p>
          </Card>
        )}
      </div>
    </>
  );
}
