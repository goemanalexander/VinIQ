'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wine, Sparkles, AlertCircle, AlertTriangle, Clock, Camera, Archive } from 'lucide-react';
import Card from '@/components/Card';
import Logo from '@/components/Logo';
import { getCellar } from '@/lib/storage';
import { getActionItems, getCellarSummary } from '@/lib/sommelier';
import type { ActionItem } from '@/lib/types';

const ACTION_CARDS = [
  {
    href: '/scan/wine-list',
    icon: Camera,
    title: 'Scan Wine List',
    description: "Find what to order — Alexander's Choice, Best Value & more",
  },
  {
    href: '/scan/promotion',
    icon: Camera,
    title: 'Scan Promotion',
    description: 'Is this discount actually worth it?',
  },
  {
    href: '/scan/bottle',
    icon: Camera,
    title: 'Scan Bottle',
    description: 'Get the full Koopjeschecker on any bottle',
  },
  {
    href: '/cellar',
    icon: Archive,
    title: 'Choose From My Cellar',
    description: 'See what to drink tonight',
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
    <div className="px-5 pt-8">
      {/* Header */}
      <header className="mb-10 text-center">
        <div className="mb-3 flex items-center justify-center gap-3 text-gold-400">
          <span className="h-px w-8 bg-gold-500/40" />
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold-300/80">
            Private Sommelier
          </span>
          <span className="h-px w-8 bg-gold-500/40" />
        </div>
        <div className="mb-3 flex justify-center">
          <Logo size={64} />
        </div>
        <h1 className="font-display text-5xl font-semibold text-cream-100">VinIQ</h1>
        <p className="mt-2 text-sm text-cream-300/70">Your personal wine advisor.</p>
      </header>

      {/* What do you want to do? */}
      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg text-cream-200">What do you want to do?</h2>
        <div className="grid grid-cols-2 gap-3">
          {ACTION_CARDS.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="flex h-full flex-col gap-2 p-4 transition-transform active:scale-[0.98]">
                <action.icon size={22} strokeWidth={1.6} className="text-gold-400" />
                <span className="font-display text-base leading-snug text-cream-100">
                  {action.title}
                </span>
                <span className="text-xs leading-snug text-cream-300/60">
                  {action.description}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Action Required */}
      {actionItems.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-gold-400" />
            <h2 className="font-display text-lg text-cream-200">Action Required</h2>
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
                    <AlertTriangle size={17} />
                  ) : item.type === 'peak' ? (
                    <Clock size={17} />
                  ) : (
                    <Wine size={17} />
                  )}
                </span>
                <span className="text-sm text-cream-200">{item.message}</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {/* Cellar Summary */}
      {summary && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Wine size={18} className="text-gold-400" />
            <h2 className="font-display text-lg text-cream-200">Cellar Summary</h2>
          </div>
          <Card className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="font-display text-2xl text-cream-100">{summary.bottles}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-cream-300/60">
                Bottles
              </p>
            </div>
            <div>
              <p className="font-display text-2xl text-gold-300">
                {summary.averageRating.toFixed(1)}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-cream-300/60">
                Avg. Rating
              </p>
            </div>
            <div>
              <p className="font-display text-2xl text-gold-300">{summary.readyToDrink}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-cream-300/60">
                Ready Now
              </p>
            </div>
          </Card>
        </section>
      )}

      {/* Tip */}
      <Card edge className="mb-6 flex gap-3">
        <Sparkles size={20} className="mt-0.5 flex-shrink-0 text-gold-400" />
        <p className="text-sm leading-relaxed text-cream-300/80">
          Tip: scan a restaurant wine list before you order — VinIQ will tell you which bottle
          Alexander would pick, and why.
        </p>
      </Card>

      {/* Footer */}
      <p className="mb-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-cream-300/40">
        <Clock size={12} />
        Everything is stored privately on this device.
      </p>
    </div>
  );
}
