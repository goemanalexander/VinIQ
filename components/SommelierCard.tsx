'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

const OCCASIONS = ['Weeknight', 'Friends', 'Celebration', 'BBQ', 'Date Night'] as const;
type Occasion = (typeof OCCASIONS)[number];

const PLACEHOLDER = `Steak with pepper sauce
Homemade lasagna
BBQ with friends
Cheese platter`;

export default function SommelierCard() {
  const router = useRouter();
  const [food, setFood] = useState('');
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [budget, setBudget] = useState('');

  function handleAsk() {
    const params = new URLSearchParams();
    if (food.trim()) params.set('food', food.trim());
    if (occasion) params.set('occasion', occasion);
    if (budget.trim()) params.set('budget', budget.trim());
    const qs = params.toString();
    router.push(`/sommelier${qs ? `?${qs}` : ''}`);
  }

  return (
    <div className="rounded-2xl border border-gold-500/25 bg-gradient-to-b from-navy-800 to-navy-900 p-5 shadow-card">

      {/* Title */}
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/10 text-lg">
          🍷
        </span>
        <div>
          <p className="font-display text-base font-semibold leading-tight text-cream-100">
            Personal Sommelier
          </p>
          <p className="text-sm text-cream-300/55">What are you having tonight?</p>
        </div>
      </div>

      {/* Food textarea */}
      <textarea
        value={food}
        onChange={(e) => setFood(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={3}
        className="w-full resize-none rounded-xl border border-gold-500/15 bg-navy-950/60 px-4 py-3 text-sm leading-relaxed text-cream-100 placeholder:text-cream-300/25 focus:border-gold-500/35 focus:outline-none"
      />

      {/* Occasion chips */}
      <div className="mt-3.5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-cream-300/35">
          Occasion — optional
        </p>
        <div className="flex flex-wrap gap-1.5">
          {OCCASIONS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOccasion(occasion === o ? null : o)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                occasion === o
                  ? 'border-gold-500/50 bg-gold-500/12 text-gold-300'
                  : 'border-navy-600/80 text-cream-300/45 hover:border-gold-500/25 hover:text-cream-300/65'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="mt-3.5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-cream-300/35">
          Budget — optional
        </p>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-cream-300/35">
            €
          </span>
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 25"
            className="w-full rounded-xl border border-gold-500/15 bg-navy-950/60 py-2.5 pl-8 pr-4 text-sm text-cream-100 placeholder:text-cream-300/25 focus:border-gold-500/35 focus:outline-none"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="mt-4 h-px bg-gold-500/10" />

      {/* CTA */}
      <button
        onClick={handleAsk}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 py-3.5 text-sm font-semibold text-navy-950 transition-colors active:bg-gold-400"
      >
        <Sparkles size={15} />
        Ask my Sommelier
      </button>
    </div>
  );
}
