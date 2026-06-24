'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Check, ChevronDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import MatchStars from '@/components/MatchStars';
import { BadgeRow } from '@/components/BadgeChip';
import KoopjesChecker from '@/components/KoopjesChecker';
import ScanDebugBlock from '@/components/ScanDebugBlock';
import FeedbackBar from '@/components/FeedbackBar';
import { getBottleResult, getCellar, addCellarWine } from '@/lib/storage';
import type { Koopjeschecker } from '@/lib/types';
import { genId, formatCurrency } from '@/lib/utils';

const ACTION_CONFIG = {
  BUY: { emoji: '🔥', label: 'Buy This', bg: 'from-burgundy-800 to-burgundy-700', text: 'text-cream-100', border: 'border-burgundy-500/40' },
  CONSIDER: { emoji: '⚠️', label: 'Consider', bg: 'from-navy-800 to-navy-700', text: 'text-gold-300', border: 'border-gold-500/30' },
  SKIP: { emoji: '❌', label: 'Skip', bg: 'from-navy-900 to-navy-900', text: 'text-cream-300/70', border: 'border-navy-600' },
};

function QuickFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gold-500/10 last:border-0">
      <span className="text-xs text-cream-300/50 shrink-0">{label}</span>
      <span className="text-xs text-cream-100 text-right">{value}</span>
    </div>
  );
}

export default function ScanBottleResultPage() {
  const router = useRouter();
  const [kc, setKc] = useState<Koopjeschecker | null>(null);
  const [added, setAdded] = useState(false);
  const [kcOpen, setKcOpen] = useState(false);

  useEffect(() => {
    const result = getBottleResult();
    if (!result) { router.replace('/scan/bottle'); return; }
    setKc(result);
    const cellar = getCellar();
    const exists = cellar.some(
      (w) => w.koopjeschecker.general.producer === result.general.producer &&
        w.koopjeschecker.general.vintage === result.general.vintage
    );
    if (exists) setAdded(true);
  }, [router]);

  function handleAdd() {
    if (!kc || added) return;
    addCellarWine({
      id: genId('cellar'), producer: kc.general.producer, wineName: kc.general.wineName,
      vintage: kc.general.vintage, quantity: 1, purchasePrice: kc.general.price ?? 0,
      personalRating: 0, notes: '', koopjeschecker: kc, addedAt: new Date().toISOString(),
    });
    setAdded(true);
  }

  if (!kc) return null;
  const cfg = ACTION_CONFIG[kc.recommendedAction];
  const dw = kc.drinkingWindow;

  return (
    <>
      <PageHeader backHref="/scan/bottle" title="Koopjeschecker" />
      <div className="pb-8 pt-4">
        {/* Verdict */}
        <div className="mx-5 mb-5">
          <div className={`flex items-center justify-between rounded-2xl border px-5 py-4 bg-gradient-to-r ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cfg.emoji}</span>
              <span className={`font-display text-2xl font-semibold ${cfg.text}`}>{cfg.label}</span>
            </div>
            <MatchStars percent={kc.personalScore.matchPercent} size="md" />
          </div>
        </div>

        {/* Low confidence warning */}
        {kc.scanMetadata?.confidence === 'low' && (
          <div className="mx-5 mb-5 flex items-start gap-2 rounded-xl border border-burgundy-600/40 bg-burgundy-900/20 px-4 py-3 text-sm text-burgundy-300">
            <span className="mt-0.5">⚠️</span>
            <p>Low confidence read — the label was hard to read clearly. Details below may be incomplete or approximate.</p>
          </div>
        )}

        {/* Debug block */}
        {kc.scanMetadata && (
          <div className="mx-5">
            <ScanDebugBlock meta={kc.scanMetadata} />
          </div>
        )}

        {/* Wine identity */}
        <div className="mx-5 mb-5">
          <Card>
            <p className="font-display text-lg text-cream-100">{kc.general.producer}</p>
            <p className="text-base text-gold-300">{kc.general.wineName}</p>
            <p className="mt-0.5 text-sm text-cream-300/60">{kc.general.vintage} · {kc.general.region}</p>
            {kc.general.price != null && (
              <p className="mt-2 font-display text-xl text-gold-300">{formatCurrency(kc.general.price)}</p>
            )}
            <BadgeRow badges={kc.personalScore.badges} className="mt-3" />
          </Card>
        </div>

        {/* Why? */}
        <div className="mx-5 mb-5">
          <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-gold-400/80">Why?</h3>
          <Card edge>
            <p className="text-sm leading-relaxed text-cream-300/80">{kc.personalScore.reasoning}</p>
          </Card>
        </div>

        {/* Quick Facts */}
        <div className="mx-5 mb-5">
          <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-gold-400/80">Quick Facts</h3>
          <Card>
            <QuickFact label="Grapes" value={kc.general.grapes.join(', ')} />
            <QuickFact label="Alcohol" value={`${kc.general.alcohol}%`} />
            <QuickFact label="Drink window" value={`${dw.from}–${dw.to}`} />
            <QuickFact label="Peak" value={`${dw.peakFrom}–${dw.peakTo}`} />
            <QuickFact label="Decanting" value={kc.decanting.shouldDecant ? `${kc.decanting.decantMinutes} min · ${kc.decanting.servingTempC[0]}–${kc.decanting.servingTempC[1]}°C` : `No · ${kc.decanting.servingTempC[0]}–${kc.decanting.servingTempC[1]}°C`} />
            <QuickFact label="Food" value={kc.foodPairing.dishes.slice(0, 3).join(', ')} />
          </Card>
        </div>

        {/* Full KC collapsible */}
        <div className="mx-5 mb-5">
          <button onClick={() => setKcOpen((o) => !o)} className="mb-3 flex w-full items-center justify-between">
            <h3 className="font-display text-sm uppercase tracking-wide text-gold-400/80">Full Koopjeschecker</h3>
            <ChevronDown size={16} className={`text-gold-400/60 transition-transform ${kcOpen ? 'rotate-180' : ''}`} />
          </button>
          {kcOpen && <KoopjesChecker data={kc} />}
        </div>

        {/* Feedback */}
        <div className="mx-5 mb-5">
          <FeedbackBar kcId={kc.id} producer={kc.general.producer} wineName={kc.general.wineName} context="bottle" />
        </div>

        {/* Add to cellar */}
        <div className="mx-5">
          <button onClick={handleAdd} disabled={added}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-colors ${added ? 'bg-navy-700 text-cream-300/40' : 'bg-gold-500 text-navy-950 active:bg-gold-400'}`}
          >
            {added ? <><Check size={16} /> Added to Cellar</> : <><Plus size={16} /> Add to My Cellar</>}
          </button>
        </div>
      </div>
    </>
  );
}
