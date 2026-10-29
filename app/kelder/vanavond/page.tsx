'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import { getAllWinesWithCount } from '@/lib/storage';
import { recommendTonight, type RecommendationMood } from '@/lib/tonight-recommendations';
import type { WineWithCount } from '@/lib/types';
import { getDrinkWindow } from '@/lib/utils';

export default function TonightPage() {
  const [wines, setWines] = useState<WineWithCount[]>([]);
  const [mood, setMood] = useState<RecommendationMood>('vol');
  useEffect(() => { getAllWinesWithCount().then(setWines); }, []);
  const choices = recommendTonight(wines, mood).slice(0, 5);
  return <>
    <PageHeader title="Wat drinken we vanavond?" subtitle="Suggesties uit je eigen kelder" back backHref="/" />
    <div className="space-y-4 px-5 py-4">
      <Card>
        <label htmlFor="mood" className="mb-2 block text-sm text-cream-100">Waar heb je zin in?</label>
        <select id="mood" value={mood} onChange={e => setMood(e.target.value as RecommendationMood)} className="w-full rounded-lg bg-navy-800 p-3 text-sm text-cream-100">
          <option value="vol">Vol en rijp rood</option>
          <option value="zacht">Zacht en rond</option>
          <option value="fris">Wit, rosé of bubbels</option>
          <option value="alles">Verras me</option>
        </select>
      </Card>
      {choices.length ? choices.map((w, i) => <Link key={w.id} href={`/kelder/wijn/${w.id}`} className="block">
        <Card>
          <p className="text-xs text-gold-300">Suggestie {i + 1}</p>
          <p className="mt-1 font-display text-lg text-cream-100">{w.producer} — {w.wineName}</p>
          <p className="text-xs text-cream-300/60">{w.vintage ?? 'N.V.'} · {w.bottleCount} fles(sen) · {w.region}</p>
          <p className="mt-2 text-xs text-cream-300/70">{getDrinkWindow(w).from ? `Drinkvenster: ${getDrinkWindow(w).from}–${getDrinkWindow(w).to ?? '?'}` : 'Geen bevestigd drinkvenster'}{w.personalRating ? ` · Jouw score: ${w.personalRating}/10` : ''}</p>
        </Card>
      </Link>) : <Card><p className="text-sm text-cream-300/70">Er zijn geen flessen in je kelder om voor te stellen.</p></Card>}
      <p className="text-xs text-cream-300/40">Dit zijn suggesties op basis van je eigen voorraad, drinkvensters en voorkeuren, geen garantie op smaak.</p>
    </div>
  </>;
}
