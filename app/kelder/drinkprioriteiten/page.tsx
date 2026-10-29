'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { getAllWinesWithCount } from '@/lib/storage';
import { rankDrinkingPriorities, type DrinkingPriority } from '@/lib/drinking-priorities';

const labels = {
  urgent: 'Eerst drinken',
  now: 'Nu drinkbaar',
  later: 'Nog bewaren',
  unknown: 'Onbekend',
} as const;

export default function DrinkprioriteitenPage() {
  const [items, setItems] = useState<DrinkingPriority[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getAllWinesWithCount().then(w => setItems(rankDrinkingPriorities(w))).finally(() => setLoading(false));
  }, []);
  return (
    <>
      <PageHeader title="Drinkprioriteiten" back backHref="/kelder" />
      <div className="px-5 pt-5 pb-8">
        <p className="mb-5 text-sm text-cream-300/70">Welke flessen verdienen eerst aandacht? Op basis van je actuele voorraad en drinkvensters. Dit zijn indicaties, geen garanties.</p>
        {loading && <p className="text-sm text-cream-300/60">Je kelder wordt bekeken…</p>}
        {!loading && items.length === 0 && <Card><p className="text-sm text-cream-200">Geen flessen in voorraad.</p></Card>}
        {(['urgent','now','later','unknown'] as const).map(group => {
          const matches = items.filter(item => item.urgency === group);
          if (!matches.length) return null;
          return <section key={group} className="mb-6">
            <h2 className="mb-3 font-display text-base text-gold-300">{labels[group]} ({matches.length})</h2>
            <Card className="divide-y divide-gold-500/10 p-1">
              {matches.map(item => <Link href={`/kelder/wijn/${item.wine.id}`} key={item.wine.id} className="block px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cream-100">{item.wine.producer} — {item.wine.wineName}</p>
                    <p className="mt-1 text-xs text-cream-300/60">{item.wine.vintage ?? 'N.V.'} · {item.reason}</p>
                    {item.estimated && <p className="mt-1 text-[11px] text-cream-300/40">Drinkvenster is geschat</p>}
                  </div>
                  <span className="shrink-0 text-sm text-gold-300">×{item.wine.bottleCount}</span>
                </div>
              </Link>)}
            </Card>
          </section>;
        })}
      </div>
    </>
  );
}
