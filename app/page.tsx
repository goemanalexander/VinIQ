'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wine, AlertCircle, AlertTriangle, Clock, Camera, Archive } from 'lucide-react';
import Card from '@/components/Card';
import Logo from '@/components/Logo';
import SommelierCard from '@/components/SommelierCard';
import { getCellar } from '@/lib/storage';
import { getActionItems, getCellarSummary } from '@/lib/sommelier';
import type { ActionItem } from '@/lib/types';

const QUICK_ACTIONS = [
  {
    href: '/scan/wine-list',
    icon: Camera,
    title: 'Scan Wine List',
    description: "Alexander's Choice & Best Value",
  },
  {
    href: '/scan/promotion',
    icon: Camera,
    title: 'Scan Promotion',
    description: 'Is this discount worth it?',
  },
  {
    href: '/scan/bottle',
    icon: Camera,
    title: 'Scan Bottle',
    description: 'Full Koopjeschecker',
  },
  {
    href: '/cellar',
    icon: Archive,
    title: 'My Cellar',
    description: 'What to drink tonight',
  },
];

interface CellarSummaryData {
  bottles: number;
  uniqueWines: number;
  averageRating: number;
  readyToDrink: number;
}

export default function HomePage() {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<CellarSummaryData | null>(null);

  useEffect(() => {
    const cellar = getCellar();
    setActionItems(getActionItems(cellar));
    setSummary(getCellarSummary(cellar));
  }, []);

  return (
    <div className="px-5 pt-6 pb-8">

      {/* Slim header */}
      <header className="mb-6 flex items-center gap-3">
        <Logo size={36} />
        <div>
          <h1 className="font-display text-2xl font-semibold leading-none text-cream-100">VinIQ</h1>
          <p className="text-[11px] text-cream-300/50">Private Wine Advisor</p>
        </div>
      </header>

      {/* Personal Sommelier card — hero */}
      <section className="mb-6">
        <SommelierCard />
      </section>

      {/* Action Required */}
      {actionItems.length > 0 && (
        <section className="mb-6">
          <div className="mb-2.5 flex items-center gap-2">
            <AlertCircle size={15} className="text-gold-400" />
            <h2 className="font-display text-sm font-medium uppercase tracking-wide text-gold-400/80">
              Action Required
            </h2>
          </div>
          <Card edge className="divide-y divide-gold-500/10 p-0">
            {actionItems.map((item, idx) => (
              <Link
                key={idx}
                href={item.wineId ? `/cellar/${item.wineId}` : '/cellar'}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-cream-100/[0.03]"
              >
                <span className="text-gold-400">
                  {item.type === 'past_peak' ? (
                    <AlertTriangle size={15} />
                  ) : item.type === 'peak' ? (
                    <Clock size={15} />
                  ) : (
                    <Wine size={15} />
                  )}
                </span>
                <span className="text-sm text-cream-200">{item.message}</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {/* Cellar Summary */}
      {summary && summary.bottles > 0 && (
        <section className="mb-6">
          <div className="mb-2.5 flex items-center gap-2">
            <Wine size={15} className="text-gold-400" />
            <h2 className="font-display text-sm font-medium uppercase tracking-wide text-gold-400/80">
              Cellar
            </h2>
          </div>
          <Card className="grid grid-cols-3 gap-2 text-center py-3">
            <div>
              <p className="font-display text-xl text-cream-100">{summary.bottles}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-cream-300/50">Bottles</p>
            </div>
            <div>
              <p className="font-display text-xl text-gold-300">
                {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '—'}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-cream-300/50">Avg. Rating</p>
            </div>
            <div>
              <p className="font-display text-xl text-gold-300">{summary.readyToDrink}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-cream-300/50">Ready Now</p>
            </div>
          </Card>
        </section>
      )}

      {/* Quick actions — secondary */}
      <section className="mb-6">
        <div className="mb-2.5">
          <h2 className="font-display text-sm font-medium uppercase tracking-wide text-cream-300/40">
            Scanners
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="flex h-full flex-col gap-1.5 p-3.5 transition-transform active:scale-[0.98]">
                <action.icon size={18} strokeWidth={1.6} className="text-gold-400/70" />
                <span className="font-display text-sm leading-snug text-cream-100">
                  {action.title}
                </span>
                <span className="text-[11px] leading-snug text-cream-300/50">
                  {action.description}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-cream-300/30">
        <Clock size={11} />
        Everything is stored privately on this device.
      </p>
    </div>
  );
}
