'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { getCellar, getFeedback, getAiProfile, saveAiProfile } from '@/lib/storage';
import { generateAiProfile } from '@/lib/profile-ai';
import type { AiTasteProfile } from '@/lib/types';

const AXIS = [
  { key: 'avgBody' as const,      label: 'Body',      low: 'Light',  high: 'Full' },
  { key: 'avgAcidity' as const,   label: 'Acidity',   low: 'Soft',   high: 'Crisp' },
  { key: 'avgTannin' as const,    label: 'Tannin',    low: 'Smooth', high: 'Firm' },
  { key: 'avgSweetness' as const, label: 'Sweetness', low: 'Dry',    high: 'Sweet' },
];

function StructureBar({ label, value, low, high }: { label: string; value: number; low: string; high: string }) {
  const pct = ((value - 1) / 9) * 100;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-cream-300/50">{low}</span>
        <span className="font-medium text-cream-200">{label}</span>
        <span className="text-cream-300/50">{high}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-navy-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-700 to-gold-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<AiTasteProfile | null>(null);
  const [rebuilding, setRebuilding] = useState(false);

  function rebuild() {
    setRebuilding(true);
    const cellar = getCellar();
    const feedback = getFeedback();
    const generated = generateAiProfile(cellar, feedback);
    saveAiProfile(generated);
    setProfile(generated);
    setTimeout(() => setRebuilding(false), 600);
  }

  useEffect(() => {
    const cached = getAiProfile();
    if (cached) {
      setProfile(cached);
    } else {
      rebuild();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile) return null;

  const lastUpdated = new Date(profile.lastUpdated).toLocaleDateString('en-BE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <>
      <PageHeader title="Taste Profile" />
      <div className="px-5 pb-8 pt-4">

        {/* AI Insights */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base text-cream-200">AI Insights</h2>
            <button
              onClick={rebuild}
              disabled={rebuilding}
              className="flex items-center gap-1.5 rounded-full border border-gold-500/30 px-3 py-1.5 text-xs text-gold-400 transition-colors active:bg-gold-500/10"
            >
              <RefreshCw size={12} className={rebuilding ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          <Card edge className="space-y-3">
            {profile.insights.map((insight, i) => (
              <p key={i} className="text-sm leading-relaxed text-cream-300/85 border-b border-gold-500/10 last:border-0 pb-3 last:pb-0">
                {insight}
              </p>
            ))}
          </Card>
          <p className="mt-2 text-right text-[11px] text-cream-300/35">
            Based on {profile.basedOnBottles} bottle{profile.basedOnBottles !== 1 ? 's' : ''} · Updated {lastUpdated}
          </p>
        </section>

        {/* Structure Profile */}
        <section className="mb-8">
          <h2 className="mb-4 font-display text-base text-cream-200">Structure Profile</h2>
          <Card className="space-y-5">
            {AXIS.map((a) => (
              <StructureBar key={a.key} label={a.label} value={profile[a.key]} low={a.low} high={a.high} />
            ))}
          </Card>
          <p className="mt-2 text-xs text-cream-300/40 text-center">
            Automatically derived from your cellar — no manual tuning needed
          </p>
        </section>

        {/* Favourite Regions */}
        {profile.topRegions.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-display text-base text-cream-200">Favourite Regions</h2>
            <div className="flex flex-wrap gap-2">
              {profile.topRegions.map((r) => (
                <span key={r} className="rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-xs font-medium text-gold-300">
                  {r}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Favourite Styles */}
        {profile.topStyles.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-display text-base text-cream-200">Favourite Styles</h2>
            <div className="flex flex-wrap gap-2">
              {profile.topStyles.map((s) => (
                <span key={s} className="rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-xs font-medium text-gold-300">
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* About */}
        <Card edge className="space-y-2 text-sm text-cream-300/60 mt-4">
          <p className="font-display text-sm text-cream-200">How this works</p>
          <p>
            VinIQ builds your taste profile automatically from your cellar contents, personal
            ratings, and feedback on recommendations. The more you use it, the more accurate it
            becomes.
          </p>
          <p className="text-xs">VinIQ · All data stored locally on this device.</p>
        </Card>
      </div>
    </>
  );
}
